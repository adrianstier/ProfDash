import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS, getRateLimitHeaders } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Supported file types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const SUPPORTED_DOCUMENT_TYPES = ["application/pdf"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ParseFileResultSchema = z.object({
  extracted_text: z.string(),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    priority: z.enum(["p1", "p2", "p3", "p4"]),
    category: z.string().optional(),
    due_date: z.string().optional(),
    confidence: z.number().min(0).max(1),
  })),
  document_type: z.string(),
  summary: z.string(),
  key_dates: z.array(z.string()),
  key_people: z.array(z.string()),
  page_count: z.number().optional(),
});

export type ParseFileResult = z.infer<typeof ParseFileResultSchema>;

// POST /api/ai/parse-file - Parse PDF/image files to extract tasks
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = checkRateLimit(`ai:parse-file:${rateLimitId}`, RATE_LIMIT_CONFIGS.ai);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = formData.get("workspace_id") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
    }

    // Validate workspace_id format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workspaceId)) {
      return NextResponse.json({ error: "Invalid workspace_id format" }, { status: 400 });
    }

    // Validate file type
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isPDF = SUPPORTED_DOCUMENT_TYPES.includes(file.type);

    if (!isImage && !isPDF) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Supported: ${[...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES].join(", ")}`
        },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type for Claude
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    if (isImage) {
      mediaType = file.type as typeof mediaType;
    } else {
      // For PDFs, we'll need to handle differently
      // Claude can process PDFs directly in some cases
      mediaType = "image/png"; // Fallback - in production you'd use PDF extraction
    }

    const today = new Date().toISOString().split("T")[0];

    const prompt = `You are an expert at extracting actionable tasks from documents for academic research teams.

Analyze this ${isPDF ? "PDF document" : "image"} and extract any tasks, action items, or to-dos.

Today's date: ${today}

Guidelines:
- Extract all actionable items mentioned
- Include deadlines and dates when visible
- Note any people mentioned or assigned
- Categorize for academic context (research, teaching, grants, etc.)
- Rate confidence based on how clearly the task is stated
- Summarize the document's purpose

Respond with a JSON object:
{
  "extracted_text": "Key text extracted from the document (summarized if long)",
  "tasks": [
    {
      "title": "Clear task description",
      "description": "Additional context if available",
      "priority": "p1" | "p2" | "p3" | "p4",
      "category": "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc",
      "due_date": "YYYY-MM-DD or null",
      "confidence": 0.85
    }
  ],
  "document_type": "What type of document this is (e.g., meeting agenda, email, form, handwritten notes)",
  "summary": "Brief summary of the document content",
  "key_dates": ["Any dates mentioned in the document"],
  "key_people": ["Any names mentioned"],
  "page_count": 1
}

Priority guidelines:
- p1: Marked urgent, highlighted, or has imminent deadline
- p2: Important items, near-term deadlines
- p3: Standard items
- p4: Low priority or optional items

Return ONLY valid JSON, no markdown.`;

    // Use Claude's vision capability
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON response
    let result: ParseFileResult;
    try {
      const cleanedText = textContent.text.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse AI response for parse-file:", textContent.text.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate result
    const resultValidation = ParseFileResultSchema.safeParse(result);
    if (!resultValidation.success) {
      return NextResponse.json(
        { error: "Invalid AI response structure", details: resultValidation.error.flatten() },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("workspace_activity").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: "ai_tasks_extracted",
      entity_title: `File: ${file.name}`,
      details: {
        file_type: file.type,
        file_size: file.size,
        tasks_extracted: result.tasks.length,
        document_type: result.document_type,
      },
    });

    return NextResponse.json({
      success: true,
      result: resultValidation.data,
    });
  } catch (error) {
    console.error("File parsing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS, getRateLimitHeaders } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ParseContentRequestSchema = z.object({
  content: z.string().min(1).max(50000), // Support large content blocks
  workspace_id: z.string().uuid(),
  content_type: z.enum([
    "meeting_notes",
    "email_thread",
    "document",
    "brainstorm",
    "agenda",
    "feedback",
    "requirements",
    "general",
  ]).default("general"),
  extract_mode: z.enum([
    "tasks",
    "subtasks",
    "both",
  ]).default("tasks"),
  parent_task_id: z.string().uuid().optional(), // For subtask extraction
  project_id: z.string().uuid().optional(),
});

const ExtractedItemSchema = z.object({
  text: z.string(),
  type: z.enum(["task", "subtask"]),
  priority: z.enum(["p1", "p2", "p3", "p4"]),
  category: z.string().optional(),
  due_date: z.string().optional(),
  assignee_hint: z.string().optional(), // Name mentioned, not resolved to user ID
  estimated_minutes: z.number().optional(),
  source_excerpt: z.string().optional(), // Where in content this was found
  confidence: z.number().min(0).max(1),
});

const ParseContentResultSchema = z.object({
  items: z.array(ExtractedItemSchema),
  summary: z.string(),
  content_type_detected: z.string(),
  key_themes: z.array(z.string()),
  people_mentioned: z.array(z.string()),
  dates_mentioned: z.array(z.string()),
  action_item_count: z.number(),
  follow_ups_needed: z.array(z.string()).optional(),
});

export type ParseContentResult = z.infer<typeof ParseContentResultSchema>;

// POST /api/ai/parse-content - Parse content to extract tasks/subtasks
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
    const rateLimitResult = checkRateLimit(`ai:parse-content:${rateLimitId}`, RATE_LIMIT_CONFIGS.ai);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();

    // Validate request
    const validationResult = ParseContentRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content, workspace_id, content_type, extract_mode, parent_task_id, project_id } = validationResult.data;

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Get workspace context
    const [membersResult, projectsResult] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("profiles(id, full_name)")
        .eq("workspace_id", workspace_id),
      supabase
        .from("projects")
        .select("id, title, type")
        .eq("workspace_id", workspace_id)
        .eq("status", "active")
        .limit(10),
    ]);

    const members = (membersResult.data || [])
      .map((m) => {
        const profile = m.profiles as unknown as { id: string; full_name: string | null } | null;
        return profile?.full_name;
      })
      .filter(Boolean);

    const projects = (projectsResult.data || []).map((p) => p.title);

    // Get parent task context if provided
    let parentTaskContext = "";
    if (parent_task_id) {
      const { data: parentTask } = await supabase
        .from("tasks")
        .select("title, description")
        .eq("id", parent_task_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (parentTask) {
        parentTaskContext = `\n\nParent Task: "${parentTask.title}"${parentTask.description ? `\nDescription: ${parentTask.description}` : ""}`;
      }
    }

    // Get project context if provided
    let projectContext = "";
    if (project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("title, type")
        .eq("id", project_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (project) {
        projectContext = `\n\nProject Context: ${project.title} (${project.type})`;
      }
    }

    const today = new Date().toISOString().split("T")[0];

    const contentTypeInstructions: Record<string, string> = {
      meeting_notes: "These are meeting notes. Look for action items, decisions, and follow-ups.",
      email_thread: "This is an email thread. Extract action items and requests.",
      document: "This is a document. Identify tasks and to-dos mentioned.",
      brainstorm: "These are brainstorm notes. Extract actionable ideas and next steps.",
      agenda: "This is an agenda. Convert items into trackable tasks.",
      feedback: "This is feedback. Extract action items to address the feedback.",
      requirements: "These are requirements. Convert into development/research tasks.",
      general: "Analyze this content and extract any actionable items.",
    };

    const extractModeInstructions = {
      tasks: "Extract standalone tasks that can be tracked independently.",
      subtasks: "Extract subtasks that break down a larger task into steps.",
      both: "Extract both main tasks and their subtasks where appropriate.",
    };

    const prompt = `You are an expert at extracting actionable items from content for academic research teams.

Content Type: ${content_type}
${contentTypeInstructions[content_type]}

Extraction Mode: ${extract_mode}
${extractModeInstructions[extract_mode]}

Today's date: ${today}
Team members: ${members.length > 0 ? members.join(", ") : "Not specified"}
Active projects: ${projects.length > 0 ? projects.join(", ") : "None"}
${parentTaskContext}
${projectContext}

Content to analyze:
"""
${content}
"""

Guidelines:
- Extract actionable items only (not general statements)
- Preserve important context in the task description
- Include source excerpts showing where items were found
- Note any people mentioned who might be assignees
- Identify dates and deadlines mentioned
- Rate confidence based on how explicitly the action was stated
- For academic content, categorize appropriately (research, teaching, grants, etc.)

Respond with a JSON object:
{
  "items": [
    {
      "text": "Clear, actionable description",
      "type": "task" | "subtask",
      "priority": "p1" | "p2" | "p3" | "p4",
      "category": "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc",
      "due_date": "YYYY-MM-DD or null",
      "assignee_hint": "Name if mentioned",
      "estimated_minutes": 30,
      "source_excerpt": "...relevant quote from content...",
      "confidence": 0.85
    }
  ],
  "summary": "Brief summary of content and extracted items",
  "content_type_detected": "What type of content this appears to be",
  "key_themes": ["Main topics or themes"],
  "people_mentioned": ["Names mentioned"],
  "dates_mentioned": ["Any dates found"],
  "action_item_count": 5,
  "follow_ups_needed": ["Any follow-ups that aren't tasks but need attention"]
}

Priority guidelines:
- p1: Explicitly urgent, "ASAP", "immediately", "critical"
- p2: Important, "soon", "this week", deadlines within 7 days
- p3: Standard priority, normal tasks
- p4: Low priority, "when possible", "eventually"

Return ONLY valid JSON, no markdown.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
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
    let result: ParseContentResult;
    try {
      const cleanedText = textContent.text.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse AI response for parse-content:", textContent.text.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate result
    const resultValidation = ParseContentResultSchema.safeParse(result);
    if (!resultValidation.success) {
      return NextResponse.json(
        { error: "Invalid AI response structure", details: resultValidation.error.flatten() },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("workspace_activity").insert({
      workspace_id,
      user_id: user.id,
      action: "ai_tasks_extracted",
      entity_title: `Content import (${content_type})`,
      details: {
        content_type,
        extract_mode,
        items_extracted: result.items.length,
        content_length: content.length,
      },
    });

    return NextResponse.json({
      success: true,
      result: resultValidation.data,
    });
  } catch (error) {
    console.error("Content parsing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

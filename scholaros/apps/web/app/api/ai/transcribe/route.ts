import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";

// Lazy initialization to avoid build-time errors when env vars aren't available
let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

function getAnthropicClient() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

const TranscribeRequestSchema = z.object({
  workspace_id: z.string().uuid(),
  mode: z.enum(["simple", "extract_tasks", "extract_subtasks"]).default("simple"),
  language: z.string().default("en"),
});

const TranscribedTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["p1", "p2", "p3", "p4"]),
  category: z.string().optional(),
  due_date: z.string().optional(),
});

const _TranscriptionResultSchema = z.object({
  transcription: z.string(),
  tasks: z.array(TranscribedTaskSchema).optional(),
  subtasks: z.array(z.object({
    text: z.string(),
    priority: z.enum(["p1", "p2", "p3", "p4"]),
    estimated_minutes: z.number().optional(),
  })).optional(),
  summary: z.string().optional(),
  duration_seconds: z.number().optional(),
});

export type TranscriptionResult = z.infer<typeof _TranscriptionResultSchema>;

// Supported audio formats
const SUPPORTED_FORMATS = [
  "audio/mp3",
  "audio/mpeg",
  "audio/mpga",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
];

// POST /api/ai/transcribe - Transcribe audio and optionally extract tasks
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

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const workspaceId = formData.get("workspace_id") as string;
    const mode = (formData.get("mode") as string) || "simple";
    const language = (formData.get("language") as string) || "en";

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate request params
    const validationResult = TranscribeRequestSchema.safeParse({
      workspace_id: workspaceId,
      mode,
      language,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Check file type
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${audioFile.type}. Supported: ${SUPPORTED_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    // Check file size (max 25MB for Whisper)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large. Maximum size is 25MB." },
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

    // Step 1: Transcribe with OpenAI Whisper
    let transcription: string;
    try {
      const whisperResponse = await getOpenAIClient().audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: language,
        response_format: "text",
      });
      transcription = whisperResponse;
    } catch (whisperError) {
      console.error("Whisper transcription error:", whisperError);
      return NextResponse.json(
        { error: "Failed to transcribe audio" },
        { status: 500 }
      );
    }

    // If simple mode, just return transcription
    if (mode === "simple") {
      return NextResponse.json({
        success: true,
        result: {
          transcription,
        } as TranscriptionResult,
      });
    }

    // Step 2: Extract tasks or subtasks using Claude
    const today = new Date().toISOString().split("T")[0];

    let extractionPrompt: string;
    if (mode === "extract_tasks") {
      extractionPrompt = `You are an expert at extracting actionable tasks from spoken content. Analyze this transcription from an academic researcher and extract any tasks or action items mentioned.

Transcription:
"""
${transcription}
"""

Today's date: ${today}

Extract tasks and respond with a JSON object:
{
  "transcription": "${transcription.substring(0, 100)}...",
  "tasks": [
    {
      "title": "Clear, actionable task title",
      "description": "Additional context if needed",
      "priority": "p1" | "p2" | "p3" | "p4",
      "category": "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc",
      "due_date": "YYYY-MM-DD or null"
    }
  ],
  "summary": "Brief summary of the voice memo content"
}

Priority guidelines:
- p1: Urgent mentions like "ASAP", "today", "urgent", "critical"
- p2: Important but not urgent, "this week", "soon"
- p3: Standard tasks, no urgency mentioned
- p4: Low priority, "when you get a chance", "eventually"

Return ONLY valid JSON, no markdown.`;
    } else {
      // extract_subtasks mode
      extractionPrompt = `You are an expert at extracting actionable subtasks from spoken content. This is a voice memo describing steps or subtasks for a larger task.

Transcription:
"""
${transcription}
"""

Today's date: ${today}

Extract subtasks and respond with a JSON object:
{
  "transcription": "${transcription.substring(0, 100)}...",
  "subtasks": [
    {
      "text": "Specific actionable subtask",
      "priority": "p1" | "p2" | "p3" | "p4",
      "estimated_minutes": 30
    }
  ],
  "summary": "Brief summary of what these subtasks accomplish"
}

Return ONLY valid JSON, no markdown.`;
    }

    const response = await getAnthropicClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      // Return just the transcription if AI extraction fails
      return NextResponse.json({
        success: true,
        result: {
          transcription,
          summary: "AI extraction unavailable",
        } as TranscriptionResult,
      });
    }

    // Parse JSON response
    let result: TranscriptionResult;
    try {
      const cleanedText = textContent.text.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanedText);
      // Ensure transcription is included
      result.transcription = transcription;
    } catch {
      // Return just transcription if parsing fails
      return NextResponse.json({
        success: true,
        result: {
          transcription,
          summary: "Could not parse AI extraction",
        } as TranscriptionResult,
      });
    }

    // Log activity
    await supabase.from("workspace_activity").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: "ai_tasks_extracted",
      entity_title: "Voice transcription",
      details: {
        mode,
        transcription_length: transcription.length,
        tasks_extracted: result.tasks?.length || 0,
        subtasks_extracted: result.subtasks?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

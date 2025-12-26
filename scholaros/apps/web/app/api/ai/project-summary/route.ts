import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { env } from "@/lib/env";

const ProjectContextSchema = z.object({
  title: z.string(),
  type: z.enum(["manuscript", "grant", "general"]),
  status: z.string(),
  stage: z.string().optional(),
  summary: z.string().optional(),
});

const TaskContextSchema = z.object({
  title: z.string(),
  status: z.enum(["todo", "progress", "done"]),
  priority: z.enum(["p1", "p2", "p3", "p4"]),
  due_date: z.string().optional(),
});

const MilestoneContextSchema = z.object({
  title: z.string(),
  due_date: z.string().optional(),
  completed: z.boolean().default(false),
});

const NoteContextSchema = z.object({
  content: z.string(),
  created_at: z.string(),
});

const ProjectSummarySchema = z.object({
  project: ProjectContextSchema,
  tasks: z.array(TaskContextSchema).default([]),
  milestones: z.array(MilestoneContextSchema).default([]),
  recent_notes: z.array(NoteContextSchema).max(10).default([]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = ProjectSummarySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get AI service configuration from validated env
    const aiServiceUrl = env.AI_SERVICE_URL;
    const aiServiceKey = env.AI_SERVICE_KEY;

    if (!aiServiceUrl) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    // Proxy to AI service
    const response = await fetch(`${aiServiceUrl}/api/summarize/project`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(aiServiceKey && { "X-API-Key": aiServiceKey }),
      },
      body: JSON.stringify(validationResult.data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.detail || "AI service error" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Project summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

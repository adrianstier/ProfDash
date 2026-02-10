import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getAIServiceURL } from "@/lib/ai-service";

const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY;

const ExecuteTaskSchema = z.object({
  agentType: z.enum([
    "task",
    "project",
    "grant",
    "research",
    "calendar",
    "writing",
    "personnel",
    "planner",
  ]),
  taskType: z.string().min(1),
  input: z.record(z.unknown()),
  async: z.boolean().optional().default(false),
});

/**
 * POST /api/agents/execute
 * Execute a specific agent task
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = ExecuteTaskSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { agentType, taskType, input, async: asyncExecution } = validationResult.data;

    // Verify user has at least one workspace membership
    const { data: workspaces } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json(
        { error: "No workspace membership found" },
        { status: 403 }
      );
    }

    // Forward to AI service
    const AI_SERVICE_URL = getAIServiceURL();
    if (!AI_SERVICE_URL) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const response = await fetch(`${AI_SERVICE_URL}/api/agents/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVICE_KEY || "",
      },
      body: JSON.stringify({
        agent_type: agentType,
        task_type: taskType,
        input,
        async_execution: asyncExecution,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `AI service error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      taskId: data.task_id,
      status: data.status,
      result: data.result,
      error: data.error,
    });
  } catch (error) {
    console.error("Task execution failed:", error);
    return NextResponse.json(
      { error: "Failed to execute task" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getAIServiceURL } from "@/lib/ai-service";

const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY;

const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  agent: z.enum([
    "task",
    "project",
    "grant",
    "research",
    "calendar",
    "writing",
    "personnel",
    "planner",
  ]),
  action: z.string(),
  input: z.record(z.unknown()),
  dependsOn: z.array(z.string()).optional().default([]),
  condition: z
    .object({
      type: z.enum(["always", "if", "unless"]),
      expression: z.string().optional(),
      value: z.unknown().optional(),
    })
    .optional(),
  timeout: z.number().optional(),
  retries: z.number().optional().default(0),
  onError: z.enum(["fail", "skip", "fallback"]).optional().default("fail"),
  fallbackAgent: z
    .enum([
      "task",
      "project",
      "grant",
      "research",
      "calendar",
      "writing",
      "personnel",
      "planner",
    ])
    .optional(),
});

const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().optional().default("1.0"),
  steps: z.array(WorkflowStepSchema),
  errorHandling: z
    .enum(["fail_fast", "continue", "retry", "fallback"])
    .optional()
    .default("fail_fast"),
  timeout: z.number().optional(),
});

const OrchestrateRequestSchema = z.object({
  workflow: WorkflowDefinitionSchema,
  input: z.record(z.unknown()).optional().default({}),
});

/**
 * POST /api/agents/orchestrate
 * Execute a multi-agent workflow
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
    const validationResult = OrchestrateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { workflow, input } = validationResult.data;

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

    // Transform to snake_case for Python service
    const transformedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        name: step.name,
        agent: step.agent,
        action: step.action,
        input: step.input,
        depends_on: step.dependsOn,
        condition: step.condition,
        timeout: step.timeout,
        retries: step.retries,
        on_error: step.onError,
        fallback_agent: step.fallbackAgent,
      })),
      error_handling: workflow.errorHandling,
      timeout: workflow.timeout,
    };

    // Forward to AI service
    const AI_SERVICE_URL = getAIServiceURL();
    if (!AI_SERVICE_URL) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const response = await fetch(`${AI_SERVICE_URL}/api/agents/orchestrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVICE_KEY || "",
      },
      body: JSON.stringify({
        workflow: transformedWorkflow,
        input,
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

    // Transform response to camelCase
    interface StepResult {
      step_id: string;
      status: string;
      output: unknown;
      error?: string;
      execution_time_ms?: number;
      agent_type?: string;
    }

    return NextResponse.json({
      executionId: data.execution_id,
      status: data.status,
      results: data.results
        ? Object.fromEntries(
            Object.entries(data.results as Record<string, StepResult>).map(([key, value]) => [
              key,
              {
                stepId: value.step_id,
                status: value.status,
                output: value.output,
                error: value.error,
                executionTimeMs: value.execution_time_ms,
                agentType: value.agent_type,
              },
            ])
          )
        : {},
      error: data.error,
    });
  } catch (error) {
    console.error("Workflow orchestration failed:", error);
    return NextResponse.json(
      { error: "Failed to orchestrate workflow" },
      { status: 500 }
    );
  }
}

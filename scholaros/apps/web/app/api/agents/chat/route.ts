import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getAIServiceURL } from "@/lib/ai-service";

const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY;

const ChatRequestSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  context: z.record(z.unknown()).optional().default({}),
  agentType: z
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
  stream: z.boolean().optional().default(false),
});

/**
 * POST /api/agents/chat
 * Send a chat message to the agent system
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
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { message, sessionId, context, agentType, stream } = validationResult.data;

    // Get user's workspace
    const { data: workspaces } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    const workspaceId = workspaces?.[0]?.workspace_id || "default";

    // Enrich context with user data
    const enrichedContext = {
      ...context,
      userId: user.id,
      workspaceId,
    };

    // Forward to AI service
    const AI_SERVICE_URL = getAIServiceURL();
    if (!AI_SERVICE_URL) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const response = await fetch(`${AI_SERVICE_URL}/api/agents/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVICE_KEY || "",
      },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        context: enrichedContext,
        agent_type: agentType,
        stream,
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

    // Transform snake_case to camelCase for frontend
    return NextResponse.json({
      sessionId: data.session_id,
      messageId: data.message_id,
      content: data.content,
      agentType: data.agent_type,
      toolCalls: data.tool_calls || [],
      suggestedActions: data.suggested_actions || [],
      metadata: data.metadata || {},
    });
  } catch (error) {
    console.error("Chat failed:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

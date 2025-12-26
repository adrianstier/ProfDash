import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY;

const FeedbackRequestSchema = z.object({
  sessionId: z.string(),
  messageId: z.string(),
  feedbackType: z.enum([
    "thumbs_up",
    "thumbs_down",
    "correction",
    "suggestion",
    "rating",
  ]),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
  correction: z.string().optional(),
});

/**
 * POST /api/agents/feedback
 * Submit feedback on an agent response
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
    const validationResult = FeedbackRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const feedback = validationResult.data;

    // Forward to AI service
    const response = await fetch(`${AI_SERVICE_URL}/api/agents/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVICE_KEY || "",
      },
      body: JSON.stringify({
        session_id: feedback.sessionId,
        message_id: feedback.messageId,
        feedback_type: feedback.feedbackType,
        rating: feedback.rating,
        comment: feedback.comment,
        correction: feedback.correction,
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
      status: data.status,
      messageId: data.message_id,
      feedbackType: data.feedback_type,
    });
  } catch (error) {
    console.error("Feedback submission failed:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

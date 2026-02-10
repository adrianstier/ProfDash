import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIServiceURL } from "@/lib/ai-service";

const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY;

/**
 * GET /api/agents
 * List all available agents
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const AI_SERVICE_URL = getAIServiceURL();
    if (!AI_SERVICE_URL) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const response = await fetch(`${AI_SERVICE_URL}/api/agents/`, {
      headers: {
        "X-API-Key": AI_SERVICE_KEY || "",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `AI service error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to connect to AI service" },
      { status: 503 }
    );
  }
}

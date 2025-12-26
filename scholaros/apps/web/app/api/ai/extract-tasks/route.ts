import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { env } from "@/lib/env";

const ExtractTasksSchema = z.object({
  text: z.string().min(10).max(10000),
  context: z.string().max(500).optional(),
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
    const validationResult = ExtractTasksSchema.safeParse(body);

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
    const response = await fetch(`${aiServiceUrl}/api/extract`, {
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
    console.error("Extract tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

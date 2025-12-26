import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { env } from "@/lib/env";

const ResearcherProfileSchema = z.object({
  keywords: z.array(z.string()).default([]),
  recent_projects: z.array(z.string()).default([]),
  funding_history: z.array(z.string()).default([]),
  institution_type: z.string().optional(),
});

const GrantOpportunitySchema = z.object({
  title: z.string(),
  agency: z.string().optional(),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  funding_amount: z.string().optional(),
  deadline: z.string().optional(),
});

const FitScoreSchema = z.object({
  opportunity: GrantOpportunitySchema,
  profile: ResearcherProfileSchema,
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
    const validationResult = FitScoreSchema.safeParse(body);

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
    const response = await fetch(`${aiServiceUrl}/api/grants/fit-score`, {
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
    console.error("Fit score error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

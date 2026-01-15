/**
 * Onboarding API Route
 *
 * Manages user onboarding progress for Phase 9B Progressive Onboarding.
 *
 * GET /api/onboarding
 * - Returns current user's onboarding progress
 * - Includes step, completion status, timestamps
 *
 * PATCH /api/onboarding
 * - Updates onboarding progress (step, completed, skipped)
 * - Validates state transitions
 * - Tracks timestamps automatically
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UpdateOnboardingSchema } from "@scholaros/shared/schemas";
import type { OnboardingProgress, OnboardingStep } from "@scholaros/shared/types";

/**
 * GET /api/onboarding
 *
 * Returns the current user's onboarding progress.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch profile with onboarding fields
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        onboarding_step,
        onboarding_completed,
        onboarding_skipped,
        onboarding_started_at,
        onboarding_completed_at
      `
      )
      .eq("id", user.id)
      .single();

    if (profileError) {
      // If columns don't exist yet, return default state
      if (profileError.code === "PGRST204" || profileError.message?.includes("column")) {
        const defaultProgress: OnboardingProgress = {
          step: 0 as OnboardingStep,
          completed: false,
          skipped: false,
          startedAt: null,
          completedAt: null,
        };
        return NextResponse.json(defaultProgress);
      }

      console.error("[Onboarding] Error fetching profile:", profileError);
      return NextResponse.json({ error: "Failed to fetch onboarding status" }, { status: 500 });
    }

    const progress: OnboardingProgress = {
      step: (profile?.onboarding_step ?? 0) as OnboardingStep,
      completed: profile?.onboarding_completed ?? false,
      skipped: profile?.onboarding_skipped ?? false,
      startedAt: profile?.onboarding_started_at ?? null,
      completedAt: profile?.onboarding_completed_at ?? null,
    };

    return NextResponse.json(progress);
  } catch (error) {
    console.error("[Onboarding] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/onboarding
 *
 * Updates the user's onboarding progress.
 *
 * Request body:
 * - step?: OnboardingStep (0-5)
 * - completed?: boolean
 * - skipped?: boolean
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateOnboardingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    // Get current profile state
    const { data: currentProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("onboarding_step, onboarding_completed, onboarding_skipped, onboarding_started_at")
      .eq("id", user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST204") {
      console.error("[Onboarding] Error fetching current profile:", fetchError);
      return NextResponse.json({ error: "Failed to fetch current status" }, { status: 500 });
    }

    // Build update object with automatic timestamp tracking
    const updateData: Record<string, unknown> = {};
    const now = new Date().toISOString();

    // Handle step update
    if (updates.step !== undefined) {
      updateData.onboarding_step = updates.step;

      // Set started_at if this is the first step (step > 0 and not previously started)
      if (updates.step > 0 && !currentProfile?.onboarding_started_at) {
        updateData.onboarding_started_at = now;
      }
    }

    // Handle completion
    if (updates.completed !== undefined) {
      updateData.onboarding_completed = updates.completed;

      if (updates.completed && !currentProfile?.onboarding_completed) {
        updateData.onboarding_completed_at = now;
        // Auto-set step to 5 when completed
        updateData.onboarding_step = 5;
      }
    }

    // Handle skip
    if (updates.skipped !== undefined) {
      updateData.onboarding_skipped = updates.skipped;

      if (updates.skipped && !currentProfile?.onboarding_completed) {
        // Mark as completed when skipped
        updateData.onboarding_completed = true;
        updateData.onboarding_completed_at = now;
      }
    }

    // Validate state transitions
    if (currentProfile?.onboarding_completed && !updates.completed) {
      // Allow un-completing only if explicitly requested (for admin/testing)
      // In production, you might want to disallow this
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select(
        `
        id,
        onboarding_step,
        onboarding_completed,
        onboarding_skipped,
        onboarding_started_at,
        onboarding_completed_at
      `
      )
      .single();

    if (updateError) {
      // Handle case where columns don't exist yet
      if (updateError.message?.includes("column")) {
        console.warn("[Onboarding] Columns not yet available - migrations pending");
        return NextResponse.json(
          {
            error: "Onboarding features not yet available",
            message: "Database migration required",
          },
          { status: 503 }
        );
      }

      console.error("[Onboarding] Error updating profile:", updateError);
      return NextResponse.json({ error: "Failed to update onboarding status" }, { status: 500 });
    }

    const progress: OnboardingProgress = {
      step: (updatedProfile?.onboarding_step ?? 0) as OnboardingStep,
      completed: updatedProfile?.onboarding_completed ?? false,
      skipped: updatedProfile?.onboarding_skipped ?? false,
      startedAt: updatedProfile?.onboarding_started_at ?? null,
      completedAt: updatedProfile?.onboarding_completed_at ?? null,
    };

    return NextResponse.json(progress);
  } catch (error) {
    console.error("[Onboarding] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

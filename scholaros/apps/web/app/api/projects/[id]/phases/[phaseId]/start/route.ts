import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/projects/[id]/phases/[phaseId]/start - Start a phase (with blocking check)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const { phaseId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the phase and check its current status
    const { data: phase, error: phaseError } = await supabase
      .from("project_phases")
      .select("*")
      .eq("id", phaseId)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Check if already started
    if (phase.status === "in_progress") {
      return NextResponse.json({ error: "Phase is already in progress" }, { status: 400 });
    }

    if (phase.status === "completed") {
      return NextResponse.json({ error: "Phase is already completed" }, { status: 400 });
    }

    // Check blocking phases using the database function
    const { data: canStart, error: canStartError } = await supabase
      .rpc("can_start_phase", { p_phase_id: phaseId });

    if (canStartError) {
      console.error("Error checking blocking phases:", canStartError);
      return NextResponse.json({ error: canStartError.message }, { status: 500 });
    }

    if (!canStart) {
      // Get the blocking phases to return in the error
      const blockedBy = phase.blocked_by || [];
      const { data: blockingPhases } = await supabase
        .from("project_phases")
        .select("id, title, status")
        .in("id", blockedBy)
        .neq("status", "completed");

      return NextResponse.json(
        {
          error: "Phase is blocked by incomplete phases",
          blocking_phases: blockingPhases || []
        },
        { status: 409 }
      );
    }

    // Start the phase
    const { data: updatedPhase, error: updateError } = await supabase
      .from("project_phases")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString()
      })
      .eq("id", phaseId)
      .select()
      .single();

    if (updateError) {
      console.error("Error starting phase:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", phase.project_id)
      .single();

    if (project) {
      await supabase.from("workspace_activity").insert({
        workspace_id: project.workspace_id,
        user_id: user.id,
        action: "phase_started",
        project_id: phase.project_id,
        phase_id: phaseId,
        entity_title: phase.title,
        details: { phase_id: phaseId }
      });
    }

    return NextResponse.json(updatedPhase);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

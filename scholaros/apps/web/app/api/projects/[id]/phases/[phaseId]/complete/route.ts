import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/projects/[id]/phases/[phaseId]/complete - Complete a phase (unblocks dependents)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const { id: projectId, phaseId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get project to verify workspace membership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify user is member of the project's workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
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

    if (phase.status === "completed") {
      return NextResponse.json({ error: "Phase is already completed" }, { status: 400 });
    }

    if (phase.status === "pending") {
      return NextResponse.json(
        { error: "Cannot complete a phase that hasn't been started" },
        { status: 400 }
      );
    }

    // Complete the phase
    const { data: updatedPhase, error: updateError } = await supabase
      .from("project_phases")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", phaseId)
      .select()
      .single();

    if (updateError) {
      console.error("Error completing phase:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Find phases that were blocked by this phase and update their status if now unblocked
    const { data: dependentPhases } = await supabase
      .from("project_phases")
      .select("id, blocked_by, status")
      .eq("project_id", phase.project_id)
      .contains("blocked_by", [phaseId])
      .eq("status", "blocked");

    const unblockedPhases: string[] = [];

    if (dependentPhases && dependentPhases.length > 0) {
      // For each dependent phase, check if it's now fully unblocked
      for (const dep of dependentPhases) {
        const { data: canStart } = await supabase
          .rpc("can_start_phase", { p_phase_id: dep.id });

        if (canStart) {
          // Update to pending (user can then start it)
          await supabase
            .from("project_phases")
            .update({ status: "pending" })
            .eq("id", dep.id);

          unblockedPhases.push(dep.id);
        }
      }
    }

    // Log activity (project already fetched above for workspace verification)
    await supabase.from("workspace_activity").insert({
      workspace_id: project.workspace_id,
      user_id: user.id,
      action: "phase_completed",
      project_id: projectId,
      phase_id: phaseId,
      entity_title: phase.title,
      details: {
        phase_id: phaseId,
        unblocked_phases: unblockedPhases
      }
    });

    return NextResponse.json({
      ...updatedPhase,
      unblocked_phases: unblockedPhases
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

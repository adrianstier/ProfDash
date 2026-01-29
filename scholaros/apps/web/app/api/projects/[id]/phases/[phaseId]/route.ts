import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdateProjectPhaseSchema } from "@scholaros/shared";

// GET /api/projects/[id]/phases/[phaseId] - Get a single phase with details
export async function GET(
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

    const { data: phase, error } = await supabase
      .from("project_phases")
      .select(`
        *,
        deliverables:project_deliverables(*),
        assignments:project_phase_assignments(
          *,
          role:project_roles(*),
          user:profiles(id, full_name, email, avatar_url)
        )
      `)
      .eq("id", phaseId)
      .single();

    if (error) {
      console.error("Error fetching phase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Sort deliverables
    phase.deliverables = phase.deliverables?.sort((a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
    ) || [];

    return NextResponse.json(phase);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/phases/[phaseId] - Update a phase
export async function PATCH(
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

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateProjectPhaseSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("project_phases")
      .update(validationResult.data)
      .eq("id", phaseId)
      .select()
      .single();

    if (error) {
      console.error("Error updating phase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/phases/[phaseId] - Delete a phase
export async function DELETE(
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

    // First remove this phase from any blocked_by arrays
    const { data: dependentPhases } = await supabase
      .from("project_phases")
      .select("id, blocked_by")
      .contains("blocked_by", [phaseId]);

    if (dependentPhases && dependentPhases.length > 0) {
      // Update each dependent phase to remove this phase from blocked_by
      for (const dep of dependentPhases) {
        const newBlockedBy = (dep.blocked_by || []).filter((id: string) => id !== phaseId);
        await supabase
          .from("project_phases")
          .update({ blocked_by: newBlockedBy })
          .eq("id", dep.id);
      }
    }

    const { error } = await supabase
      .from("project_phases")
      .delete()
      .eq("id", phaseId);

    if (error) {
      console.error("Error deleting phase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

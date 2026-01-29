import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateProjectPhaseAssignmentSchema } from "@scholaros/shared";

// GET /api/projects/[id]/phases/[phaseId]/assignments - List assignments for a phase
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

    const { data: assignments, error } = await supabase
      .from("project_phase_assignments")
      .select(`
        *,
        role:project_roles(*),
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq("phase_id", phaseId);

    if (error) {
      console.error("Error fetching assignments:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/phases/[phaseId]/assignments - Create a new assignment
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

    const body = await request.json();

    // Add phase_id to the body
    const dataWithPhaseId = { ...body, phase_id: phaseId };

    // Validate the request body
    const validationResult = CreateProjectPhaseAssignmentSchema.safeParse(dataWithPhaseId);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Check for existing assignment (prevent duplicates)
    const { data: existing } = await supabase
      .from("project_phase_assignments")
      .select("id")
      .eq("phase_id", phaseId)
      .eq("role_id", validationResult.data.role_id || null)
      .eq("user_id", validationResult.data.user_id || null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This assignment already exists" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("project_phase_assignments")
      .insert(validationResult.data)
      .select(`
        *,
        role:project_roles(*),
        user:profiles(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Error creating assignment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity (project already fetched above for workspace verification)
    const { data: phase } = await supabase
      .from("project_phases")
      .select("title")
      .eq("id", phaseId)
      .single();

    const assigneeName = data.user?.full_name || data.role?.name || "Unknown";
    await supabase.from("workspace_activity").insert({
      workspace_id: project.workspace_id,
      user_id: user.id,
      action: "role_assigned",
      project_id: projectId,
      phase_id: phaseId,
      entity_title: phase?.title,
      details: {
        assignment_id: data.id,
        phase_id: phaseId,
        assignee: assigneeName,
        assignment_type: data.assignment_type
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/phases/[phaseId]/assignments - Delete an assignment (using query param)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const { id: projectId } = await params;
    const url = new URL(request.url);
    const assignmentId = url.searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId query parameter required" }, { status: 400 });
    }

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

    const { error } = await supabase
      .from("project_phase_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("Error deleting assignment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

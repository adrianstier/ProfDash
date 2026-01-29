import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateExperimentTeamAssignmentSchema } from "@scholaros/shared";

// GET /api/research/projects/[id]/experiments/[expId]/team - List team assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expId: string }> }
) {
  const { id: projectId, expId: experimentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify experiment belongs to project
  const { data: experiment, error: expError } = await supabase
    .from("experiments")
    .select("id, project_id")
    .eq("id", experimentId)
    .eq("project_id", projectId)
    .single();

  if (expError || !experiment) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Fetch team assignments with personnel details
  const { data: assignments, error } = await supabase
    .from("experiment_team_assignments")
    .select(
      `
      *,
      personnel:personnel(id, name, email, role)
    `
    )
    .eq("experiment_id", experimentId)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching team assignments:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(assignments);
}

// POST /api/research/projects/[id]/experiments/[expId]/team - Add team member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expId: string }> }
) {
  const { id: projectId, expId: experimentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify experiment and get workspace_id
  const { data: experiment, error: expError } = await supabase
    .from("experiments")
    .select("id, project_id, workspace_id")
    .eq("id", experimentId)
    .eq("project_id", projectId)
    .single();

  if (expError || !experiment) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Verify user is a member of the workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", experiment.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this workspace" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = CreateExperimentTeamAssignmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid assignment data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check if assignment already exists
  const { data: existingAssignment } = await supabase
    .from("experiment_team_assignments")
    .select("id")
    .eq("experiment_id", experimentId)
    .eq("personnel_id", parsed.data.personnel_id)
    .single();

  if (existingAssignment) {
    return NextResponse.json(
      { error: "This team member is already assigned to this experiment" },
      { status: 409 }
    );
  }

  const assignmentData = {
    ...parsed.data,
    experiment_id: experimentId,
    project_id: projectId,
    // Convert dates to ISO strings if present
    start_date: parsed.data.start_date?.toISOString().split("T")[0] ?? null,
    end_date: parsed.data.end_date?.toISOString().split("T")[0] ?? null,
  };

  const { data: assignment, error } = await supabase
    .from("experiment_team_assignments")
    .insert(assignmentData)
    .select(
      `
      *,
      personnel:personnel(id, name, email, role)
    `
    )
    .single();

  if (error) {
    console.error("Error creating team assignment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(assignment, { status: 201 });
}

// DELETE /api/research/projects/[id]/experiments/[expId]/team - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expId: string }> }
) {
  const { expId: experimentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get assignment ID from query params
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignment_id");

  if (!assignmentId) {
    return NextResponse.json(
      { error: "Missing assignment_id parameter" },
      { status: 400 }
    );
  }

  // Verify assignment exists and belongs to this experiment
  const { data: assignment, error: assignmentError } = await supabase
    .from("experiment_team_assignments")
    .select("id, experiment_id")
    .eq("id", assignmentId)
    .eq("experiment_id", experimentId)
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Get the experiment to find workspace_id
  const { data: experiment } = await supabase
    .from("experiments")
    .select("workspace_id")
    .eq("id", experimentId)
    .single();

  if (!experiment) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Verify user has permissions
  const workspaceId = experiment.workspace_id;
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this workspace" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("experiment_team_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    console.error("Error deleting team assignment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

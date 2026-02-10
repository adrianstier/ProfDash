import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdateProjectWorkstreamSchema } from "@scholaros/shared";

// GET /api/projects/[id]/workstreams/[workstreamId] - Get a single workstream with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> }
) {
  try {
    const { id: projectId, workstreamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to the project via workspace membership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

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

    const { data: workstream, error } = await supabase
      .from("project_workstreams")
      .select(`
        *,
        owner:profiles!project_workstreams_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq("id", workstreamId)
      .single();

    if (error) {
      console.error("Error fetching workstream:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!workstream) {
      return NextResponse.json({ error: "Workstream not found" }, { status: 404 });
    }

    // Get tasks for this workstream
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("workstream_id", workstreamId)
      .order("created_at", { ascending: false });

    // Get deliverables linked to this workstream
    const { data: deliverables } = await supabase
      .from("project_deliverables")
      .select("*")
      .eq("workstream_id", workstreamId)
      .order("sort_order", { ascending: true });

    return NextResponse.json({
      ...workstream,
      tasks: tasks || [],
      deliverables: deliverables || []
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/workstreams/[workstreamId] - Update a workstream
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> }
) {
  try {
    const { id: projectId, workstreamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateProjectWorkstreamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("project_workstreams")
      .update(validationResult.data)
      .eq("id", workstreamId)
      .select()
      .single();

    if (error) {
      console.error("Error updating workstream:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity if title or status changed
    if (validationResult.data.title || validationResult.data.status) {
      const { data: project } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", projectId)
        .single();

      if (project) {
        await supabase.from("workspace_activity").insert({
          workspace_id: project.workspace_id,
          user_id: user.id,
          action: "workstream_updated",
          project_id: projectId,
          workstream_id: workstreamId,
          entity_title: data.title,
          details: { changes: Object.keys(validationResult.data) }
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/workstreams/[workstreamId] - Delete a workstream
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; workstreamId: string }> }
) {
  try {
    const { id: projectId, workstreamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to the project via workspace membership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

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

    // First, unlink any tasks from this workstream
    await supabase
      .from("tasks")
      .update({ workstream_id: null })
      .eq("workstream_id", workstreamId);

    // Unlink any deliverables from this workstream (they stay attached to their phases)
    await supabase
      .from("project_deliverables")
      .update({ workstream_id: null })
      .eq("workstream_id", workstreamId);

    const { error } = await supabase
      .from("project_workstreams")
      .delete()
      .eq("id", workstreamId);

    if (error) {
      console.error("Error deleting workstream:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

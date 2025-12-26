import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdateProjectSchema } from "@scholaros/shared";

// GET /api/projects/[id] - Get a single project with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        milestones:project_milestones(*),
        notes:project_notes(*),
        collaborators:project_collaborators(*),
        tasks:tasks(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching project:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate task counts
    const taskCount = data.tasks?.length ?? 0;
    const completedTaskCount = data.tasks?.filter((t: { status: string }) => t.status === "done").length ?? 0;

    return NextResponse.json({
      ...data,
      task_count: taskCount,
      completed_task_count: completedTaskCount,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update a project
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .update(validationResult.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating project:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership before deletion (defense in depth - RLS also protects)
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting project:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

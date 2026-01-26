import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateProjectWorkstreamSchema } from "@scholaros/shared";

// GET /api/projects/[id]/workstreams - List workstreams for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workstreams with owner profile and task counts
    const { data: workstreams, error } = await supabase
      .from("project_workstreams")
      .select(`
        *,
        owner:profiles!project_workstreams_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching workstreams:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get task counts per workstream
    const { data: taskCounts } = await supabase
      .from("tasks")
      .select("workstream_id, status")
      .eq("project_id", projectId)
      .not("workstream_id", "is", null);

    // Add task stats to each workstream
    const workstreamsWithStats = workstreams?.map(ws => {
      const wsTasks = taskCounts?.filter(t => t.workstream_id === ws.id) || [];
      const totalTasks = wsTasks.length;
      const completedTasks = wsTasks.filter(t => t.status === "done").length;
      const overdueTasks = 0; // Would need to check due dates

      return {
        ...ws,
        task_count: totalTasks,
        completed_task_count: completedTasks,
        overdue_task_count: overdueTasks
      };
    });

    return NextResponse.json(workstreamsWithStats);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/workstreams - Create a new workstream
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Add project_id to the body
    const dataWithProjectId = { ...body, project_id: projectId };

    // Validate the request body
    const validationResult = CreateProjectWorkstreamSchema.safeParse(dataWithProjectId);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get the next sort_order if not provided
    let sortOrder = validationResult.data.sort_order;
    if (sortOrder === undefined || sortOrder === 0) {
      const { data: maxOrderWorkstream } = await supabase
        .from("project_workstreams")
        .select("sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      sortOrder = (maxOrderWorkstream?.sort_order ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from("project_workstreams")
      .insert({ ...validationResult.data, sort_order: sortOrder })
      .select()
      .single();

    if (error) {
      console.error("Error creating workstream:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();

    if (project) {
      await supabase.from("workspace_activity").insert({
        workspace_id: project.workspace_id,
        user_id: user.id,
        action: "workstream_created",
        project_id: projectId,
        workstream_id: data.id,
        entity_title: data.title,
        details: { workstream_id: data.id }
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

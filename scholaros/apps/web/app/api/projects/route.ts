import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateProjectSchema } from "@scholaros/shared";

// GET /api/projects - List projects with optional filters
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("projects")
      .select(`
        *,
        tasks:tasks(count),
        milestones:project_milestones(count)
      `)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching projects:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform count results
    const projects = data?.map((project) => ({
      ...project,
      task_count: project.tasks?.[0]?.count ?? 0,
      milestone_count: project.milestones?.[0]?.count ?? 0,
      tasks: undefined,
      milestones: undefined,
    }));

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = CreateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const projectData = {
      ...validationResult.data,
      owner_id: user.id,
    };

    const { data, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

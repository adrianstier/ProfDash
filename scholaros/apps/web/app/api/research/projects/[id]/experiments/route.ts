import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateExperimentSchema } from "@scholaros/shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/research/projects/[id]/experiments - List experiments for a project
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get project to verify access
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id, type")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.type !== "research") {
      return NextResponse.json(
        { error: "This is not a research project" },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const siteId = searchParams.get("site_id");

    let query = supabase
      .from("experiments")
      .select(`
        *,
        site:field_sites(id, name, code, location),
        lead:profiles!experiments_lead_id_fkey(id, full_name, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }
    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data: experiments, error } = await query;

    if (error) {
      console.error("Error fetching experiments:", error);
      return NextResponse.json(
        { error: "Failed to fetch experiments" },
        { status: 500 }
      );
    }

    // Get additional stats for each experiment
    const experimentsWithStats = await Promise.all(
      experiments.map(async (exp) => {
        const [teamResult, fieldworkResult, taskResult] = await Promise.all([
          supabase
            .from("experiment_team_assignments")
            .select("id", { count: "exact", head: true })
            .eq("experiment_id", exp.id),
          supabase
            .from("fieldwork_schedules")
            .select("id", { count: "exact", head: true })
            .eq("experiment_id", exp.id)
            .in("status", ["planned", "confirmed"]),
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("experiment_id", exp.id),
        ]);

        return {
          ...exp,
          team_count: teamResult.count ?? 0,
          fieldwork_count: fieldworkResult.count ?? 0,
          task_count: taskResult.count ?? 0,
        };
      })
    );

    return NextResponse.json(experimentsWithStats);
  } catch (error) {
    console.error("Error in GET experiments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/research/projects/[id]/experiments - Create a new experiment
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get project to verify access and get workspace_id
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id, type")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.type !== "research") {
      return NextResponse.json(
        { error: "Experiments can only be added to research projects" },
        { status: 400 }
      );
    }

    // Verify workspace membership with write access
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin", "member"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = CreateExperimentSchema.safeParse({
      ...body,
      project_id: projectId,
      workspace_id: project.workspace_id,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from("experiments")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxOrder?.sort_order ?? -1) + 1;

    const { data: experiment, error } = await supabase
      .from("experiments")
      .insert({
        ...validationResult.data,
        sort_order: sortOrder,
      })
      .select(`
        *,
        site:field_sites(id, name, code, location),
        lead:profiles!experiments_lead_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Error creating experiment:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An experiment with this code already exists in this project" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create experiment" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ...experiment, team_count: 0, fieldwork_count: 0, task_count: 0 },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST experiments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

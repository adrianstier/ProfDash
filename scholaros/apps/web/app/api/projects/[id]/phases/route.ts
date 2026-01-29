import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateProjectPhaseSchema } from "@scholaros/shared";

// GET /api/projects/[id]/phases - List phases for a project
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

    // Get phases with deliverables and assignments
    const { data: phases, error } = await supabase
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
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching phases:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort deliverables within each phase
    const phasesWithSortedDeliverables = phases?.map(phase => ({
      ...phase,
      deliverables: phase.deliverables?.sort((a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
      ) || []
    }));

    return NextResponse.json(phasesWithSortedDeliverables);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/phases - Create a new phase
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

    // Add project_id to the body
    const dataWithProjectId = { ...body, project_id: projectId };

    // Validate the request body
    const validationResult = CreateProjectPhaseSchema.safeParse(dataWithProjectId);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get the next sort_order if not provided
    let sortOrder = validationResult.data.sort_order;
    if (sortOrder === undefined || sortOrder === 0) {
      const { data: maxOrderPhase } = await supabase
        .from("project_phases")
        .select("sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      sortOrder = (maxOrderPhase?.sort_order ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from("project_phases")
      .insert({ ...validationResult.data, sort_order: sortOrder })
      .select()
      .single();

    if (error) {
      console.error("Error creating phase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

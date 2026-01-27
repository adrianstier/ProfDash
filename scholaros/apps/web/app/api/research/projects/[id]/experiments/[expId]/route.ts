import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UpdateExperimentSchema } from "@scholaros/shared";

interface RouteParams {
  params: Promise<{ id: string; expId: string }>;
}

// GET /api/research/projects/[id]/experiments/[expId]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { expId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: experiment, error } = await supabase
      .from("experiments")
      .select(`
        *,
        site:field_sites(id, name, code, location, timezone, access_requirements),
        lead:profiles!experiments_lead_id_fkey(id, full_name, avatar_url, email)
      `)
      .eq("id", expId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
      }
      console.error("Error fetching experiment:", error);
      return NextResponse.json(
        { error: "Failed to fetch experiment" },
        { status: 500 }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", experiment.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to view this experiment" },
        { status: 403 }
      );
    }

    // Get additional counts
    const [teamResult, fieldworkResult, taskResult] = await Promise.all([
      supabase
        .from("experiment_team_assignments")
        .select("id", { count: "exact", head: true })
        .eq("experiment_id", expId),
      supabase
        .from("fieldwork_schedules")
        .select("id", { count: "exact", head: true })
        .eq("experiment_id", expId),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("experiment_id", expId),
    ]);

    return NextResponse.json({
      ...experiment,
      team_count: teamResult.count ?? 0,
      fieldwork_count: fieldworkResult.count ?? 0,
      task_count: taskResult.count ?? 0,
    });
  } catch (error) {
    console.error("Error in GET experiment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/research/projects/[id]/experiments/[expId]
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { expId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get experiment to verify access
    const { data: existingExp, error: fetchError } = await supabase
      .from("experiments")
      .select("workspace_id")
      .eq("id", expId)
      .single();

    if (fetchError || !existingExp) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    // Verify workspace membership with write access
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", existingExp.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin", "member"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = UpdateExperimentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { data: experiment, error } = await supabase
      .from("experiments")
      .update(validationResult.data)
      .eq("id", expId)
      .select(`
        *,
        site:field_sites(id, name, code, location),
        lead:profiles!experiments_lead_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Error updating experiment:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An experiment with this code already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update experiment" },
        { status: 500 }
      );
    }

    return NextResponse.json(experiment);
  } catch (error) {
    console.error("Error in PATCH experiment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/research/projects/[id]/experiments/[expId]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { expId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get experiment to verify access
    const { data: existingExp, error: fetchError } = await supabase
      .from("experiments")
      .select("workspace_id")
      .eq("id", expId)
      .single();

    if (fetchError || !existingExp) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    // Verify workspace membership with admin access
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", existingExp.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Admin access required to delete experiments" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("experiments")
      .delete()
      .eq("id", expId);

    if (error) {
      console.error("Error deleting experiment:", error);
      return NextResponse.json(
        { error: "Failed to delete experiment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE experiment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

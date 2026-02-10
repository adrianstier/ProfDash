import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CreateFieldworkScheduleSchema,
  UpdateFieldworkScheduleSchema,
} from "@scholaros/shared";

// GET /api/research/projects/[id]/experiments/[expId]/fieldwork - List fieldwork schedules
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

  // Verify experiment belongs to project and get workspace_id
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

  // Parse query params for filters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // Build query
  let query = supabase
    .from("fieldwork_schedules")
    .select(
      `
      *,
      site:field_sites(id, name, code),
      experiment:experiments(id, title, code)
    `
    )
    .eq("experiment_id", experimentId)
    .order("start_date", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: schedules, error } = await query;

  if (error) {
    console.error("Error fetching fieldwork schedules:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(schedules);
}

// POST /api/research/projects/[id]/experiments/[expId]/fieldwork - Create fieldwork schedule
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
  const parsed = CreateFieldworkScheduleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fieldwork data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Validate that end_date is not before start_date
  if (parsed.data.end_date < parsed.data.start_date) {
    return NextResponse.json(
      { error: "End date must be on or after start date" },
      { status: 400 }
    );
  }

  const scheduleData = {
    ...parsed.data,
    experiment_id: experimentId,
    // Convert dates to ISO strings
    start_date: parsed.data.start_date.toISOString().split("T")[0],
    end_date: parsed.data.end_date.toISOString().split("T")[0],
  };

  const { data: schedule, error } = await supabase
    .from("fieldwork_schedules")
    .insert(scheduleData)
    .select(
      `
      *,
      site:field_sites(id, name, code),
      experiment:experiments(id, title, code)
    `
    )
    .single();

  if (error) {
    console.error("Error creating fieldwork schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(schedule, { status: 201 });
}

// PATCH /api/research/projects/[id]/experiments/[expId]/fieldwork - Update fieldwork schedule
export async function PATCH(
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

  // Get schedule ID from query params
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("schedule_id");

  if (!scheduleId) {
    return NextResponse.json(
      { error: "Missing schedule_id parameter" },
      { status: 400 }
    );
  }

  // Verify schedule exists and belongs to this experiment, fetching current dates for validation
  const { data: existingSchedule, error: scheduleError } = await supabase
    .from("fieldwork_schedules")
    .select("id, experiment_id, start_date, end_date")
    .eq("id", scheduleId)
    .eq("experiment_id", experimentId)
    .single();

  if (scheduleError || !existingSchedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
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

  const body = await request.json();
  const parsed = UpdateFieldworkScheduleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fieldwork data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Convert dates if present
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.start_date !== undefined) {
    updateData.start_date = parsed.data.start_date.toISOString().split("T")[0];
  }
  if (parsed.data.end_date !== undefined) {
    updateData.end_date = parsed.data.end_date.toISOString().split("T")[0];
  }

  // Validate date range: use the provided date or fall back to the existing record's date
  const effectiveStartDate = (updateData.start_date as string) || existingSchedule.start_date;
  const effectiveEndDate = (updateData.end_date as string) || existingSchedule.end_date;

  if (effectiveStartDate && effectiveEndDate && effectiveStartDate > effectiveEndDate) {
    return NextResponse.json(
      { error: "End date must be on or after start date" },
      { status: 400 }
    );
  }

  const { data: schedule, error } = await supabase
    .from("fieldwork_schedules")
    .update(updateData)
    .eq("id", scheduleId)
    .select(
      `
      *,
      site:field_sites(id, name, code),
      experiment:experiments(id, title, code)
    `
    )
    .single();

  if (error) {
    console.error("Error updating fieldwork schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(schedule);
}

// DELETE /api/research/projects/[id]/experiments/[expId]/fieldwork - Delete fieldwork schedule
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

  // Get schedule ID from query params
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("schedule_id");

  if (!scheduleId) {
    return NextResponse.json(
      { error: "Missing schedule_id parameter" },
      { status: 400 }
    );
  }

  // Verify schedule exists and belongs to this experiment
  const { data: existingSchedule, error: scheduleError } = await supabase
    .from("fieldwork_schedules")
    .select("id, experiment_id")
    .eq("id", scheduleId)
    .eq("experiment_id", experimentId)
    .single();

  if (scheduleError || !existingSchedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
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
    .from("fieldwork_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    console.error("Error deleting fieldwork schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateProjectDeliverableSchema, UpdateProjectDeliverableSchema } from "@scholaros/shared";

// GET /api/projects/[id]/phases/[phaseId]/deliverables - List deliverables for a phase
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const { phaseId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: deliverables, error } = await supabase
      .from("project_deliverables")
      .select(`
        *,
        workstream:project_workstreams(id, title, color),
        document:documents(id, name, file_path)
      `)
      .eq("phase_id", phaseId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching deliverables:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(deliverables);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/phases/[phaseId]/deliverables - Create a new deliverable
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

    const body = await request.json();

    // Add phase_id to the body
    const dataWithPhaseId = { ...body, phase_id: phaseId };

    // Validate the request body
    const validationResult = CreateProjectDeliverableSchema.safeParse(dataWithPhaseId);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get the next sort_order if not provided
    let sortOrder = validationResult.data.sort_order;
    if (sortOrder === undefined || sortOrder === 0) {
      const { data: maxOrderDeliverable } = await supabase
        .from("project_deliverables")
        .select("sort_order")
        .eq("phase_id", phaseId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      sortOrder = (maxOrderDeliverable?.sort_order ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from("project_deliverables")
      .insert({ ...validationResult.data, project_id: projectId, sort_order: sortOrder })
      .select()
      .single();

    if (error) {
      console.error("Error creating deliverable:", error);
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
        action: "deliverable_created",
        project_id: projectId,
        deliverable_id: data.id,
        entity_title: data.title,
        details: { deliverable_id: data.id, phase_id: phaseId }
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/phases/[phaseId]/deliverables - Update a deliverable (using query param)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const { id: projectId } = await params;
    const url = new URL(request.url);
    const deliverableId = url.searchParams.get("deliverableId");

    if (!deliverableId) {
      return NextResponse.json({ error: "deliverableId query parameter required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateProjectDeliverableSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // If marking as completed, set completed_at
    const updateData = { ...validationResult.data };
    if (updateData.status === "completed" && !body.completed_at) {
      (updateData as Record<string, unknown>).completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("project_deliverables")
      .update(updateData)
      .eq("id", deliverableId)
      .select()
      .single();

    if (error) {
      console.error("Error updating deliverable:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity if completed
    if (validationResult.data.status === "completed") {
      const { data: project } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", projectId)
        .single();

      if (project) {
        await supabase.from("workspace_activity").insert({
          workspace_id: project.workspace_id,
          user_id: user.id,
          action: "deliverable_completed",
          project_id: projectId,
          deliverable_id: deliverableId,
          entity_title: data.title,
          details: { deliverable_id: deliverableId }
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/phases/[phaseId]/deliverables - Delete a deliverable (using query param)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    await params;
    const url = new URL(request.url);
    const deliverableId = url.searchParams.get("deliverableId");

    if (!deliverableId) {
      return NextResponse.json({ error: "deliverableId query parameter required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("project_deliverables")
      .delete()
      .eq("id", deliverableId);

    if (error) {
      console.error("Error deleting deliverable:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

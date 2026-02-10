import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UpdatePermitSchema } from "@scholaros/shared";

// GET /api/research/projects/[id]/permits/[permitId] - Get a single permit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permitId: string }> }
) {
  const { id: projectId, permitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project access
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify workspace membership
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

  const { data: permit, error } = await supabase
    .from("permits")
    .select(
      `
      *,
      site:field_sites(id, name, code),
      experiment:experiments(id, title, code)
    `
    )
    .eq("id", permitId)
    .eq("project_id", projectId)
    .single();

  if (error || !permit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  return NextResponse.json(permit);
}

// PATCH /api/research/projects/[id]/permits/[permitId] - Update a permit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permitId: string }> }
) {
  const { id: projectId, permitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify permit exists and belongs to project
  const { data: existingPermit, error: permitError } = await supabase
    .from("permits")
    .select("id, project_id, workspace_id")
    .eq("id", permitId)
    .eq("project_id", projectId)
    .single();

  if (permitError || !existingPermit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  // Verify user is a member of the workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", existingPermit.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this workspace" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = UpdatePermitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid permit data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Convert dates to ISO strings if present
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.start_date !== undefined) {
    updateData.start_date = parsed.data.start_date?.toISOString().split("T")[0] ?? null;
  }
  if (parsed.data.expiration_date !== undefined) {
    updateData.expiration_date =
      parsed.data.expiration_date?.toISOString().split("T")[0] ?? null;
  }

  const { data: permit, error } = await supabase
    .from("permits")
    .update(updateData)
    .eq("id", permitId)
    .select(
      `
      *,
      site:field_sites(id, name, code),
      experiment:experiments(id, title, code)
    `
    )
    .single();

  if (error) {
    console.error("Error updating permit:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(permit);
}

// DELETE /api/research/projects/[id]/permits/[permitId] - Delete a permit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permitId: string }> }
) {
  const { id: projectId, permitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify permit exists and get workspace_id
  const { data: existingPermit, error: permitError } = await supabase
    .from("permits")
    .select("id, project_id, workspace_id")
    .eq("id", permitId)
    .eq("project_id", projectId)
    .single();

  if (permitError || !existingPermit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  // Verify user has appropriate permissions (admin or owner)
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", existingPermit.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can delete permits" },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("permits").delete().eq("id", permitId);

  if (error) {
    console.error("Error deleting permit:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

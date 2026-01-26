import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdateProjectRoleSchema } from "@scholaros/shared";

// PATCH /api/projects/[id]/roles/[roleId] - Update a role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const { id: projectId, roleId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateProjectRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate role names if name is being changed
    if (validationResult.data.name) {
      const { data: existing } = await supabase
        .from("project_roles")
        .select("id")
        .eq("project_id", projectId)
        .ilike("name", validationResult.data.name)
        .neq("id", roleId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "A role with this name already exists" },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("project_roles")
      .update(validationResult.data)
      .eq("id", roleId)
      .select()
      .single();

    if (error) {
      console.error("Error updating role:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/roles/[roleId] - Delete a role
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const { roleId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, remove this role from any phase assignments
    await supabase
      .from("project_phase_assignments")
      .delete()
      .eq("role_id", roleId);

    const { error } = await supabase
      .from("project_roles")
      .delete()
      .eq("id", roleId);

    if (error) {
      console.error("Error deleting role:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

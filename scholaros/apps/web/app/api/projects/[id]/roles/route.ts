import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateProjectRoleSchema } from "@scholaros/shared";

// GET /api/projects/[id]/roles - List roles for a project
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

    const { data: roles, error } = await supabase
      .from("project_roles")
      .select("*")
      .eq("project_id", projectId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/roles - Create a new role
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
    const validationResult = CreateProjectRoleSchema.safeParse(dataWithProjectId);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate role names
    const { data: existing } = await supabase
      .from("project_roles")
      .select("id")
      .eq("project_id", projectId)
      .ilike("name", validationResult.data.name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("project_roles")
      .insert(validationResult.data)
      .select()
      .single();

    if (error) {
      console.error("Error creating role:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

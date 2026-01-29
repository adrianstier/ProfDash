import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreatePermitSchema } from "@scholaros/shared";

// GET /api/research/projects/[id]/permits - List all permits for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
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

  // Parse query params for filters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const permitType = searchParams.get("permit_type");
  const includeExpired = searchParams.get("include_expired") === "true";

  // Build query
  let query = supabase
    .from("permits")
    .select(
      `
      *,
      site:field_sites(id, name, code),
      experiment:experiments(id, title, code)
    `
    )
    .eq("project_id", projectId)
    .order("expiration_date", { ascending: true, nullsFirst: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (permitType) {
    query = query.eq("permit_type", permitType);
  }

  if (!includeExpired) {
    // By default, only show non-expired permits
    query = query.neq("status", "expired");
  }

  const { data: permits, error } = await query;

  if (error) {
    console.error("Error fetching permits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(permits);
}

// POST /api/research/projects/[id]/permits - Create a new permit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project access and get workspace_id
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify user is a member of the workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this workspace" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = CreatePermitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid permit data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const permitData = {
    ...parsed.data,
    project_id: projectId,
    workspace_id: project.workspace_id,
    // Convert Date objects to ISO strings for Supabase
    start_date: parsed.data.start_date?.toISOString().split("T")[0] ?? null,
    expiration_date: parsed.data.expiration_date?.toISOString().split("T")[0] ?? null,
  };

  const { data: permit, error } = await supabase
    .from("permits")
    .insert(permitData)
    .select(
      `
      *,
      site:field_sites(id, name, code),
      experiment:experiments(id, title, code)
    `
    )
    .single();

  if (error) {
    console.error("Error creating permit:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(permit, { status: 201 });
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

// GET /api/workspaces - List user's workspaces with their role
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all workspaces the user is a member of, with their role
    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        role,
        workspace:workspaces (
          id,
          name,
          slug,
          settings,
          created_by,
          created_at
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching workspaces:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to include role at the top level
    const workspaces = data?.map((item) => ({
      ...item.workspace,
      role: item.role,
    })) || [];

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = CreateWorkspaceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slug } = validationResult.data;

    // Check if slug is unique
    const { data: existing } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Workspace with this slug already exists" },
        { status: 409 }
      );
    }

    // Use the RPC function to create workspace with owner
    const { data: workspaceId, error: createError } = await supabase.rpc(
      "create_workspace_with_owner",
      { workspace_name: name, workspace_slug: slug }
    );

    if (createError) {
      console.error("Error creating workspace:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Fetch the created workspace
    const { data: workspace, error: fetchError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (fetchError) {
      console.error("Error fetching workspace:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ ...workspace, role: "owner" }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

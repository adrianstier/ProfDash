import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateFieldSiteSchema } from "@scholaros/shared";

// GET /api/research/sites - List all field sites for workspace
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const activeOnly = searchParams.get("active_only") === "true";

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    let query = supabase
      .from("field_sites")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: sites, error } = await query;

    if (error) {
      console.error("Error fetching field sites:", error);
      return NextResponse.json(
        { error: "Failed to fetch field sites" },
        { status: 500 }
      );
    }

    return NextResponse.json(sites);
  } catch (error) {
    console.error("Error in GET /api/research/sites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/research/sites - Create a new field site
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = CreateFieldSiteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const siteData = validationResult.data;

    // Verify workspace membership with write access
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", siteData.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    if (!["owner", "admin", "member"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { data: site, error } = await supabase
      .from("field_sites")
      .insert(siteData)
      .select()
      .single();

    if (error) {
      console.error("Error creating field site:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          { error: "A site with this name or code already exists in this workspace" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create field site" },
        { status: 500 }
      );
    }

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/research/sites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

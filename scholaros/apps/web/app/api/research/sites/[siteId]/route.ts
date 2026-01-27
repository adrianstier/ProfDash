import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UpdateFieldSiteSchema } from "@scholaros/shared";

interface RouteParams {
  params: Promise<{ siteId: string }>;
}

// GET /api/research/sites/[siteId] - Get a single field site
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: site, error } = await supabase
      .from("field_sites")
      .select("*")
      .eq("id", siteId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Field site not found" }, { status: 404 });
      }
      console.error("Error fetching field site:", error);
      return NextResponse.json(
        { error: "Failed to fetch field site" },
        { status: 500 }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", site.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to view this site" },
        { status: 403 }
      );
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error in GET /api/research/sites/[siteId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/research/sites/[siteId] - Update a field site
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = UpdateFieldSiteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // First, get the site to verify workspace membership
    const { data: existingSite, error: fetchError } = await supabase
      .from("field_sites")
      .select("workspace_id")
      .eq("id", siteId)
      .single();

    if (fetchError || !existingSite) {
      return NextResponse.json({ error: "Field site not found" }, { status: 404 });
    }

    // Verify workspace membership with write access
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", existingSite.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin", "member"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { data: site, error } = await supabase
      .from("field_sites")
      .update(validationResult.data)
      .eq("id", siteId)
      .select()
      .single();

    if (error) {
      console.error("Error updating field site:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A site with this name or code already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update field site" },
        { status: 500 }
      );
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error in PATCH /api/research/sites/[siteId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/research/sites/[siteId] - Delete a field site
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { siteId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the site to verify workspace membership
    const { data: existingSite, error: fetchError } = await supabase
      .from("field_sites")
      .select("workspace_id")
      .eq("id", siteId)
      .single();

    if (fetchError || !existingSite) {
      return NextResponse.json({ error: "Field site not found" }, { status: 404 });
    }

    // Verify workspace membership with admin access
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", existingSite.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Admin access required to delete sites" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("field_sites")
      .delete()
      .eq("id", siteId);

    if (error) {
      console.error("Error deleting field site:", error);
      return NextResponse.json(
        { error: "Failed to delete field site" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/research/sites/[siteId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

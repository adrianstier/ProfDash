import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateActivitySchema } from "@scholaros/shared";

// Pagination defaults
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// GET /api/activity - Get activity feed for a workspace
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
    const action = searchParams.get("action"); // Optional: filter by action type
    const taskId = searchParams.get("task_id"); // Optional: filter by task
    const projectId = searchParams.get("project_id"); // Optional: filter by project
    const userId = searchParams.get("user_id"); // Optional: filter by user
    const before = searchParams.get("before"); // Cursor for pagination

    // Pagination parameters
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
    );

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from("workspace_activity")
      .select(
        `
        *,
        user:profiles!workspace_activity_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Optional filters
    if (action) {
      query = query.eq("action", action);
    }

    if (taskId) {
      query = query.eq("task_id", taskId);
    }

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    // Cursor-based pagination
    if (before) {
      const { data: beforeEntry } = await supabase
        .from("workspace_activity")
        .select("created_at")
        .eq("id", before)
        .single();

      if (beforeEntry) {
        query = query.lt("created_at", beforeEntry.created_at);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching activity:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      has_more: data && data.length === limit,
      next_cursor: data && data.length > 0 ? data[data.length - 1].id : null,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/activity - Log an activity (for internal use)
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

    // Validate the request body
    const validationResult = CreateActivitySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { workspace_id } = validationResult.data;

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Insert activity
    const { data, error } = await supabase
      .from("workspace_activity")
      .insert({
        ...validationResult.data,
        user_id: user.id,
      })
      .select(
        `
        *,
        user:profiles!workspace_activity_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error creating activity:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

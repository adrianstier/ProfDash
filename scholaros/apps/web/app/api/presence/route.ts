import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdatePresenceSchema } from "@scholaros/shared";

// GET /api/presence - Get presence for workspace members
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

    // Get presence for all workspace members
    const { data, error } = await supabase
      .from("user_presence")
      .select(
        `
        *,
        user:profiles!user_presence_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error fetching presence:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/presence - Update own presence
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
    const { workspace_id, ...presenceData } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Validate the presence data
    const validationResult = UpdatePresenceSchema.safeParse(presenceData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

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

    // Upsert presence
    const { data, error } = await supabase
      .from("user_presence")
      .upsert(
        {
          user_id: user.id,
          workspace_id,
          ...validationResult.data,
          last_seen: new Date().toISOString(),
          last_active: new Date().toISOString(),
        },
        {
          onConflict: "user_id,workspace_id",
        }
      )
      .select(
        `
        *,
        user:profiles!user_presence_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error updating presence:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/presence - Update typing status quickly
export async function PATCH(request: Request) {
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
    const { workspace_id, is_typing, typing_in_conversation } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Quick update for typing status
    const { error } = await supabase
      .from("user_presence")
      .upsert(
        {
          user_id: user.id,
          workspace_id,
          is_typing: is_typing || false,
          typing_in_conversation: typing_in_conversation || null,
          last_seen: new Date().toISOString(),
          status: "online",
        },
        {
          onConflict: "user_id,workspace_id",
        }
      );

    if (error) {
      console.error("Error updating typing status:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

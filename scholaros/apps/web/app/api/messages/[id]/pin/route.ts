import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/messages/[id]/pin - Pin a message
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the message
    const { data: message, error: fetchError } = await supabase
      .from("workspace_messages")
      .select("workspace_id")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", message.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to pin messages in this workspace" },
        { status: 403 }
      );
    }

    // Pin the message
    const { data, error } = await supabase
      .from("workspace_messages")
      .update({
        is_pinned: true,
        pinned_by: user.id,
        pinned_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error pinning message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("workspace_activity").insert({
      workspace_id: message.workspace_id,
      user_id: user.id,
      action: "message_pinned",
      message_id: id,
      entity_title: data.text.substring(0, 50),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/[id]/pin - Unpin a message
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the message
    const { data: message, error: fetchError } = await supabase
      .from("workspace_messages")
      .select("workspace_id")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", message.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to unpin messages in this workspace" },
        { status: 403 }
      );
    }

    // Unpin the message
    const { data, error } = await supabase
      .from("workspace_messages")
      .update({
        is_pinned: false,
        pinned_by: null,
        pinned_at: null,
      })
      .eq("id", id)
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error unpinning message:", error);
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

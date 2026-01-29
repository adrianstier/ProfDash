import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/messages/[id]/read - Mark a message as read
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
      .select("workspace_id, read_by")
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
        { error: "Not authorized to access this message" },
        { status: 403 }
      );
    }

    // Add user to read_by if not already present
    const currentReadBy = message.read_by || [];
    if (!currentReadBy.includes(user.id)) {
      const newReadBy = [...currentReadBy, user.id];

      const { error } = await supabase
        .from("workspace_messages")
        .update({ read_by: newReadBy })
        .eq("id", id);

      if (error) {
        console.error("Error marking message as read:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
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

// Mark multiple messages as read
export async function PUT(request: Request) {
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
    const { message_ids } = body;

    if (!Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json(
        { error: "message_ids array is required" },
        { status: 400 }
      );
    }

    // Get all messages
    const { data: messages, error: fetchError } = await supabase
      .from("workspace_messages")
      .select("id, workspace_id, read_by")
      .in("id", message_ids);

    if (fetchError) {
      console.error("Error fetching messages:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages found" }, { status: 404 });
    }

    // Verify user has access to all messages' workspaces
    const workspaceIds = [...new Set(messages.map((m) => m.workspace_id))];
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .in("workspace_id", workspaceIds);

    const memberWorkspaceIds = new Set(memberships?.map((m) => m.workspace_id) || []);
    const unauthorizedMessages = messages.filter((m) => !memberWorkspaceIds.has(m.workspace_id));

    if (unauthorizedMessages.length > 0) {
      return NextResponse.json(
        { error: "Not authorized to access some messages" },
        { status: 403 }
      );
    }

    // Update each message that doesn't already have user in read_by
    const updates = messages
      .filter((m) => !(m.read_by || []).includes(user.id))
      .map((m) => ({
        id: m.id,
        read_by: [...(m.read_by || []), user.id],
      }));

    if (updates.length > 0) {
      // Use upsert to update multiple rows
      for (const update of updates) {
        await supabase
          .from("workspace_messages")
          .update({ read_by: update.read_by })
          .eq("id", update.id);
      }
    }

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

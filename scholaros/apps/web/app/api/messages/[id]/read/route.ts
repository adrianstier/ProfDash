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

    // Verify user has access to the message's workspace
    const { data: message, error: fetchError } = await supabase
      .from("workspace_messages")
      .select("workspace_id")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

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

    // Atomically mark as read via Postgres function (no read-modify-write race)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "mark_message_read",
      {
        p_message_id: id,
        p_user_id: user.id,
      }
    );

    if (rpcError) {
      console.error("Error marking message as read:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
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

    // Get all messages to verify workspace access
    const { data: messages, error: fetchError } = await supabase
      .from("workspace_messages")
      .select("id, workspace_id")
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

    // Atomically mark each message as read via Postgres function
    let updated = 0;
    for (const msg of messages) {
      const { error: rpcError } = await supabase.rpc("mark_message_read", {
        p_message_id: msg.id,
        p_user_id: user.id,
      });

      if (rpcError) {
        console.error(`Error marking message ${msg.id} as read:`, rpcError);
      } else {
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

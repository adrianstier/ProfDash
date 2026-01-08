import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateMessageSchema } from "@scholaros/shared";

// Pagination defaults
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// GET /api/messages - Fetch messages for a workspace or DM conversation
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
    const recipientId = searchParams.get("recipient_id"); // null for workspace chat, user_id for DM
    const taskId = searchParams.get("task_id"); // Optional: filter by related task
    const projectId = searchParams.get("project_id"); // Optional: filter by related project
    const pinnedOnly = searchParams.get("pinned") === "true";
    const before = searchParams.get("before"); // Cursor for pagination (message ID)

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

    // Verify user is a member of the workspace
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
      .from("workspace_messages")
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_fkey(id, full_name, avatar_url),
        reply_to_user:profiles!workspace_messages_reply_to_user_id_fkey(id, full_name)
      `
      )
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by conversation type (workspace or DM)
    if (recipientId) {
      // DM conversation: messages between current user and recipient
      query = query.or(
        `and(user_id.eq.${user.id},recipient_id.eq.${recipientId}),and(user_id.eq.${recipientId},recipient_id.eq.${user.id})`
      );
    } else {
      // Workspace chat: messages with no recipient
      query = query.is("recipient_id", null);
    }

    // Optional filters
    if (taskId) {
      query = query.eq("related_task_id", taskId);
    }

    if (projectId) {
      query = query.eq("related_project_id", projectId);
    }

    if (pinnedOnly) {
      query = query.eq("is_pinned", true);
    }

    // Cursor-based pagination (for infinite scroll)
    if (before) {
      const { data: beforeMessage } = await supabase
        .from("workspace_messages")
        .select("created_at")
        .eq("id", before)
        .single();

      if (beforeMessage) {
        query = query.lt("created_at", beforeMessage.created_at);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return messages in chronological order (oldest first) for display
    const sortedMessages = (data || []).reverse();

    return NextResponse.json({
      data: sortedMessages,
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

// POST /api/messages - Send a new message
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
    const validationResult = CreateMessageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { workspace_id, text, recipient_id, related_task_id, related_project_id, reply_to_id, mentions } =
      validationResult.data;

    // Verify user is a member of the workspace
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

    // If replying, get the parent message preview
    let replyToPreview = null;
    let replyToUserId = null;
    if (reply_to_id) {
      const { data: parentMessage } = await supabase
        .from("workspace_messages")
        .select("text, user_id")
        .eq("id", reply_to_id)
        .single();

      if (parentMessage) {
        replyToPreview = parentMessage.text.substring(0, 100);
        replyToUserId = parentMessage.user_id;
      }
    }

    // Insert the message
    const { data, error } = await supabase
      .from("workspace_messages")
      .insert({
        workspace_id,
        user_id: user.id,
        text,
        recipient_id: recipient_id || null,
        related_task_id: related_task_id || null,
        related_project_id: related_project_id || null,
        reply_to_id: reply_to_id || null,
        reply_to_preview: replyToPreview,
        reply_to_user_id: replyToUserId,
        mentions: mentions || [],
        read_by: [user.id], // Mark as read by sender
      })
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_fkey(id, full_name, avatar_url),
        reply_to_user:profiles!workspace_messages_reply_to_user_id_fkey(id, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error creating message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("workspace_activity").insert({
      workspace_id,
      user_id: user.id,
      action: "message_sent",
      message_id: data.id,
      entity_title: text.substring(0, 50),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

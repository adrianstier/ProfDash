import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdateMessageSchema } from "@scholaros/shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/messages/[id] - Get a single message
export async function GET(request: Request, { params }: RouteParams) {
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

    const { data, error } = await supabase
      .from("workspace_messages")
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_profiles_fkey(id, full_name, avatar_url),
        reply_to_user:profiles!workspace_messages_reply_to_user_id_profiles_fkey(id, full_name)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify user has access (is member of workspace)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", data.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not authorized to view this message" },
        { status: 403 }
      );
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

// PATCH /api/messages/[id] - Edit a message
export async function PATCH(request: Request, { params }: RouteParams) {
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

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateMessageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Check if message exists and user owns it
    const { data: existingMessage } = await supabase
      .from("workspace_messages")
      .select("user_id, workspace_id")
      .eq("id", id)
      .single();

    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMessage.user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the author can edit this message" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (validationResult.data.text !== undefined) {
      updateData.text = validationResult.data.text;
      updateData.edited_at = new Date().toISOString();
    }

    if (validationResult.data.is_pinned !== undefined) {
      updateData.is_pinned = validationResult.data.is_pinned;
      if (validationResult.data.is_pinned) {
        updateData.pinned_by = user.id;
        updateData.pinned_at = new Date().toISOString();
      } else {
        updateData.pinned_by = null;
        updateData.pinned_at = null;
      }
    }

    const { data, error } = await supabase
      .from("workspace_messages")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_profiles_fkey(id, full_name, avatar_url),
        reply_to_user:profiles!workspace_messages_reply_to_user_id_profiles_fkey(id, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error updating message:", error);
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

// DELETE /api/messages/[id] - Soft delete a message
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

    // Check if message exists and user owns it
    const { data: existingMessage } = await supabase
      .from("workspace_messages")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMessage.user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the author can delete this message" },
        { status: 403 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from("workspace_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting message:", error);
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

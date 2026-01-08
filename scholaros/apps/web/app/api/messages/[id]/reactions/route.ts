import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AddReactionSchema } from "@scholaros/shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/messages/[id]/reactions - Add a reaction to a message
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

    const body = await request.json();

    // Validate the request body
    const validationResult = AddReactionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { reaction } = validationResult.data;

    // Get the message and verify access
    const { data: message, error: fetchError } = await supabase
      .from("workspace_messages")
      .select("workspace_id, reactions")
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
        { error: "Not authorized to react to this message" },
        { status: 403 }
      );
    }

    // Update reactions array
    const currentReactions = (message.reactions || []) as Array<{
      user_id: string;
      reaction: string;
      created_at: string;
    }>;

    // Remove existing reaction from this user (if any) to toggle/replace
    const filteredReactions = currentReactions.filter(
      (r) => r.user_id !== user.id
    );

    // Check if user is toggling off the same reaction
    const existingReaction = currentReactions.find(
      (r) => r.user_id === user.id && r.reaction === reaction
    );

    let newReactions;
    if (existingReaction) {
      // Toggle off - just use filtered reactions (removes the reaction)
      newReactions = filteredReactions;
    } else {
      // Add new reaction
      newReactions = [
        ...filteredReactions,
        {
          user_id: user.id,
          reaction,
          created_at: new Date().toISOString(),
        },
      ];
    }

    const { data, error } = await supabase
      .from("workspace_messages")
      .update({ reactions: newReactions })
      .eq("id", id)
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error updating reactions:", error);
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

// DELETE /api/messages/[id]/reactions - Remove a reaction from a message
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
      .select("workspace_id, reactions")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Remove all reactions from this user
    const currentReactions = (message.reactions || []) as Array<{
      user_id: string;
      reaction: string;
      created_at: string;
    }>;
    const newReactions = currentReactions.filter((r) => r.user_id !== user.id);

    const { data, error } = await supabase
      .from("workspace_messages")
      .update({ reactions: newReactions })
      .eq("id", id)
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error removing reactions:", error);
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

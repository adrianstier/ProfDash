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
        { error: "Not authorized to react to this message" },
        { status: 403 }
      );
    }

    // Atomically add reaction via Postgres function (no read-modify-write race)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "add_message_reaction",
      {
        p_message_id: id,
        p_user_id: user.id,
        p_reaction: reaction,
      }
    );

    if (rpcError) {
      console.error("Error adding reaction:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // Re-fetch the full message with user profile for the response
    const { data, error } = await supabase
      .from("workspace_messages")
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_profiles_fkey(id, full_name, avatar_url)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching updated message:", error);
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
        { error: "Not authorized to modify reactions on this message" },
        { status: 403 }
      );
    }

    // Atomically remove all reactions by this user via Postgres function
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "remove_all_user_reactions",
      {
        p_message_id: id,
        p_user_id: user.id,
      }
    );

    if (rpcError) {
      console.error("Error removing reactions:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // Re-fetch the full message with user profile for the response
    const { data, error } = await supabase
      .from("workspace_messages")
      .select(
        `
        *,
        user:profiles!workspace_messages_user_id_profiles_fkey(id, full_name, avatar_url)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching updated message:", error);
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

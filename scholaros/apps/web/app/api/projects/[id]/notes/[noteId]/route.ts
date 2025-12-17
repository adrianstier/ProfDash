import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdateProjectNoteSchema } from "@scholaros/shared";

// PATCH /api/projects/[id]/notes/[noteId] - Update a note
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateProjectNoteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Users can only update their own notes (enforced by RLS)
    const { data, error } = await supabase
      .from("project_notes")
      .update(validationResult.data)
      .eq("id", noteId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating note:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Note not found or not authorized" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/notes/[noteId] - Delete a note
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Users can only delete their own notes (enforced by RLS)
    const { error } = await supabase
      .from("project_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting note:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

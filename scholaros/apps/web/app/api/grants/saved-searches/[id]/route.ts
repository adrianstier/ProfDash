import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWorkspaceMembership } from "@/lib/auth/workspace";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up the saved search to get workspace_id
    const { data: savedSearch } = await supabase
      .from("saved_searches")
      .select("workspace_id")
      .eq("id", id)
      .single();

    if (!savedSearch) {
      return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
    }

    // Verify workspace membership
    const membership = await verifyWorkspaceMembership(supabase, user.id, savedSearch.workspace_id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete saved search
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete saved search error:", error);
      return NextResponse.json({ error: "Failed to delete saved search" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Saved search delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

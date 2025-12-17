import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/members - List workspace members
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a member of this workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Fetch all members with their profiles
    const { data: members, error } = await supabase
      .from("workspace_members")
      .select(`
        id,
        workspace_id,
        user_id,
        role,
        invited_by,
        joined_at,
        profile:profiles (
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("workspace_id", id)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

const UpdateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "member", "limited"]),
});

// PATCH /api/workspaces/[id]/members/[memberId] - Update member role
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is owner
    const { data: currentMembership, error: currentError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    if (currentError || !currentMembership || currentMembership.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = UpdateMemberSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Don't allow changing own role
    const { data: targetMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("id", memberId)
      .single();

    if (targetMember?.user_id === user.id) {
      return NextResponse.json({ error: "Cannot change own role" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .update({ role: validationResult.data.role })
      .eq("id", memberId)
      .eq("workspace_id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating member:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get target member info
    const { data: targetMember, error: targetError } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("id", memberId)
      .eq("workspace_id", id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if current user is owner (can remove anyone except themselves)
    // Or if user is removing themselves (can leave if not only owner)
    const { data: currentMembership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    const isOwner = currentMembership?.role === "owner";
    const isRemovingSelf = targetMember.user_id === user.id;

    if (!isOwner && !isRemovingSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If removing self as owner, check if there's another owner
    if (isRemovingSelf && targetMember.role === "owner") {
      const { count } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", id)
        .eq("role", "owner");

      if (count && count <= 1) {
        return NextResponse.json(
          { error: "Cannot leave workspace as the only owner. Transfer ownership first." },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId)
      .eq("workspace_id", id);

    if (error) {
      console.error("Error removing member:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

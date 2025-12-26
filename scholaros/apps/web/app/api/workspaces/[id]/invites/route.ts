import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "limited"]), // Can't invite as owner
});

// GET /api/workspaces/[id]/invites - List pending invites
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner or admin
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: invites, error } = await supabase
      .from("workspace_invites")
      .select("id, workspace_id, email, role, invited_by, expires_at, created_at")
      .eq("workspace_id", id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invites:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Never expose tokens in list response
    return NextResponse.json(invites);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/invites - Create new invite
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner or admin
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = CreateInviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // Check if user is already a member
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", id)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this workspace" },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from("workspace_invites")
      .select("id")
      .eq("workspace_id", id)
      .eq("email", email)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invite is already pending for this email" },
        { status: 409 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: invite, error } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_id: id,
        email,
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invite:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Send email with invite link using a service like Resend or SendGrid
    // Example: await sendInviteEmail(email, token, workspace.name);

    // Return invite without exposing the token for security
    // The token is stored in DB and used when recipient clicks the invite link
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { token: _token, ...safeInvite } = invite;
    return NextResponse.json({
      ...safeInvite,
      message: "Invite created. Email sending is pending implementation.",
    }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

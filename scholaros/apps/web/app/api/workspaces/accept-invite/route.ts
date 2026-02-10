import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
});

// POST /api/workspaces/accept-invite - Accept a workspace invite
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = AcceptInviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;

    // Look up the invite to verify email match before accepting
    // We need to query as the service role or use RPC since the user may not have
    // SELECT access to workspace_invites. Instead, we verify via the safe RPC function
    // which checks email match at the database level. We also add an application-level
    // check for defense in depth.

    // Verify user email is available
    if (!user.email) {
      return NextResponse.json(
        { error: "User email not available for verification" },
        { status: 400 }
      );
    }

    // Use the safe RPC function that verifies email match
    const { data: result, error } = await supabase.rpc("accept_workspace_invite_safe", {
      invite_token: token,
      accepting_user_id: user.id,
    });

    if (error) {
      console.error("Error accepting invite:", error);

      // The RPC function raises an exception when email doesn't match
      if (error.message?.includes("Email does not match invitation")) {
        return NextResponse.json(
          { error: "Email does not match invitation" },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      workspace_id: result.workspace_id,
      role: result.role,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

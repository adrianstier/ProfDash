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

    // Use the RPC function to accept invite
    const { data: result, error } = await supabase.rpc("accept_workspace_invite", {
      invite_token: token,
    });

    if (error) {
      console.error("Error accepting invite:", error);
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

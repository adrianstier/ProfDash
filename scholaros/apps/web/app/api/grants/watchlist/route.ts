import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWorkspaceMembership } from "@/lib/auth/workspace";
import { z } from "zod";

const AddToWatchlistSchema = z.object({
  workspace_id: z.string().uuid(),
  opportunity_id: z.string().uuid(),
  notes: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workspace_id from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const membership = await verifyWorkspaceMembership(supabase, user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch watchlist with opportunity details
    const { data, error } = await supabase
      .from("opportunity_watchlist")
      .select(`
        *,
        opportunity:funding_opportunities(*)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch watchlist error:", error);
      return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Watchlist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = AddToWatchlistSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { workspace_id, opportunity_id, notes, priority } = validationResult.data;

    // Verify workspace membership
    const membership = await verifyWorkspaceMembership(supabase, user.id, workspace_id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if already in watchlist
    const { data: existing } = await supabase
      .from("opportunity_watchlist")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("opportunity_id", opportunity_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Opportunity already in watchlist" },
        { status: 409 }
      );
    }

    // Insert watchlist item
    const { data, error } = await supabase
      .from("opportunity_watchlist")
      .insert({
        workspace_id,
        opportunity_id,
        notes,
        priority,
        status: "watching",
        created_by: user.id,
      })
      .select(`
        *,
        opportunity:funding_opportunities(*)
      `)
      .single();

    if (error) {
      console.error("Add to watchlist error:", error);
      return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Watchlist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

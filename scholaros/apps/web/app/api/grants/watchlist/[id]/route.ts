import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateWatchlistSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(["watching", "applying", "submitted", "awarded", "declined", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  fit_score: z.number().min(0).max(100).optional(),
  internal_deadline: z.string().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export async function PATCH(
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

    // Parse and validate body
    const body = await request.json();
    const validationResult = UpdateWatchlistSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Update watchlist item
    const { data, error } = await supabase
      .from("opportunity_watchlist")
      .update(validationResult.data)
      .eq("id", id)
      .select(`
        *,
        opportunity:funding_opportunities(*)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Watchlist item not found" }, { status: 404 });
      }
      console.error("Update watchlist error:", error);
      return NextResponse.json({ error: "Failed to update watchlist item" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Watchlist update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // Delete watchlist item
    const { error } = await supabase
      .from("opportunity_watchlist")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete watchlist error:", error);
      return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Watchlist delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

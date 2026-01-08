import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateOpportunitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  agency: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  amount_min: z.number().optional().nullable(),
  amount_max: z.number().optional().nullable(),
  eligibility: z.record(z.unknown()).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal("")),
  // For watchlist integration
  workspace_id: z.string().uuid().optional(),
  add_to_watchlist: z.boolean().optional().default(false),
  notes: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

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
    const validationResult = CreateOpportunitySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title,
      agency,
      description,
      deadline,
      amount_min,
      amount_max,
      eligibility,
      url,
      workspace_id,
      add_to_watchlist,
      notes,
      priority,
    } = validationResult.data;

    // Create the funding opportunity
    const { data: opportunity, error: createError } = await supabase
      .from("funding_opportunities")
      .insert({
        title,
        source: "custom", // Mark as user-created
        agency,
        description,
        deadline: deadline || null,
        amount_min,
        amount_max,
        eligibility,
        url: url || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Create opportunity error:", createError);
      return NextResponse.json(
        { error: "Failed to create opportunity" },
        { status: 500 }
      );
    }

    // If requested, also add to watchlist
    if (add_to_watchlist && workspace_id) {
      const { error: watchlistError } = await supabase
        .from("opportunity_watchlist")
        .insert({
          workspace_id,
          opportunity_id: opportunity.id,
          notes,
          priority,
          status: "watching",
          created_by: user.id,
        });

      if (watchlistError) {
        console.error("Add to watchlist error:", watchlistError);
        // Don't fail the whole request, just log the error
        // The opportunity was created successfully
      }
    }

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error("Create opportunity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

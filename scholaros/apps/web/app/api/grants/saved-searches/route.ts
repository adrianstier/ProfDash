import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const GrantSearchQuerySchema = z.object({
  keywords: z.string().optional(),
  agency: z.string().optional(),
  funding_type: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
  deadline_from: z.string().optional(),
  deadline_to: z.string().optional(),
  cfda_number: z.string().optional(),
});

const CreateSavedSearchSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  query: GrantSearchQuerySchema,
  alert_frequency: z.enum(["daily", "weekly", "monthly", "none"]).default("none"),
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

    // Fetch saved searches
    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch saved searches error:", error);
      return NextResponse.json({ error: "Failed to fetch saved searches" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Saved searches error:", error);
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
    const validationResult = CreateSavedSearchSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { workspace_id, name, description, query, alert_frequency } = validationResult.data;

    // Insert saved search
    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        workspace_id,
        name,
        description,
        query,
        alert_frequency,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create saved search error:", error);
      return NextResponse.json({ error: "Failed to save search" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Saved search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

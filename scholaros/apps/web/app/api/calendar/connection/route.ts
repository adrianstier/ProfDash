import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/calendar/connection - Get current calendar connection status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: connection, error } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
      console.error("Error fetching calendar connection:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Don't expose tokens to client
    return NextResponse.json({
      connected: true,
      provider: connection.provider,
      sync_enabled: connection.sync_enabled,
      selected_calendars: connection.selected_calendars,
      last_sync_at: connection.last_sync_at,
      created_at: connection.created_at,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/calendar/connection - Update calendar connection settings
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sync_enabled, selected_calendars } = body;

    const updates: Record<string, unknown> = {};
    if (typeof sync_enabled === "boolean") {
      updates.sync_enabled = sync_enabled;
    }
    if (Array.isArray(selected_calendars)) {
      updates.selected_calendars = selected_calendars;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("calendar_connections")
      .update(updates)
      .eq("user_id", user.id)
      .eq("provider", "google")
      .select()
      .single();

    if (error) {
      console.error("Error updating calendar connection:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      connected: true,
      provider: data.provider,
      sync_enabled: data.sync_enabled,
      selected_calendars: data.selected_calendars,
      last_sync_at: data.last_sync_at,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

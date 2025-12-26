import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = env.GOOGLE_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

// Scopes needed for calendar read access
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
].join(" ");

// GET /api/auth/google - Initiate Google OAuth flow
export async function GET() {
  try {
    // Validate required OAuth configuration
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate state token for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString("base64");

    // Build Google OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/auth/google - Disconnect Google Calendar
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the calendar connection
    const { error } = await supabase
      .from("calendar_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google");

    if (error) {
      console.error("Error disconnecting Google:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also delete cached events
    await supabase
      .from("calendar_events_cache")
      .delete()
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Google:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

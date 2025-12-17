import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

interface GoogleCalendarListResponse {
  items: GoogleCalendar[];
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

// GET /api/calendar/calendars - List available calendars
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get calendar connection
    const { data: connection, error: connError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: "No calendar connected" }, { status: 404 });
    }

    let accessToken = connection.access_token_encrypted;

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      if (connection.refresh_token_encrypted) {
        const newToken = await refreshAccessToken(connection.refresh_token_encrypted);
        if (newToken) {
          accessToken = newToken;
          await supabase
            .from("calendar_connections")
            .update({
              access_token_encrypted: newToken,
              token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            })
            .eq("id", connection.id);
        } else {
          return NextResponse.json({ error: "Failed to refresh token" }, { status: 401 });
        }
      }
    }

    // Fetch calendar list from Google
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Google Calendar API error:", await response.text());
      return NextResponse.json({ error: "Failed to fetch calendars" }, { status: response.status });
    }

    const data: GoogleCalendarListResponse = await response.json();

    // Transform and return calendars with selection status
    const calendars = data.items.map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      selected: connection.selected_calendars?.includes(cal.id) || false,
    }));

    return NextResponse.json(calendars);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

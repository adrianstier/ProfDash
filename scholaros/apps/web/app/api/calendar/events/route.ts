import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status?: string;
}

interface GoogleEventsResponse {
  items: GoogleEvent[];
  nextPageToken?: string;
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
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

// GET /api/calendar/events - Fetch calendar events
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const refresh = searchParams.get("refresh") === "true";

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

    if (!connection.sync_enabled) {
      return NextResponse.json({ error: "Calendar sync is disabled" }, { status: 400 });
    }

    // If not refreshing and we have cached events, return those
    if (!refresh) {
      let query = supabase
        .from("calendar_events_cache")
        .select("*")
        .eq("user_id", user.id);

      if (startDate) {
        query = query.gte("start_time", startDate);
      }
      if (endDate) {
        query = query.lte("end_time", endDate);
      }

      const { data: cachedEvents, error: cacheError } = await query.order("start_time", { ascending: true });

      if (!cacheError && cachedEvents && cachedEvents.length > 0) {
        return NextResponse.json(cachedEvents);
      }
    }

    // Fetch fresh events from Google
    let accessToken = connection.access_token_encrypted;

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      if (connection.refresh_token_encrypted) {
        const newToken = await refreshAccessToken(connection.refresh_token_encrypted);
        if (newToken) {
          accessToken = newToken;
          // Update stored token
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
      } else {
        return NextResponse.json({ error: "Token expired and no refresh token" }, { status: 401 });
      }
    }

    // Build Google Calendar API URL
    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");
    calendarUrl.searchParams.set("maxResults", "250");

    if (startDate) {
      calendarUrl.searchParams.set("timeMin", new Date(startDate).toISOString());
    } else {
      // Default to events from today
      calendarUrl.searchParams.set("timeMin", new Date().toISOString());
    }

    if (endDate) {
      calendarUrl.searchParams.set("timeMax", new Date(endDate).toISOString());
    } else {
      // Default to 30 days ahead
      const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      calendarUrl.searchParams.set("timeMax", thirtyDaysAhead.toISOString());
    }

    const eventsResponse = await fetch(calendarUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error("Google Calendar API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: eventsResponse.status });
    }

    const eventsData: GoogleEventsResponse = await eventsResponse.json();

    // Transform and cache events
    const events = eventsData.items.map((event) => {
      const isAllDay = !event.start.dateTime;
      return {
        user_id: user.id,
        external_id: event.id,
        calendar_id: "primary",
        summary: event.summary || null,
        description: event.description || null,
        location: event.location || null,
        start_time: event.start.dateTime || `${event.start.date}T00:00:00Z`,
        end_time: event.end.dateTime || `${event.end.date}T23:59:59Z`,
        all_day: isAllDay,
        status: event.status || "confirmed",
        raw_data: event,
        synced_at: new Date().toISOString(),
      };
    });

    // Upsert events to cache
    if (events.length > 0) {
      const { error: upsertError } = await supabase
        .from("calendar_events_cache")
        .upsert(events, {
          onConflict: "user_id,external_id",
        });

      if (upsertError) {
        console.error("Error caching events:", upsertError);
      }
    }

    // Update last sync time
    await supabase
      .from("calendar_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return NextResponse.json(events);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/crypto";

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;

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

async function refreshAccessToken(encryptedRefreshToken: string): Promise<string | null> {
  try {
    // Decrypt refresh token for API call
    const refreshToken = decryptToken(encryptedRefreshToken);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
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
    const pageToken = searchParams.get("pageToken");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

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

      const { data: cachedEvents, error: cacheError } = await query
        .order("start_time", { ascending: true })
        .limit(limit);

      if (!cacheError && cachedEvents && cachedEvents.length > 0) {
        return NextResponse.json({
          data: cachedEvents,
          pagination: {
            nextPageToken: null,
            hasMore: false,
            count: cachedEvents.length,
            source: "cache",
          },
        });
      }
    }

    // Fetch fresh events from Google - decrypt token for API call
    let accessToken = decryptToken(connection.access_token_encrypted);

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      if (connection.refresh_token_encrypted) {
        const newToken = await refreshAccessToken(connection.refresh_token_encrypted);
        if (newToken) {
          accessToken = newToken;
          // Encrypt new token before storing
          const encryptedNewToken = encryptToken(newToken);
          await supabase
            .from("calendar_connections")
            .update({
              access_token_encrypted: encryptedNewToken,
              token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            })
            .eq("id", connection.id);
        } else {
          // Token refresh failed - clear the connection to force re-auth
          await supabase
            .from("calendar_connections")
            .delete()
            .eq("id", connection.id);
          return NextResponse.json({ error: "Token expired. Please reconnect your calendar." }, { status: 401 });
        }
      } else {
        // No refresh token - clear the connection
        await supabase
          .from("calendar_connections")
          .delete()
          .eq("id", connection.id);
        return NextResponse.json({ error: "Token expired. Please reconnect your calendar." }, { status: 401 });
      }
    }

    // Build Google Calendar API URL with pagination support
    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");
    calendarUrl.searchParams.set("maxResults", String(limit));

    // Support pagination via pageToken from Google
    if (pageToken) {
      calendarUrl.searchParams.set("pageToken", pageToken);
    }

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

    // Return paginated response
    return NextResponse.json({
      data: events,
      pagination: {
        nextPageToken: eventsData.nextPageToken || null,
        hasMore: !!eventsData.nextPageToken,
        count: events.length,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

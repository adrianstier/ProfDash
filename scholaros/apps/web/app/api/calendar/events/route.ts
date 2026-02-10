import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { z } from "zod";

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;

// Zod schemas for Google Calendar API response validation
const GoogleEventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
  }),
  status: z.string().optional(),
});

const GoogleEventsResponseSchema = z.object({
  items: z.array(GoogleEventSchema).default([]),
  nextPageToken: z.string().optional(),
});

// Types inferred from schemas
export type GoogleEvent = z.infer<typeof GoogleEventSchema>;
export type GoogleEventsResponse = z.infer<typeof GoogleEventsResponseSchema>;

interface RefreshTokenResult {
  accessToken: string;
  expiresIn: number;
}

/**
 * Refresh OAuth access token using refresh token
 * Returns new access token and expiry time
 */
async function refreshAccessToken(encryptedRefreshToken: string): Promise<RefreshTokenResult | null> {
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
      const errorText = await response.text();
      console.error("Failed to refresh token:", errorText);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600, // Default to 1 hour
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

/**
 * Fetch with exponential backoff retry for rate limiting
 * Handles Google Calendar API 429 responses
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If rate limited (429), wait and retry with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "1", 10);
        const waitTime = Math.min(retryAfter * 1000, Math.pow(2, attempt) * 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
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
      return NextResponse.json({
        error: "No calendar connected",
        message: "Connect your Google Calendar in Settings to see events.",
        needsConnection: true,
      }, { status: 404 });
    }

    if (!connection.sync_enabled) {
      return NextResponse.json({
        error: "Calendar sync disabled",
        message: "Enable calendar sync in Settings to see events.",
      }, { status: 400 });
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
          syncStatus: {
            lastSyncAt: connection.last_sync_at,
            isHealthy: true,
          },
        });
      }
    }

    // Fetch fresh events from Google - decrypt token for API call
    let accessToken = decryptToken(connection.access_token_encrypted);

    // Check if token is expired OR will expire within 5 minutes (proactive refresh)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const needsRefresh = !tokenExpiresAt || tokenExpiresAt < fiveMinutesFromNow;

    if (needsRefresh) {
      if (connection.refresh_token_encrypted) {
        // Attempt refresh up to 2 times before giving up
        let refreshResult: RefreshTokenResult | null = null;
        const maxRefreshAttempts = 2;

        for (let attempt = 1; attempt <= maxRefreshAttempts; attempt++) {
          refreshResult = await refreshAccessToken(connection.refresh_token_encrypted);
          if (refreshResult) break;
          if (attempt < maxRefreshAttempts) {
            // Wait 1 second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.warn(`Token refresh attempt ${attempt} failed, retrying...`);
          }
        }

        if (refreshResult) {
          accessToken = refreshResult.accessToken;
          // Encrypt new token before storing
          const encryptedNewToken = encryptToken(refreshResult.accessToken);
          const newExpiresAt = new Date(Date.now() + refreshResult.expiresIn * 1000);

          const { error: updateError } = await supabase
            .from("calendar_connections")
            .update({
              access_token_encrypted: encryptedNewToken,
              token_expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", connection.id);

          if (updateError) {
            console.error("Failed to update refreshed token:", updateError);
          }
        } else {
          // Token refresh failed after retries - return error without deleting connection
          console.error(`Token refresh failed after ${maxRefreshAttempts} attempts`);

          return NextResponse.json({
            error: "Calendar token refresh failed",
            message: "Unable to refresh your Google Calendar connection. Please try again, or reconnect in Settings → Integrations if the issue persists.",
            needsReconnect: true,
          }, { status: 401 });
        }
      } else {
        // No refresh token available - return error without deleting connection
        console.error("No refresh token available for calendar connection");

        return NextResponse.json({
          error: "Calendar token expired",
          message: "Your Google Calendar connection is missing a refresh token. Please reconnect in Settings → Integrations.",
          needsReconnect: true,
        }, { status: 401 });
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

    // Fetch with retry logic for rate limiting
    const eventsResponse = await fetchWithRetry(calendarUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error("Google Calendar API error:", errorText);

      // Provide user-friendly error messages
      if (eventsResponse.status === 401) {
        // Unauthorized - token is invalid, suggest reconnection without deleting
        return NextResponse.json({
          error: "Calendar token invalid",
          message: "Your Google Calendar access token was rejected. Please try again, or reconnect in Settings → Integrations if the issue persists.",
          needsReconnect: true,
        }, { status: 401 });
      } else if (eventsResponse.status === 403) {
        return NextResponse.json({
          error: "Calendar permission denied",
          message: "ScholarOS doesn't have permission to access your calendar. Please reconnect with calendar permissions enabled.",
          needsReconnect: true,
        }, { status: 403 });
      } else if (eventsResponse.status === 429) {
        return NextResponse.json({
          error: "Rate limit exceeded",
          message: "Google Calendar rate limit exceeded. Please try again in a few minutes.",
          retryAfter: parseInt(eventsResponse.headers.get("Retry-After") || "60", 10),
        }, { status: 429 });
      }

      return NextResponse.json({
        error: "Failed to fetch calendar events",
        message: "Could not retrieve calendar events from Google. Please try again later.",
      }, { status: eventsResponse.status });
    }

    // Parse and validate events response
    const rawEventsData = await eventsResponse.json();
    const eventsValidation = GoogleEventsResponseSchema.safeParse(rawEventsData);

    if (!eventsValidation.success) {
      console.error("Invalid events response from Google:", eventsValidation.error.flatten());
      return NextResponse.json({
        error: "Invalid calendar response",
        message: "Received unexpected data format from Google Calendar.",
      }, { status: 502 });
    }

    const eventsData = eventsValidation.data;

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
    const now = new Date().toISOString();
    await supabase
      .from("calendar_connections")
      .update({ last_sync_at: now })
      .eq("id", connection.id);

    // Return paginated response with sync status
    return NextResponse.json({
      data: events,
      pagination: {
        nextPageToken: eventsData.nextPageToken || null,
        hasMore: !!eventsData.nextPageToken,
        count: events.length,
        source: "google",
      },
      syncStatus: {
        lastSyncAt: now,
        isHealthy: true,
        message: "Successfully synced calendar events",
      },
    });
  } catch (error) {
    console.error("Unexpected error in calendar events:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: "An unexpected error occurred while fetching calendar events. Please try again later.",
    }, { status: 500 });
  }
}

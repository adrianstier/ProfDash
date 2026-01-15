/**
 * Analytics Events API Route
 *
 * Receives batched analytics events from the client and stores them.
 *
 * POST /api/analytics/events
 * - Accepts batch of events (max 100)
 * - Validates event schema
 * - Stores in database or forwards to analytics service
 *
 * Rate limited to prevent abuse.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsEventBatchSchema } from "@scholaros/shared/schemas";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

// Rate limit config: 60 requests per minute for analytics
const analyticsRateLimitConfig = {
  limit: 60,
  windowMs: 60000,
};

export async function POST(request: Request) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`analytics:${user.id}`, analyticsRateLimitConfig);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retry_after: rateLimitResult.reset },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = AnalyticsEventBatchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid event data",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { events } = parseResult.data;

    // Validate all events belong to this user
    const invalidEvents = events.filter((event) => event.user_id !== user.id);
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: "Events must belong to authenticated user" },
        { status: 403 }
      );
    }

    // Store events
    // For MVP: Store in workspace_activity table as analytics events
    // In production: Would insert into dedicated analytics_events table
    const eventsToInsert = events.map((event) => ({
      id: event.event_id,
      user_id: event.user_id,
      workspace_id: event.workspace_id,
      event_name: event.event_name,
      session_id: event.session_id,
      properties: event.properties,
      metadata: event.metadata ?? {},
      platform: event.platform,
      viewport_width: event.viewport_width,
      created_at: event.timestamp,
    }));

    // Try to insert into analytics_events table if it exists
    // Otherwise, log and return success (graceful degradation)
    const { error: insertError } = await supabase
      .from("analytics_events")
      .insert(eventsToInsert);

    if (insertError) {
      // Table might not exist yet - log for monitoring
      console.log(
        `[Analytics] Received ${events.length} events from user ${user.id}`,
        {
          eventTypes: [...new Set(events.map((e) => e.event_name))],
          error: insertError.message,
        }
      );

      // Return success anyway - don't block the client
      return NextResponse.json({
        success: true,
        events_received: events.length,
        stored: false,
        message: "Events logged but not persisted (table not configured)",
      });
    }

    return NextResponse.json({
      success: true,
      events_received: events.length,
      stored: true,
    });
  } catch (error) {
    console.error("[Analytics] Event ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/events
 *
 * Retrieves analytics events for the current user (for debugging/admin)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("event_name");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("analytics_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventName) {
      query = query.eq("event_name", eventName);
    }

    const { data, error } = await query;

    if (error) {
      // Table might not exist
      return NextResponse.json({
        events: [],
        message: "Analytics events table not configured",
      });
    }

    return NextResponse.json({
      events: data,
      count: data.length,
      offset,
      limit,
    });
  } catch (error) {
    console.error("[Analytics] Event retrieval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Search History API Route
 *
 * Manages search history for personalization and analytics.
 *
 * GET /api/search/history
 * - Returns recent searches for the current user
 * - Supports workspace filtering
 * - Used for "recent searches" UI and ranking personalization
 *
 * POST /api/search/history
 * - Records a search query and optional selection
 * - Used for analytics and personalization
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SearchHistoryInsertSchema } from "@scholaros/shared/schemas";
import type { RecentSearch } from "@scholaros/shared/types";

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Verifies that a user is a member of the specified workspace.
 * Returns the user's role if they are a member, null otherwise.
 */
async function verifyWorkspaceMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

/**
 * GET /api/search/history
 *
 * Returns recent searches for the current user.
 *
 * Query params:
 * - workspace_id?: string - Filter by workspace
 * - limit?: number - Max results (default: 10, max: 50)
 * - selected_only?: boolean - Only return searches where user selected a result
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const selectedOnly = searchParams.get("selected_only") === "true";

    // Verify workspace membership if workspace_id is provided
    if (workspaceId) {
      const membership = await verifyWorkspaceMembership(supabase, user.id, workspaceId);
      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this workspace" },
          { status: 403 }
        );
      }
    }

    // Try to fetch from search_history table
    let query = supabase
      .from("search_history")
      .select("query, result_type, result_id, result_title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    if (selectedOnly) {
      query = query.eq("selected", true);
    }

    const { data, error } = await query;

    if (error) {
      // Table might not exist yet - return empty array gracefully
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          searches: [],
          message: "Search history not yet available",
        });
      }

      console.error("[SearchHistory] Error fetching history:", error);
      return NextResponse.json({ error: "Failed to fetch search history" }, { status: 500 });
    }

    // Deduplicate by query (keep most recent)
    const seenQueries = new Set<string>();
    const uniqueSearches: RecentSearch[] = [];

    for (const item of data || []) {
      const normalizedQuery = item.query.toLowerCase().trim();
      if (!seenQueries.has(normalizedQuery)) {
        seenQueries.add(normalizedQuery);
        uniqueSearches.push({
          query: item.query,
          result_type: item.result_type,
          result_id: item.result_id,
          result_title: item.result_title,
          last_searched_at: item.created_at,
        });
      }
    }

    return NextResponse.json({
      searches: uniqueSearches,
      count: uniqueSearches.length,
    });
  } catch (error) {
    console.error("[SearchHistory] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/search/history
 *
 * Records a search query and optional result selection.
 *
 * Request body:
 * - query: string - The search query
 * - workspace_id?: string - Current workspace
 * - result_type?: SearchResultType - Type of selected result
 * - result_id?: string - ID of selected result
 * - result_title?: string - Title of selected result
 * - source?: SearchSource - Where the search originated
 * - selected?: boolean - Whether a result was selected
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = SearchHistoryInsertSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const historyData = parseResult.data;

    // Verify workspace membership if workspace_id is provided
    if (historyData.workspace_id) {
      const membership = await verifyWorkspaceMembership(supabase, user.id, historyData.workspace_id);
      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this workspace" },
          { status: 403 }
        );
      }
    }

    // Insert into search_history table
    const { data, error } = await supabase
      .from("search_history")
      .insert({
        user_id: user.id,
        workspace_id: historyData.workspace_id || null,
        query: historyData.query,
        result_type: historyData.result_type || null,
        result_id: historyData.result_id || null,
        result_title: historyData.result_title || null,
        source: historyData.source,
        selected: historyData.selected,
      })
      .select()
      .single();

    if (error) {
      // Table might not exist yet - graceful degradation
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          stored: false,
          message: "Search logged but not persisted (table not configured)",
        });
      }

      console.error("[SearchHistory] Error inserting history:", error);
      return NextResponse.json({ error: "Failed to record search" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stored: true,
      id: data.id,
    });
  } catch (error) {
    console.error("[SearchHistory] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/search/history
 *
 * Clears search history for the current user.
 *
 * Query params:
 * - workspace_id?: string - Only clear history for specific workspace
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    // Verify workspace membership if workspace_id is provided
    if (workspaceId) {
      const membership = await verifyWorkspaceMembership(supabase, user.id, workspaceId);
      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this workspace" },
          { status: 403 }
        );
      }
    }

    let query = supabase.from("search_history").delete().eq("user_id", user.id);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { error, count } = await query;

    if (error) {
      // Table might not exist yet
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          deleted: 0,
          message: "No search history to clear",
        });
      }

      console.error("[SearchHistory] Error deleting history:", error);
      return NextResponse.json({ error: "Failed to clear search history" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: count || 0,
    });
  } catch (error) {
    console.error("[SearchHistory] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

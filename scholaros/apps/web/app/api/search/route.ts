/**
 * Global Search API Route
 *
 * Provides unified search across tasks, projects, grants, and publications
 * with ML-based ranking for Phase 9B Command Palette.
 *
 * GET /api/search?q=query&types=task,project&limit=10&workspace_id=uuid
 * - Searches across multiple entity types
 * - Applies personalized ranking based on user history
 * - Returns results grouped by type with relevance scores
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SearchQueryParamsSchema } from "@scholaros/shared/schemas";
import type { SearchResultType, SearchHistoryEntry } from "@scholaros/shared/types";
import {
  rankSearchResults,
  type SearchResult,
  type SearchContext,
} from "@/lib/search/search-ranking";

// Maximum results per entity type before ranking
const MAX_CANDIDATES_PER_TYPE = 50;

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Escapes SQL LIKE/ILIKE pattern special characters to prevent pattern injection.
 * Characters %, _, and \ have special meaning in LIKE patterns and must be escaped.
 */
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

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

interface SearchResultItem extends SearchResult {
  description?: string | null;
  status?: string;
  due?: string | null;
  category?: string;
  priority?: string;
}

interface GroupedSearchResults {
  tasks: SearchResultItem[];
  projects: SearchResultItem[];
  grants: SearchResultItem[];
  publications: SearchResultItem[];
  navigation: SearchResultItem[];
}

/**
 * GET /api/search
 *
 * Global search endpoint with ranking.
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      q: searchParams.get("q") || "",
      types: searchParams.get("types")?.split(",").filter(Boolean),
      limit: parseInt(searchParams.get("limit") || "10"),
      workspace_id: searchParams.get("workspace_id") || undefined,
    };

    const parseResult = SearchQueryParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { q: query, types, limit, workspace_id } = parseResult.data;

    // Verify workspace membership if workspace_id is provided
    if (workspace_id) {
      const membership = await verifyWorkspaceMembership(supabase, user.id, workspace_id);
      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this workspace" },
          { status: 403 }
        );
      }
    }

    // Escape LIKE pattern special characters to prevent pattern injection
    const safeQuery = escapeLikePattern(query);

    // Determine which types to search
    const searchTypes: SearchResultType[] = types?.length
      ? types
      : ["task", "project", "grant", "publication"];

    // Fetch user's search history for personalization
    const userHistory = await fetchUserSearchHistory(supabase, user.id, workspace_id);

    // Build search context
    const pageContext = searchParams.get("context") || "/today";
    const context: SearchContext = {
      pageContext,
      userHistory,
    };

    // Search each entity type in parallel
    // Note: safeQuery is used for database ILIKE patterns (escaped)
    // Note: query (original) is used for ranking algorithms (unescaped)
    const searchPromises: Promise<SearchResultItem[]>[] = [];

    if (searchTypes.includes("task")) {
      searchPromises.push(searchTasks(supabase, safeQuery, user.id, workspace_id));
    }
    if (searchTypes.includes("project")) {
      searchPromises.push(searchProjects(supabase, safeQuery, workspace_id));
    }
    if (searchTypes.includes("grant")) {
      searchPromises.push(searchGrants(supabase, safeQuery, workspace_id));
    }
    if (searchTypes.includes("publication")) {
      searchPromises.push(searchPublications(supabase, safeQuery, user.id, workspace_id));
    }

    const searchResults = await Promise.all(searchPromises);

    // Flatten and combine all results
    const allResults = searchResults.flat();

    // Apply ranking
    const rankedResults = rankSearchResults(allResults, query, context);

    // Take top results
    const topResults = rankedResults.slice(0, limit);

    // Group by type for response
    const grouped: GroupedSearchResults = {
      tasks: [],
      projects: [],
      grants: [],
      publications: [],
      navigation: [],
    };

    for (const item of topResults) {
      const typeKey = `${item.result.type}s` as keyof GroupedSearchResults;
      if (typeKey in grouped) {
        grouped[typeKey].push(item.result);
      }
    }

    return NextResponse.json({
      results: topResults.map((item) => ({
        ...item.result,
        _score: item.score,
        _features: item.features,
      })),
      grouped,
      total: allResults.length,
      query,
      limit,
    });
  } catch (error) {
    console.error("[Search] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// Search Functions
// ============================================================================

async function fetchUserSearchHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId?: string
): Promise<SearchHistoryEntry[]> {
  try {
    let query = supabase
      .from("search_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      // Table might not exist yet - return empty array for graceful degradation
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

async function searchTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  userId: string,
  workspaceId?: string
): Promise<SearchResultItem[]> {
  try {
    let dbQuery = supabase
      .from("tasks")
      .select("id, title, description, status, due, category, priority, updated_at")
      .ilike("title", `%${query}%`)
      .limit(MAX_CANDIDATES_PER_TYPE);

    if (workspaceId) {
      dbQuery = dbQuery.eq("workspace_id", workspaceId);
    } else {
      dbQuery = dbQuery.eq("user_id", userId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("[Search] Tasks search error:", error);
      return [];
    }

    return (data || []).map((task) => ({
      id: task.id,
      title: task.title,
      type: "task" as SearchResultType,
      description: task.description,
      status: task.status,
      due: task.due,
      category: task.category,
      priority: task.priority,
      updated_at: task.updated_at,
    }));
  } catch {
    return [];
  }
}

async function searchProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  workspaceId?: string
): Promise<SearchResultItem[]> {
  try {
    let dbQuery = supabase
      .from("projects")
      .select("id, title, summary, status, type, stage, updated_at")
      .ilike("title", `%${query}%`)
      .limit(MAX_CANDIDATES_PER_TYPE);

    if (workspaceId) {
      dbQuery = dbQuery.eq("workspace_id", workspaceId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("[Search] Projects search error:", error);
      return [];
    }

    return (data || []).map((project) => ({
      id: project.id,
      title: project.title,
      type: "project" as SearchResultType,
      description: project.summary,
      status: project.status,
      updated_at: project.updated_at,
    }));
  } catch {
    return [];
  }
}

async function searchGrants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  _workspaceId?: string
): Promise<SearchResultItem[]> {
  try {
    // Search funding opportunities (public data, not workspace-scoped)
    // Note: query is already escaped by caller via escapeLikePattern()
    const { data, error } = await supabase
      .from("funding_opportunities")
      .select("id, title, agency, description, deadline, updated_at")
      .or(`title.ilike.%${query}%,agency.ilike.%${query}%`)
      .limit(MAX_CANDIDATES_PER_TYPE);

    if (error) {
      console.error("[Search] Grants search error:", error);
      return [];
    }

    return (data || []).map((grant) => ({
      id: grant.id,
      title: grant.title,
      type: "grant" as SearchResultType,
      description: grant.description,
      due: grant.deadline,
      updated_at: grant.updated_at,
    }));
  } catch {
    return [];
  }
}

async function searchPublications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  userId: string,
  workspaceId?: string
): Promise<SearchResultItem[]> {
  try {
    let dbQuery = supabase
      .from("publications")
      .select("id, title, abstract, status, journal, year, updated_at")
      .ilike("title", `%${query}%`)
      .limit(MAX_CANDIDATES_PER_TYPE);

    if (workspaceId) {
      dbQuery = dbQuery.eq("workspace_id", workspaceId);
    } else {
      dbQuery = dbQuery.eq("user_id", userId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("[Search] Publications search error:", error);
      return [];
    }

    return (data || []).map((pub) => ({
      id: pub.id,
      title: pub.title,
      type: "publication" as SearchResultType,
      description: pub.abstract,
      status: pub.status,
      updated_at: pub.updated_at,
    }));
  } catch {
    return [];
  }
}

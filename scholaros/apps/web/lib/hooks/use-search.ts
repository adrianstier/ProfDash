/**
 * Search Hooks
 *
 * React Query hooks for global search and search history management.
 * Integrates with the /api/search and /api/search/history endpoints.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "../stores/workspace-store";
import type {
  SearchResultType,
  RecentSearch,
  SearchRankingFeatures,
} from "@scholaros/shared/types";

// ============================================================================
// Constants
// ============================================================================

/** Default number of search results to return */
const DEFAULT_SEARCH_LIMIT = 10;

/** Default number of history items to return */
const DEFAULT_HISTORY_LIMIT = 10;

/** How long search results are considered fresh (30 seconds) */
const SEARCH_STALE_TIME = 30 * 1000;

/** How long search results stay in cache (5 minutes) */
const SEARCH_GC_TIME = 5 * 60 * 1000;

/** How long search history is considered fresh (1 minute) */
const HISTORY_STALE_TIME = 60 * 1000;

/** How long search history stays in cache (10 minutes) */
const HISTORY_GC_TIME = 10 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  id: string;
  title: string;
  type: SearchResultType;
  description?: string | null;
  status?: string;
  due?: string | null;
  category?: string;
  priority?: string;
  updated_at?: string;
  _score?: number;
  _features?: Partial<SearchRankingFeatures>;
}

export interface SearchResponse {
  results: SearchResult[];
  grouped: {
    tasks: SearchResult[];
    projects: SearchResult[];
    grants: SearchResult[];
    publications: SearchResult[];
    navigation: SearchResult[];
  };
  total: number;
  query: string;
  limit: number;
}

export interface SearchHistoryResponse {
  searches: RecentSearch[];
  count: number;
  message?: string;
}

export interface SearchHistoryInsert {
  query: string;
  workspace_id?: string;
  result_type?: SearchResultType;
  result_id?: string;
  result_title?: string;
  source?: "command_palette" | "quick_search" | "navigation";
  selected?: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const searchKeys = {
  all: ["search"] as const,
  results: (query: string, types?: SearchResultType[], workspaceId?: string) =>
    [...searchKeys.all, "results", { query, types, workspaceId }] as const,
  history: () => [...searchKeys.all, "history"] as const,
  historyFiltered: (workspaceId?: string, selectedOnly?: boolean) =>
    [...searchKeys.history(), { workspaceId, selectedOnly }] as const,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely parses JSON from a response, returning a fallback error if parsing fails.
 */
async function safeParseJson<T>(response: Response, fallbackError: string): Promise<T> {
  try {
    return await response.json();
  } catch {
    throw new Error(fallbackError);
  }
}

/**
 * Handles error responses from the API with safe JSON parsing.
 */
async function handleErrorResponse(response: Response, fallbackMessage: string): Promise<never> {
  try {
    const error = await response.json();
    throw new Error(error.error || fallbackMessage);
  } catch (e) {
    if (e instanceof Error && e.message !== fallbackMessage) {
      throw e;
    }
    throw new Error(`${fallbackMessage} (status ${response.status})`);
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches search results from the API with optional filtering.
 *
 * @param query - The search query string
 * @param types - Optional array of result types to filter by
 * @param workspaceId - Optional workspace ID for scoping results
 * @param limit - Maximum number of results to return
 * @param context - Optional page context for ranking personalization
 */
async function fetchSearchResults(
  query: string,
  types?: SearchResultType[],
  workspaceId?: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  context?: string
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (types && types.length > 0) {
    params.set("types", types.join(","));
  }
  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }
  params.set("limit", limit.toString());
  if (context) {
    params.set("context", context);
  }

  const response = await fetch(`/api/search?${params.toString()}`);
  if (!response.ok) {
    await handleErrorResponse(response, "Search failed");
  }
  return safeParseJson<SearchResponse>(response, "Failed to parse search results");
}

/**
 * Fetches recent search history from the API.
 *
 * @param workspaceId - Optional workspace ID for filtering history
 * @param limit - Maximum number of history items to return
 * @param selectedOnly - If true, only return searches where a result was selected
 */
async function fetchSearchHistory(
  workspaceId?: string,
  limit: number = DEFAULT_HISTORY_LIMIT,
  selectedOnly: boolean = false
): Promise<SearchHistoryResponse> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }
  params.set("limit", limit.toString());
  if (selectedOnly) {
    params.set("selected_only", "true");
  }

  const response = await fetch(`/api/search/history?${params.toString()}`);
  if (!response.ok) {
    await handleErrorResponse(response, "Failed to fetch search history");
  }
  return safeParseJson<SearchHistoryResponse>(response, "Failed to parse search history");
}

/**
 * Records a search query and optional result selection to the API.
 *
 * @param data - The search history entry to record
 */
async function recordSearchHistory(
  data: SearchHistoryInsert
): Promise<{ success: boolean; stored: boolean; id?: string }> {
  const response = await fetch("/api/search/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    await handleErrorResponse(response, "Failed to record search");
  }
  return safeParseJson<{ success: boolean; stored: boolean; id?: string }>(
    response,
    "Failed to parse record response"
  );
}

/**
 * Clears search history for the current user.
 *
 * @param workspaceId - Optional workspace ID to clear history for specific workspace only
 */
async function clearSearchHistory(
  workspaceId?: string
): Promise<{ success: boolean; deleted: number }> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }

  const response = await fetch(`/api/search/history?${params.toString()}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    await handleErrorResponse(response, "Failed to clear search history");
  }
  return safeParseJson<{ success: boolean; deleted: number }>(
    response,
    "Failed to parse clear response"
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for global search with ranking.
 *
 * Provides real-time search across tasks, projects, grants, and publications
 * with ML-based ranking for personalized results.
 *
 * @param query - The search query string (minimum 1 character to trigger search)
 * @param options - Configuration options for the search
 * @param options.types - Filter results to specific entity types
 * @param options.limit - Maximum number of results (default: 10)
 * @param options.context - Current page context for ranking personalization
 * @param options.enabled - Whether the query should run (default: true)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSearch("grant proposal", {
 *   types: ["task", "project"],
 *   limit: 5,
 * });
 * ```
 */
export function useSearch(
  query: string,
  options?: {
    types?: SearchResultType[];
    limit?: number;
    context?: string;
    enabled?: boolean;
  }
) {
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspaceId = currentWorkspaceId ?? undefined;

  return useQuery({
    queryKey: searchKeys.results(query, options?.types, workspaceId),
    queryFn: () =>
      fetchSearchResults(
        query,
        options?.types,
        workspaceId,
        options?.limit ?? DEFAULT_SEARCH_LIMIT,
        options?.context
      ),
    enabled: (options?.enabled ?? true) && query.length >= 1,
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
    retry: 1,
  });
}

/**
 * Hook for recent search history.
 *
 * Fetches the user's recent search queries for display in the command palette
 * and for search personalization.
 *
 * @param options - Configuration options
 * @param options.limit - Maximum number of history items (default: 10)
 * @param options.selectedOnly - Only return searches where a result was selected
 * @param options.enabled - Whether the query should run (default: true)
 *
 * @example
 * ```tsx
 * const { data } = useSearchHistory({ limit: 5, selectedOnly: true });
 * ```
 */
export function useSearchHistory(options?: {
  limit?: number;
  selectedOnly?: boolean;
  enabled?: boolean;
}) {
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspaceId = currentWorkspaceId ?? undefined;

  return useQuery({
    queryKey: searchKeys.historyFiltered(workspaceId, options?.selectedOnly),
    queryFn: () =>
      fetchSearchHistory(
        workspaceId,
        options?.limit ?? DEFAULT_HISTORY_LIMIT,
        options?.selectedOnly
      ),
    enabled: options?.enabled ?? true,
    staleTime: HISTORY_STALE_TIME,
    gcTime: HISTORY_GC_TIME,
    retry: 1,
  });
}

/**
 * Hook to record a search query or selection.
 *
 * Used for analytics tracking and search personalization. Automatically
 * invalidates the search history cache on success.
 *
 * @example
 * ```tsx
 * const recordHistory = useRecordSearchHistory();
 * recordHistory.mutate({
 *   query: "NSF grant",
 *   result_type: "grant",
 *   result_id: "abc-123",
 *   selected: true,
 * });
 * ```
 */
export function useRecordSearchHistory() {
  const queryClient = useQueryClient();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspaceId = currentWorkspaceId ?? undefined;

  return useMutation({
    mutationFn: (data: Omit<SearchHistoryInsert, "workspace_id">) =>
      recordSearchHistory({
        ...data,
        workspace_id: workspaceId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
    },
  });
}

/**
 * Hook to clear search history.
 *
 * Clears all search history for the current user in the active workspace.
 * Automatically invalidates the search history cache on success.
 *
 * @example
 * ```tsx
 * const clearHistory = useClearSearchHistory();
 * clearHistory.mutate();
 * ```
 */
export function useClearSearchHistory() {
  const queryClient = useQueryClient();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspaceId = currentWorkspaceId ?? undefined;

  return useMutation({
    mutationFn: () => clearSearchHistory(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
    },
  });
}

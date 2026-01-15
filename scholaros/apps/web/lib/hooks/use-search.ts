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
// API Functions
// ============================================================================

async function fetchSearchResults(
  query: string,
  types?: SearchResultType[],
  workspaceId?: string,
  limit: number = 10,
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
    const error = await response.json();
    throw new Error(error.error || "Search failed");
  }
  return response.json();
}

async function fetchSearchHistory(
  workspaceId?: string,
  limit: number = 10,
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
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch search history");
  }
  return response.json();
}

async function recordSearchHistory(
  data: SearchHistoryInsert
): Promise<{ success: boolean; stored: boolean; id?: string }> {
  const response = await fetch("/api/search/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to record search");
  }
  return response.json();
}

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
    const error = await response.json();
    throw new Error(error.error || "Failed to clear search history");
  }
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for global search with ranking
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
        options?.limit ?? 10,
        options?.context
      ),
    enabled: (options?.enabled ?? true) && query.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for recent search history
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
      fetchSearchHistory(workspaceId, options?.limit ?? 10, options?.selectedOnly),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to record a search query or selection
 */
export function useRecordSearchHistory() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  return useMutation({
    mutationFn: (data: Omit<SearchHistoryInsert, "workspace_id">) =>
      recordSearchHistory({
        ...data,
        workspace_id: workspaceId ?? undefined,
      }),
    onSuccess: () => {
      // Invalidate search history queries to refresh recent searches
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
    },
  });
}

/**
 * Hook to clear search history
 */
export function useClearSearchHistory() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  return useMutation({
    mutationFn: () => clearSearchHistory(workspaceId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
    },
  });
}

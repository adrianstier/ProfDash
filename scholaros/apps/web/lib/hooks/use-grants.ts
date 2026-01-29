"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GrantSearchQuery,
  WatchlistStatus,
  WatchlistPriority,
} from "@scholaros/shared";

// API response types (with string dates from JSON)
export interface FundingOpportunityFromAPI {
  id: string;
  external_id?: string | null;
  source: string;
  title: string;
  agency?: string | null;
  agency_code?: string | null;
  mechanism?: string | null;
  description?: string | null;
  eligibility?: Record<string, unknown>;
  deadline?: string | null;
  posted_date?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  award_ceiling?: number | null;
  award_floor?: number | null;
  expected_awards?: number | null;
  cfda_numbers?: string[];
  opportunity_number?: string | null;
  opportunity_status?: string | null;
  funding_instrument_type?: string | null;
  category_funding_activity?: string | null;
  url?: string | null;
  raw_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItemFromAPI {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  project_id?: string | null;
  notes?: string | null;
  status: WatchlistStatus;
  fit_score?: number | null;
  fit_notes?: Record<string, unknown>;
  priority: WatchlistPriority;
  internal_deadline?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  opportunity?: FundingOpportunityFromAPI;
}

export interface SavedSearchFromAPI {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  query: GrantSearchQuery;
  alert_frequency: "daily" | "weekly" | "monthly" | "none";
  last_alerted_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantSearchFilters {
  keywords?: string;
  agency?: string;
  funding_type?: string;
  amount_min?: number;
  amount_max?: number;
  deadline_from?: string;
  deadline_to?: string;
  page?: number;
  limit?: number;
}

export interface GrantSearchResponse {
  opportunities: FundingOpportunityFromAPI[];
  total: number;
  page: number;
  limit: number;
}

// Fetch functions
async function searchOpportunities(filters: GrantSearchFilters): Promise<GrantSearchResponse> {
  const params = new URLSearchParams();

  if (filters.keywords) params.set("keywords", filters.keywords);
  if (filters.agency) params.set("agency", filters.agency);
  if (filters.funding_type) params.set("funding_type", filters.funding_type);
  if (filters.amount_min) params.set("amount_min", filters.amount_min.toString());
  if (filters.amount_max) params.set("amount_max", filters.amount_max.toString());
  if (filters.deadline_from) params.set("deadline_from", filters.deadline_from);
  if (filters.deadline_to) params.set("deadline_to", filters.deadline_to);
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());

  const response = await fetch(`/api/grants/search?${params}`);
  if (!response.ok) {
    throw new Error("Failed to search opportunities");
  }
  return response.json();
}

async function fetchWatchlist(workspaceId: string): Promise<WatchlistItemFromAPI[]> {
  const response = await fetch(`/api/grants/watchlist?workspace_id=${workspaceId}`);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch watchlist");
  }
  return response.json();
}

async function addToWatchlist(params: {
  workspace_id: string;
  opportunity_id: string;
  notes?: string;
  priority?: WatchlistPriority;
}): Promise<WatchlistItemFromAPI> {
  const response = await fetch("/api/grants/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add to watchlist");
  }
  return response.json();
}

async function updateWatchlistItem(params: {
  id: string;
  notes?: string;
  status?: WatchlistStatus;
  priority?: WatchlistPriority;
  fit_score?: number;
  internal_deadline?: string;
}): Promise<WatchlistItemFromAPI> {
  const { id, ...updates } = params;
  const response = await fetch(`/api/grants/watchlist/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update watchlist item");
  }
  return response.json();
}

async function removeFromWatchlist(id: string): Promise<void> {
  const response = await fetch(`/api/grants/watchlist/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove from watchlist");
  }
}

async function fetchSavedSearches(workspaceId: string): Promise<SavedSearchFromAPI[]> {
  const response = await fetch(`/api/grants/saved-searches?workspace_id=${workspaceId}`);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch saved searches");
  }
  return response.json();
}

async function createSavedSearch(params: {
  workspace_id: string;
  name: string;
  description?: string;
  query: GrantSearchQuery;
  alert_frequency?: "daily" | "weekly" | "monthly" | "none";
}): Promise<SavedSearchFromAPI> {
  const response = await fetch("/api/grants/saved-searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save search");
  }
  return response.json();
}

async function deleteSavedSearch(id: string): Promise<void> {
  const response = await fetch(`/api/grants/saved-searches/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete saved search");
  }
}

// Hooks

export function useGrantSearch(filters: GrantSearchFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: ["grants", "search", filters],
    queryFn: () => searchOpportunities(filters),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWatchlist(workspaceId: string | null) {
  return useQuery({
    queryKey: ["grants", "watchlist", workspaceId],
    queryFn: () => fetchWatchlist(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToWatchlist,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["grants", "watchlist", variables.workspace_id] });
    },
  });
}

export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWatchlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grants", "watchlist"] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grants", "watchlist"] });
    },
  });
}

export function useSavedSearches(workspaceId: string | null) {
  return useQuery({
    queryKey: ["grants", "saved-searches", workspaceId],
    queryFn: () => fetchSavedSearches(workspaceId!),
    enabled: !!workspaceId,
    // Cache settings for saved searches (change rarely)
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSavedSearch,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["grants", "saved-searches", variables.workspace_id] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grants", "saved-searches"] });
    },
  });
}

// Create custom opportunity (from document import or manual entry)
interface CreateOpportunityInput {
  title: string;
  agency?: string | null;
  description?: string | null;
  deadline?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  eligibility?: Record<string, unknown> | null;
  url?: string | null;
  // Watchlist integration
  workspace_id?: string;
  add_to_watchlist?: boolean;
  notes?: string;
  priority?: WatchlistPriority;
}

async function createOpportunity(data: CreateOpportunityInput): Promise<FundingOpportunityFromAPI> {
  const response = await fetch("/api/grants/opportunities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create opportunity");
  }
  return response.json();
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOpportunity,
    onSuccess: (_, variables) => {
      // Invalidate both opportunities search and watchlist
      queryClient.invalidateQueries({ queryKey: ["grants", "search"] });
      if (variables.workspace_id) {
        queryClient.invalidateQueries({ queryKey: ["grants", "watchlist", variables.workspace_id] });
      }
    },
  });
}

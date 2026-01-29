"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  PublicationStatus,
  PublicationType,
  PublicationFromAPI,
  PublicationAuthor,
  CreatePublication,
  UpdatePublication,
} from "@scholaros/shared";
import { queryKeys } from "@/app/providers";

// Re-export types for components
export type { PublicationFromAPI, PublicationAuthor } from "@scholaros/shared";

export interface PublicationWithAuthors extends PublicationFromAPI {
  publication_authors?: PublicationAuthor[];
}

interface PublicationFilters {
  status?: PublicationStatus;
  type?: PublicationType;
  year?: number;
  workspace_id?: string | null;
  limit?: number;
  offset?: number;
}

interface PublicationsResponse {
  data: PublicationWithAuthors[];
  count: number;
}

// Fetch publications with optional filters
async function fetchPublications(filters?: PublicationFilters): Promise<PublicationsResponse> {
  const params = new URLSearchParams();

  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.workspace_id) params.set("workspace_id", filters.workspace_id);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));

  const response = await fetch(`/api/publications?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch publications");
  }

  return response.json();
}

// Fetch single publication
async function fetchPublication(id: string): Promise<PublicationWithAuthors> {
  const response = await fetch(`/api/publications/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch publication");
  }

  return response.json();
}

// Create publication
interface CreatePublicationInput extends CreatePublication {
  authors?: Omit<PublicationAuthor, "id" | "publication_id" | "created_at">[];
}

async function createPublication(data: CreatePublicationInput): Promise<PublicationWithAuthors> {
  const response = await fetch("/api/publications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create publication");
  }

  return response.json();
}

// Update publication
interface UpdatePublicationInput extends UpdatePublication {
  id: string;
  authors?: Omit<PublicationAuthor, "id" | "publication_id" | "created_at">[];
}

async function updatePublication({ id, ...data }: UpdatePublicationInput): Promise<PublicationWithAuthors> {
  const response = await fetch(`/api/publications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update publication");
  }

  return response.json();
}

// Delete publication
async function deletePublication(id: string): Promise<void> {
  const response = await fetch(`/api/publications/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete publication");
  }
}

// Import from DOI
interface ImportDOIInput {
  doi: string;
  workspace_id?: string;
}

async function importFromDOI(data: ImportDOIInput): Promise<PublicationWithAuthors> {
  const response = await fetch("/api/publications/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 409 && error.existingId) {
      throw new Error(`Publication already exists|${error.existingId}`);
    }
    throw new Error(error.error || "Failed to import from DOI");
  }

  return response.json();
}

// Hook: Fetch publications
export function usePublications(filters?: PublicationFilters) {
  return useQuery({
    queryKey: queryKeys.publications.list((filters ?? {}) as Record<string, unknown>),
    queryFn: () => fetchPublications(filters),
    // Cache settings for optimal performance
    staleTime: 2 * 60 * 1000, // Data is fresh for 2 minutes (publications change less frequently)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

// Hook: Fetch publications by status (for pipeline view)
export function usePublicationsByStatus(status: PublicationStatus, workspaceId?: string | null) {
  return usePublications({
    status,
    workspace_id: workspaceId ?? undefined,
  });
}

// Hook: Fetch single publication
export function usePublication(id: string) {
  return useQuery({
    queryKey: queryKeys.publications.detail(id),
    queryFn: () => fetchPublication(id),
    enabled: !!id,
    // Cache settings for publication details
    staleTime: 60 * 1000, // Data is fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Hook: Create publication
export function useCreatePublication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPublication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publications.all });
    },
  });
}

// Hook: Update publication
export function useUpdatePublication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePublication,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publications.all });
      queryClient.setQueryData(queryKeys.publications.detail(data.id), data);
    },
  });
}

// Hook: Delete publication
export function useDeletePublication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePublication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publications.all });
    },
  });
}

// Hook: Import from DOI
export function useImportFromDOI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importFromDOI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publications.all });
    },
  });
}

// Hook: Update publication status (for drag-and-drop in pipeline)
export function useUpdatePublicationStatus() {
  const updatePublication = useUpdatePublication();

  return {
    ...updatePublication,
    mutate: (id: string, status: PublicationStatus) => {
      updatePublication.mutate({ id, status });
    },
    mutateAsync: async (id: string, status: PublicationStatus) => {
      return updatePublication.mutateAsync({ id, status });
    },
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  FieldSiteFromAPI,
  CreateFieldSite,
  UpdateFieldSite,
} from "@scholaros/shared";

// Query keys
export const fieldSiteKeys = {
  all: ["field-sites"] as const,
  lists: () => [...fieldSiteKeys.all, "list"] as const,
  list: (workspaceId: string, activeOnly?: boolean) =>
    [...fieldSiteKeys.lists(), workspaceId, { activeOnly }] as const,
  details: () => [...fieldSiteKeys.all, "detail"] as const,
  detail: (id: string) => [...fieldSiteKeys.details(), id] as const,
};

// Fetch all field sites for a workspace
async function fetchFieldSites(
  workspaceId: string,
  activeOnly: boolean = false
): Promise<FieldSiteFromAPI[]> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
  });
  if (activeOnly) {
    params.set("active_only", "true");
  }

  const response = await fetch(`/api/research/sites?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch field sites");
  }

  return response.json();
}

// Fetch a single field site
async function fetchFieldSite(siteId: string): Promise<FieldSiteFromAPI> {
  const response = await fetch(`/api/research/sites/${siteId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch field site");
  }

  return response.json();
}

// Create a field site
async function createFieldSite(data: CreateFieldSite): Promise<FieldSiteFromAPI> {
  const response = await fetch("/api/research/sites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create field site");
  }

  return response.json();
}

// Update a field site
async function updateFieldSite({
  id,
  ...data
}: UpdateFieldSite & { id: string }): Promise<FieldSiteFromAPI> {
  const response = await fetch(`/api/research/sites/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update field site");
  }

  return response.json();
}

// Delete a field site
async function deleteFieldSite(siteId: string): Promise<void> {
  const response = await fetch(`/api/research/sites/${siteId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete field site");
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all field sites for a workspace
 */
export function useFieldSites(workspaceId: string | null, activeOnly: boolean = false) {
  return useQuery({
    queryKey: fieldSiteKeys.list(workspaceId ?? "", activeOnly),
    queryFn: () => fetchFieldSites(workspaceId!, activeOnly),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to fetch a single field site
 */
export function useFieldSite(siteId: string | null) {
  return useQuery({
    queryKey: fieldSiteKeys.detail(siteId ?? ""),
    queryFn: () => fetchFieldSite(siteId!),
    enabled: !!siteId,
  });
}

/**
 * Hook to create a field site
 */
export function useCreateFieldSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFieldSite,
    onSuccess: (newSite) => {
      // Invalidate the list query for this workspace
      queryClient.invalidateQueries({
        queryKey: fieldSiteKeys.lists(),
      });
      // Add to cache
      queryClient.setQueryData(fieldSiteKeys.detail(newSite.id), newSite);
    },
  });
}

/**
 * Hook to update a field site
 */
export function useUpdateFieldSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFieldSite,
    onSuccess: (updatedSite) => {
      // Update the cache
      queryClient.setQueryData(fieldSiteKeys.detail(updatedSite.id), updatedSite);
      // Invalidate lists to refetch with updated data
      queryClient.invalidateQueries({
        queryKey: fieldSiteKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete a field site
 */
export function useDeleteFieldSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFieldSite,
    onSuccess: (_, siteId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: fieldSiteKeys.detail(siteId),
      });
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: fieldSiteKeys.lists(),
      });
    },
  });
}

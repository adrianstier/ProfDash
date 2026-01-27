import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ExperimentWithDetails,
  CreateExperiment,
  UpdateExperiment,
  ExperimentStatus,
} from "@scholaros/shared";

// Query keys
export const experimentKeys = {
  all: ["experiments"] as const,
  lists: () => [...experimentKeys.all, "list"] as const,
  list: (projectId: string, filters?: { status?: string; siteId?: string }) =>
    [...experimentKeys.lists(), projectId, filters] as const,
  details: () => [...experimentKeys.all, "detail"] as const,
  detail: (id: string) => [...experimentKeys.details(), id] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchExperiments(
  projectId: string,
  filters?: { status?: string; siteId?: string }
): Promise<ExperimentWithDetails[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.siteId) params.set("site_id", filters.siteId);

  const url = `/api/research/projects/${projectId}/experiments${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch experiments");
  }

  return response.json();
}

async function fetchExperiment(
  projectId: string,
  experimentId: string
): Promise<ExperimentWithDetails> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch experiment");
  }

  return response.json();
}

async function createExperiment(
  projectId: string,
  data: Omit<CreateExperiment, "project_id" | "workspace_id">
): Promise<ExperimentWithDetails> {
  const response = await fetch(`/api/research/projects/${projectId}/experiments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create experiment");
  }

  return response.json();
}

async function updateExperiment({
  projectId,
  experimentId,
  ...data
}: UpdateExperiment & {
  projectId: string;
  experimentId: string;
}): Promise<ExperimentWithDetails> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update experiment");
  }

  return response.json();
}

async function deleteExperiment(
  projectId: string,
  experimentId: string
): Promise<void> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete experiment");
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all experiments for a research project
 */
export function useExperiments(
  projectId: string | null,
  filters?: { status?: ExperimentStatus; siteId?: string }
) {
  return useQuery({
    queryKey: experimentKeys.list(projectId ?? "", filters),
    queryFn: () => fetchExperiments(projectId!, filters),
    enabled: !!projectId,
  });
}

/**
 * Hook to fetch a single experiment
 */
export function useExperiment(projectId: string | null, experimentId: string | null) {
  return useQuery({
    queryKey: experimentKeys.detail(experimentId ?? ""),
    queryFn: () => fetchExperiment(projectId!, experimentId!),
    enabled: !!projectId && !!experimentId,
  });
}

/**
 * Hook to create an experiment
 */
export function useCreateExperiment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateExperiment, "project_id" | "workspace_id">) =>
      createExperiment(projectId, data),
    onSuccess: (newExperiment) => {
      // Invalidate the list query
      queryClient.invalidateQueries({
        queryKey: experimentKeys.lists(),
      });
      // Add to cache
      queryClient.setQueryData(
        experimentKeys.detail(newExperiment.id),
        newExperiment
      );
    },
  });
}

/**
 * Hook to update an experiment
 */
export function useUpdateExperiment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateExperiment & { experimentId: string }) =>
      updateExperiment({ projectId, ...data }),
    onSuccess: (updatedExperiment) => {
      // Update the cache
      queryClient.setQueryData(
        experimentKeys.detail(updatedExperiment.id),
        updatedExperiment
      );
      // Invalidate lists to refetch with updated data
      queryClient.invalidateQueries({
        queryKey: experimentKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete an experiment
 */
export function useDeleteExperiment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (experimentId: string) => deleteExperiment(projectId, experimentId),
    onSuccess: (_, experimentId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: experimentKeys.detail(experimentId),
      });
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: experimentKeys.lists(),
      });
    },
  });
}

// ============================================================================
// Status Helpers
// ============================================================================

export const EXPERIMENT_STATUS_CONFIG: Record<
  ExperimentStatus,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  planning: {
    label: "Planning",
    color: "bg-gray-500",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  active: {
    label: "Active",
    color: "bg-blue-500",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  fieldwork: {
    label: "Fieldwork",
    color: "bg-orange-500",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
  analysis: {
    label: "Analysis",
    color: "bg-purple-500",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
  },
  completed: {
    label: "Completed",
    color: "bg-green-500",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  on_hold: {
    label: "On Hold",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
};

export function getExperimentStatusConfig(status: ExperimentStatus) {
  return EXPERIMENT_STATUS_CONFIG[status] || EXPERIMENT_STATUS_CONFIG.planning;
}

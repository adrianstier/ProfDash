import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  FieldworkScheduleWithDetails,
  CreateFieldworkSchedule,
  UpdateFieldworkSchedule,
  FieldworkStatus,
} from "@scholaros/shared";

// Query keys
export const fieldworkKeys = {
  all: ["fieldwork"] as const,
  lists: () => [...fieldworkKeys.all, "list"] as const,
  list: (projectId: string, experimentId: string, filters?: { status?: string }) =>
    [...fieldworkKeys.lists(), projectId, experimentId, filters] as const,
  projectList: (projectId: string) =>
    [...fieldworkKeys.all, "project", projectId] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchFieldworkSchedules(
  projectId: string,
  experimentId: string,
  filters?: { status?: string }
): Promise<FieldworkScheduleWithDetails[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);

  const url = `/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch fieldwork schedules");
  }

  return response.json();
}

async function createFieldworkSchedule(
  projectId: string,
  experimentId: string,
  data: Omit<CreateFieldworkSchedule, "experiment_id">
): Promise<FieldworkScheduleWithDetails> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create fieldwork schedule");
  }

  return response.json();
}

async function updateFieldworkSchedule(
  projectId: string,
  experimentId: string,
  scheduleId: string,
  data: UpdateFieldworkSchedule
): Promise<FieldworkScheduleWithDetails> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update fieldwork schedule");
  }

  return response.json();
}

async function deleteFieldworkSchedule(
  projectId: string,
  experimentId: string,
  scheduleId: string
): Promise<void> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete fieldwork schedule");
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch fieldwork schedules for an experiment
 */
export function useFieldworkSchedules(
  projectId: string | null,
  experimentId: string | null,
  filters?: { status?: FieldworkStatus }
) {
  return useQuery({
    queryKey: fieldworkKeys.list(projectId ?? "", experimentId ?? "", filters),
    queryFn: () => fetchFieldworkSchedules(projectId!, experimentId!, filters),
    enabled: !!projectId && !!experimentId,
  });
}

/**
 * Hook to create a fieldwork schedule
 */
export function useCreateFieldworkSchedule(projectId: string, experimentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateFieldworkSchedule, "experiment_id">) =>
      createFieldworkSchedule(projectId, experimentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fieldworkKeys.list(projectId, experimentId),
      });
      // Also invalidate project-level fieldwork list if it exists
      queryClient.invalidateQueries({
        queryKey: fieldworkKeys.projectList(projectId),
      });
    },
  });
}

/**
 * Hook to update a fieldwork schedule
 */
export function useUpdateFieldworkSchedule(projectId: string, experimentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, ...data }: UpdateFieldworkSchedule & { scheduleId: string }) =>
      updateFieldworkSchedule(projectId, experimentId, scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fieldworkKeys.list(projectId, experimentId),
      });
      queryClient.invalidateQueries({
        queryKey: fieldworkKeys.projectList(projectId),
      });
    },
  });
}

/**
 * Hook to delete a fieldwork schedule
 */
export function useDeleteFieldworkSchedule(projectId: string, experimentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) =>
      deleteFieldworkSchedule(projectId, experimentId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fieldworkKeys.list(projectId, experimentId),
      });
      queryClient.invalidateQueries({
        queryKey: fieldworkKeys.projectList(projectId),
      });
    },
  });
}

// ============================================================================
// Status Helpers
// ============================================================================

export const FIELDWORK_STATUS_CONFIG: Record<
  FieldworkStatus,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  planned: {
    label: "Planned",
    color: "bg-gray-500",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-500",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-orange-500",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
  completed: {
    label: "Completed",
    color: "bg-green-500",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
};

export function getFieldworkStatusConfig(status: FieldworkStatus) {
  return FIELDWORK_STATUS_CONFIG[status] || FIELDWORK_STATUS_CONFIG.planned;
}

/**
 * Check if a fieldwork schedule is upcoming (starts within the next N days)
 */
export function isUpcomingFieldwork(
  startDate: Date | string | null | undefined,
  daysAhead: number = 30
): boolean {
  if (!startDate) return false;

  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= daysAhead;
}

/**
 * Get days until fieldwork starts
 */
export function getDaysUntilFieldwork(
  startDate: Date | string | null | undefined
): number | null {
  if (!startDate) return null;

  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate fieldwork duration in days
 */
export function getFieldworkDuration(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number | null {
  if (!startDate || !endDate) return null;

  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === "string" ? new Date(endDate) : new Date(endDate);

  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
}

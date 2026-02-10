import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  parseLocalDate,
} from "@scholaros/shared";
import type {
  PermitWithDetails,
  CreatePermit,
  UpdatePermit,
  PermitStatus,
  PermitType,
} from "@scholaros/shared";

// Query keys
export const permitKeys = {
  all: ["permits"] as const,
  lists: () => [...permitKeys.all, "list"] as const,
  list: (
    projectId: string,
    filters?: { status?: string; permitType?: string; includeExpired?: boolean }
  ) => [...permitKeys.lists(), projectId, filters] as const,
  details: () => [...permitKeys.all, "detail"] as const,
  detail: (id: string) => [...permitKeys.details(), id] as const,
  expiring: (workspaceId: string, days?: number) =>
    [...permitKeys.all, "expiring", workspaceId, days] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchPermits(
  projectId: string,
  filters?: { status?: string; permitType?: string; includeExpired?: boolean }
): Promise<PermitWithDetails[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.permitType) params.set("permit_type", filters.permitType);
  if (filters?.includeExpired) params.set("include_expired", "true");

  const url = `/api/research/projects/${projectId}/permits${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch permits");
  }

  return response.json();
}

async function fetchPermit(
  projectId: string,
  permitId: string
): Promise<PermitWithDetails> {
  const response = await fetch(
    `/api/research/projects/${projectId}/permits/${permitId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch permit");
  }

  return response.json();
}

async function createPermit(
  projectId: string,
  data: Omit<CreatePermit, "project_id" | "workspace_id">
): Promise<PermitWithDetails> {
  const response = await fetch(`/api/research/projects/${projectId}/permits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create permit");
  }

  return response.json();
}

async function updatePermit({
  projectId,
  permitId,
  ...data
}: UpdatePermit & {
  projectId: string;
  permitId: string;
}): Promise<PermitWithDetails> {
  const response = await fetch(
    `/api/research/projects/${projectId}/permits/${permitId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update permit");
  }

  return response.json();
}

async function deletePermit(
  projectId: string,
  permitId: string
): Promise<void> {
  const response = await fetch(
    `/api/research/projects/${projectId}/permits/${permitId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete permit");
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all permits for a research project
 */
export function usePermits(
  projectId: string | null,
  filters?: { status?: PermitStatus; permitType?: PermitType; includeExpired?: boolean }
) {
  return useQuery({
    queryKey: permitKeys.list(projectId ?? "", filters),
    queryFn: () => fetchPermits(projectId!, filters),
    enabled: !!projectId,
  });
}

/**
 * Hook to fetch a single permit
 */
export function usePermit(projectId: string | null, permitId: string | null) {
  return useQuery({
    queryKey: permitKeys.detail(permitId ?? ""),
    queryFn: () => fetchPermit(projectId!, permitId!),
    enabled: !!projectId && !!permitId,
  });
}

/**
 * Hook to create a permit
 */
export function useCreatePermit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreatePermit, "project_id" | "workspace_id">) =>
      createPermit(projectId, data),
    onSuccess: (newPermit) => {
      // Invalidate the list query
      queryClient.invalidateQueries({
        queryKey: permitKeys.lists(),
      });
      // Add to cache
      queryClient.setQueryData(permitKeys.detail(newPermit.id), newPermit);
    },
  });
}

/**
 * Hook to update a permit
 */
export function useUpdatePermit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePermit & { permitId: string }) =>
      updatePermit({ projectId, ...data }),
    onSuccess: (updatedPermit) => {
      // Update the cache
      queryClient.setQueryData(permitKeys.detail(updatedPermit.id), updatedPermit);
      // Invalidate lists to refetch with updated data
      queryClient.invalidateQueries({
        queryKey: permitKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete a permit
 */
export function useDeletePermit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permitId: string) => deletePermit(projectId, permitId),
    onSuccess: (_, permitId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: permitKeys.detail(permitId),
      });
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: permitKeys.lists(),
      });
    },
  });
}

// ============================================================================
// Status & Type Helpers
// ============================================================================

export const PERMIT_STATUS_CONFIG: Record<
  PermitStatus,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-gray-500",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  active: {
    label: "Active",
    color: "bg-green-500",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  expired: {
    label: "Expired",
    color: "bg-red-500",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
  renewal_pending: {
    label: "Renewal Pending",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  suspended: {
    label: "Suspended",
    color: "bg-orange-500",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
};

export const PERMIT_TYPE_CONFIG: Record<
  PermitType,
  { label: string; icon: string }
> = {
  IACUC: { label: "IACUC", icon: "🐾" },
  IBC: { label: "IBC", icon: "🧬" },
  collection: { label: "Collection", icon: "🌿" },
  CITES: { label: "CITES", icon: "🌍" },
  export: { label: "Export", icon: "📦" },
  import: { label: "Import", icon: "📥" },
  IRB: { label: "IRB", icon: "👥" },
  MOU: { label: "MOU", icon: "🤝" },
  institutional: { label: "Institutional", icon: "🏛️" },
  other: { label: "Other", icon: "📋" },
};

export function getPermitStatusConfig(status: PermitStatus) {
  return PERMIT_STATUS_CONFIG[status] || PERMIT_STATUS_CONFIG.pending;
}

export function getPermitTypeConfig(type: PermitType) {
  return PERMIT_TYPE_CONFIG[type] || PERMIT_TYPE_CONFIG.other;
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(
  expirationDate: Date | string | null | undefined
): number | null {
  if (!expirationDate) return null;

  const expDate =
    typeof expirationDate === "string" ? parseLocalDate(expirationDate) : new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency level for a permit based on expiration
 */
export function getExpirationUrgency(
  expirationDate: Date | string | null | undefined,
  reminderDays: number = 60
): "expired" | "critical" | "warning" | "ok" | null {
  const days = getDaysUntilExpiration(expirationDate);
  if (days === null) return null;

  if (days < 0) return "expired";
  if (days <= 14) return "critical";
  if (days <= reminderDays) return "warning";
  return "ok";
}

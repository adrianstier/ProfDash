import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ExperimentTeamAssignmentWithDetails,
  CreateExperimentTeamAssignment,
  ExperimentTeamRole,
} from "@scholaros/shared";

// Query keys
export const experimentTeamKeys = {
  all: ["experiment-team"] as const,
  lists: () => [...experimentTeamKeys.all, "list"] as const,
  list: (projectId: string, experimentId: string) =>
    [...experimentTeamKeys.lists(), projectId, experimentId] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchExperimentTeam(
  projectId: string,
  experimentId: string
): Promise<ExperimentTeamAssignmentWithDetails[]> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}/team`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch team assignments");
  }

  return response.json();
}

async function addTeamMember(
  projectId: string,
  experimentId: string,
  data: Omit<CreateExperimentTeamAssignment, "experiment_id" | "project_id">
): Promise<ExperimentTeamAssignmentWithDetails> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}/team`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add team member");
  }

  return response.json();
}

async function removeTeamMember(
  projectId: string,
  experimentId: string,
  assignmentId: string
): Promise<void> {
  const response = await fetch(
    `/api/research/projects/${projectId}/experiments/${experimentId}/team?assignment_id=${assignmentId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove team member");
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch team assignments for an experiment
 */
export function useExperimentTeam(
  projectId: string | null,
  experimentId: string | null
) {
  return useQuery({
    queryKey: experimentTeamKeys.list(projectId ?? "", experimentId ?? ""),
    queryFn: () => fetchExperimentTeam(projectId!, experimentId!),
    enabled: !!projectId && !!experimentId,
  });
}

/**
 * Hook to add a team member to an experiment
 */
export function useAddTeamMember(projectId: string, experimentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateExperimentTeamAssignment, "experiment_id" | "project_id">) =>
      addTeamMember(projectId, experimentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: experimentTeamKeys.list(projectId, experimentId),
      });
    },
  });
}

/**
 * Hook to remove a team member from an experiment
 */
export function useRemoveTeamMember(projectId: string, experimentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) =>
      removeTeamMember(projectId, experimentId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: experimentTeamKeys.list(projectId, experimentId),
      });
    },
  });
}

// ============================================================================
// Role Helpers
// ============================================================================

export const TEAM_ROLE_CONFIG: Record<
  ExperimentTeamRole,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  lead: {
    label: "Lead",
    color: "bg-purple-500",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
  },
  co_lead: {
    label: "Co-Lead",
    color: "bg-blue-500",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  contributor: {
    label: "Contributor",
    color: "bg-green-500",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  field_assistant: {
    label: "Field Assistant",
    color: "bg-orange-500",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
  data_analyst: {
    label: "Data Analyst",
    color: "bg-cyan-500",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-700",
  },
  consultant: {
    label: "Consultant",
    color: "bg-gray-500",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
};

export function getTeamRoleConfig(role: ExperimentTeamRole) {
  return TEAM_ROLE_CONFIG[role] || TEAM_ROLE_CONFIG.contributor;
}

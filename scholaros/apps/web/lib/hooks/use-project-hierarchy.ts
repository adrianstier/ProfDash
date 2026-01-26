"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectPhaseFromAPI,
  ProjectWorkstreamFromAPI,
  ProjectDeliverableFromAPI,
  ProjectRoleFromAPI,
  ProjectPhaseAssignmentFromAPI,
  PhaseStatus,
  WorkstreamStatus,
  DeliverableStatus,
  DeliverableArtifactType,
  PhaseAssignmentType,
} from "@scholaros/shared";

// Extended types with nested data
export interface PhaseWithDetails extends ProjectPhaseFromAPI {
  deliverables?: ProjectDeliverableFromAPI[];
  assignments?: ProjectPhaseAssignmentFromAPI[];
}

export interface WorkstreamWithStats extends ProjectWorkstreamFromAPI {
  owner?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  task_count?: number;
  completed_task_count?: number;
  overdue_task_count?: number;
}

export interface DeliverableWithRelations extends ProjectDeliverableFromAPI {
  workstream?: {
    id: string;
    title: string;
    color: string;
  } | null;
  document?: {
    id: string;
    name: string;
    file_path: string;
  } | null;
}

export interface AssignmentWithRelations extends ProjectPhaseAssignmentFromAPI {
  role?: ProjectRoleFromAPI | null;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

// =============================================================================
// PHASES
// =============================================================================

async function fetchPhases(projectId: string): Promise<PhaseWithDetails[]> {
  const response = await fetch(`/api/projects/${projectId}/phases`);

  if (!response.ok) {
    throw new Error("Failed to fetch phases");
  }

  return response.json();
}

async function fetchPhase(projectId: string, phaseId: string): Promise<PhaseWithDetails> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch phase");
  }

  return response.json();
}

async function createPhase({
  projectId,
  ...data
}: {
  projectId: string;
  title: string;
  description?: string | null;
  sort_order?: number;
  due_date?: string | null;
  blocked_by?: string[];
  assigned_role?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProjectPhaseFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/phases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create phase");
  }

  return response.json();
}

async function updatePhase({
  projectId,
  phaseId,
  ...updates
}: {
  projectId: string;
  phaseId: string;
  title?: string;
  description?: string | null;
  sort_order?: number;
  status?: PhaseStatus;
  due_date?: string | null;
  blocked_by?: string[];
  assigned_role?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProjectPhaseFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update phase");
  }

  return response.json();
}

async function deletePhase({
  projectId,
  phaseId,
}: {
  projectId: string;
  phaseId: string;
}): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete phase");
  }
}

async function startPhase({
  projectId,
  phaseId,
}: {
  projectId: string;
  phaseId: string;
}): Promise<ProjectPhaseFromAPI & { blocking_phases?: unknown[] }> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/start`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 409) {
      // Blocked by other phases
      throw new Error(JSON.stringify(error));
    }
    throw new Error(error.error || "Failed to start phase");
  }

  return response.json();
}

async function completePhase({
  projectId,
  phaseId,
}: {
  projectId: string;
  phaseId: string;
}): Promise<ProjectPhaseFromAPI & { unblocked_phases?: string[] }> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/complete`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to complete phase");
  }

  return response.json();
}

// Hook: Fetch phases
export function usePhases(projectId: string | null) {
  return useQuery({
    queryKey: ["phases", projectId],
    queryFn: () => fetchPhases(projectId!),
    enabled: !!projectId,
  });
}

// Hook: Fetch single phase
export function usePhase(projectId: string | null, phaseId: string | null) {
  return useQuery({
    queryKey: ["phase", projectId, phaseId],
    queryFn: () => fetchPhase(projectId!, phaseId!),
    enabled: !!projectId && !!phaseId,
  });
}

// Hook: Create phase
export function useCreatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPhase,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Update phase
export function useUpdatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePhase,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Delete phase
export function useDeletePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePhase,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Start phase
export function useStartPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startPhase,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
    },
  });
}

// Hook: Complete phase
export function useCompletePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completePhase,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
    },
  });
}

// =============================================================================
// WORKSTREAMS
// =============================================================================

async function fetchWorkstreams(projectId: string): Promise<WorkstreamWithStats[]> {
  const response = await fetch(`/api/projects/${projectId}/workstreams`);

  if (!response.ok) {
    throw new Error("Failed to fetch workstreams");
  }

  return response.json();
}

async function fetchWorkstream(projectId: string, workstreamId: string): Promise<WorkstreamWithStats> {
  const response = await fetch(`/api/projects/${projectId}/workstreams/${workstreamId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch workstream");
  }

  return response.json();
}

async function createWorkstream({
  projectId,
  ...data
}: {
  projectId: string;
  title: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
  owner_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProjectWorkstreamFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/workstreams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create workstream");
  }

  return response.json();
}

async function updateWorkstream({
  projectId,
  workstreamId,
  ...updates
}: {
  projectId: string;
  workstreamId: string;
  title?: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
  status?: WorkstreamStatus;
  owner_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProjectWorkstreamFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/workstreams/${workstreamId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update workstream");
  }

  return response.json();
}

async function deleteWorkstream({
  projectId,
  workstreamId,
}: {
  projectId: string;
  workstreamId: string;
}): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/workstreams/${workstreamId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete workstream");
  }
}

// Hook: Fetch workstreams
export function useWorkstreams(projectId: string | null) {
  return useQuery({
    queryKey: ["workstreams", projectId],
    queryFn: () => fetchWorkstreams(projectId!),
    enabled: !!projectId,
  });
}

// Hook: Fetch single workstream
export function useWorkstream(projectId: string | null, workstreamId: string | null) {
  return useQuery({
    queryKey: ["workstream", projectId, workstreamId],
    queryFn: () => fetchWorkstream(projectId!, workstreamId!),
    enabled: !!projectId && !!workstreamId,
  });
}

// Hook: Create workstream
export function useCreateWorkstream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkstream,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workstreams", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Update workstream
export function useUpdateWorkstream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWorkstream,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workstreams", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["workstream", variables.projectId, variables.workstreamId] });
    },
  });
}

// Hook: Delete workstream
export function useDeleteWorkstream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkstream,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workstreams", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// =============================================================================
// DELIVERABLES
// =============================================================================

async function fetchDeliverables(
  projectId: string,
  phaseId: string
): Promise<DeliverableWithRelations[]> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/deliverables`);

  if (!response.ok) {
    throw new Error("Failed to fetch deliverables");
  }

  return response.json();
}

async function createDeliverable({
  projectId,
  phaseId,
  ...data
}: {
  projectId: string;
  phaseId: string;
  title: string;
  workstream_id?: string | null;
  description?: string | null;
  artifact_type?: DeliverableArtifactType | null;
  file_path?: string | null;
  sort_order?: number;
  due_date?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProjectDeliverableFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/deliverables`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create deliverable");
  }

  return response.json();
}

async function updateDeliverable({
  projectId,
  phaseId,
  deliverableId,
  ...updates
}: {
  projectId: string;
  phaseId: string;
  deliverableId: string;
  title?: string;
  workstream_id?: string | null;
  description?: string | null;
  artifact_type?: DeliverableArtifactType | null;
  file_path?: string | null;
  sort_order?: number;
  status?: DeliverableStatus;
  due_date?: string | null;
  document_id?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProjectDeliverableFromAPI> {
  const params = new URLSearchParams({ deliverableId });
  const response = await fetch(
    `/api/projects/${projectId}/phases/${phaseId}/deliverables?${params}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update deliverable");
  }

  return response.json();
}

async function deleteDeliverable({
  projectId,
  phaseId,
  deliverableId,
}: {
  projectId: string;
  phaseId: string;
  deliverableId: string;
}): Promise<void> {
  const params = new URLSearchParams({ deliverableId });
  const response = await fetch(
    `/api/projects/${projectId}/phases/${phaseId}/deliverables?${params}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete deliverable");
  }
}

// Hook: Fetch deliverables
export function useDeliverables(projectId: string | null, phaseId: string | null) {
  return useQuery({
    queryKey: ["deliverables", projectId, phaseId],
    queryFn: () => fetchDeliverables(projectId!, phaseId!),
    enabled: !!projectId && !!phaseId,
  });
}

// Hook: Create deliverable
export function useCreateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeliverable,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deliverables", variables.projectId, variables.phaseId] });
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
    },
  });
}

// Hook: Update deliverable
export function useUpdateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDeliverable,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deliverables", variables.projectId, variables.phaseId] });
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
    },
  });
}

// Hook: Delete deliverable
export function useDeleteDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDeliverable,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deliverables", variables.projectId, variables.phaseId] });
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
    },
  });
}

// Hook: Complete deliverable
export function useCompleteDeliverable() {
  const updateDeliverable = useUpdateDeliverable();

  return {
    ...updateDeliverable,
    mutate: ({
      projectId,
      phaseId,
      deliverable,
    }: {
      projectId: string;
      phaseId: string;
      deliverable: ProjectDeliverableFromAPI;
    }) => {
      const status: DeliverableStatus = deliverable.status === "completed" ? "pending" : "completed";
      updateDeliverable.mutate({
        projectId,
        phaseId,
        deliverableId: deliverable.id,
        status,
      });
    },
  };
}

// =============================================================================
// ROLES
// =============================================================================

async function fetchRoles(projectId: string): Promise<ProjectRoleFromAPI[]> {
  const response = await fetch(`/api/projects/${projectId}/roles`);

  if (!response.ok) {
    throw new Error("Failed to fetch roles");
  }

  return response.json();
}

async function createRole({
  projectId,
  ...data
}: {
  projectId: string;
  name: string;
  description?: string | null;
  color?: string;
  is_ai_agent?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<ProjectRoleFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create role");
  }

  return response.json();
}

async function updateRole({
  projectId,
  roleId,
  ...updates
}: {
  projectId: string;
  roleId: string;
  name?: string;
  description?: string | null;
  color?: string;
  is_ai_agent?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<ProjectRoleFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/roles/${roleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update role");
  }

  return response.json();
}

async function deleteRole({
  projectId,
  roleId,
}: {
  projectId: string;
  roleId: string;
}): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/roles/${roleId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete role");
  }
}

// Hook: Fetch roles
export function useRoles(projectId: string | null) {
  return useQuery({
    queryKey: ["roles", projectId],
    queryFn: () => fetchRoles(projectId!),
    enabled: !!projectId,
  });
}

// Hook: Create role
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRole,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles", variables.projectId] });
    },
  });
}

// Hook: Update role
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRole,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
    },
  });
}

// Hook: Delete role
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRole,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
    },
  });
}

// =============================================================================
// PHASE ASSIGNMENTS
// =============================================================================

async function fetchAssignments(
  projectId: string,
  phaseId: string
): Promise<AssignmentWithRelations[]> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/assignments`);

  if (!response.ok) {
    throw new Error("Failed to fetch assignments");
  }

  return response.json();
}

async function createAssignment({
  projectId,
  phaseId,
  ...data
}: {
  projectId: string;
  phaseId: string;
  role_id?: string | null;
  user_id?: string | null;
  assignment_type?: PhaseAssignmentType;
}): Promise<AssignmentWithRelations> {
  const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create assignment");
  }

  return response.json();
}

async function deleteAssignment({
  projectId,
  phaseId,
  assignmentId,
}: {
  projectId: string;
  phaseId: string;
  assignmentId: string;
}): Promise<void> {
  const params = new URLSearchParams({ assignmentId });
  const response = await fetch(
    `/api/projects/${projectId}/phases/${phaseId}/assignments?${params}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete assignment");
  }
}

// Hook: Fetch assignments
export function useAssignments(projectId: string | null, phaseId: string | null) {
  return useQuery({
    queryKey: ["assignments", projectId, phaseId],
    queryFn: () => fetchAssignments(projectId!, phaseId!),
    enabled: !!projectId && !!phaseId,
  });
}

// Hook: Create assignment
export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAssignment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assignments", variables.projectId, variables.phaseId] });
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
    },
  });
}

// Hook: Delete assignment
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAssignment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assignments", variables.projectId, variables.phaseId] });
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["phase", variables.projectId, variables.phaseId] });
    },
  });
}

// =============================================================================
// APPLY TEMPLATE
// =============================================================================

interface ApplyTemplateResult {
  success: boolean;
  template_name: string;
  phases: PhaseWithDetails[];
  roles: ProjectRoleFromAPI[];
}

async function applyTemplate({
  projectId,
  templateId,
}: {
  projectId: string;
  templateId: string;
}): Promise<ApplyTemplateResult> {
  const response = await fetch(`/api/projects/${projectId}/apply-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template_id: templateId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to apply template");
  }

  return response.json();
}

// Hook: Apply template
export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyTemplate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["phases", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["workstreams", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["roles", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

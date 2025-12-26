"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceRole } from "@scholaros/shared";
import { queryKeys } from "@/app/providers";

// Types for API responses
export interface WorkspaceFromAPI {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface WorkspaceMemberFromAPI {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  joined_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface WorkspaceInviteFromAPI {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export interface WorkspaceWithRoleFromAPI extends WorkspaceFromAPI {
  role: WorkspaceRole;
  member_count?: number;
}

// API Functions
async function fetchUserWorkspaces(): Promise<WorkspaceWithRoleFromAPI[]> {
  const response = await fetch("/api/workspaces");
  if (!response.ok) {
    throw new Error("Failed to fetch workspaces");
  }
  return response.json();
}

async function fetchWorkspace(id: string): Promise<WorkspaceFromAPI> {
  const response = await fetch(`/api/workspaces/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch workspace");
  }
  return response.json();
}

async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberFromAPI[]> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members`);
  if (!response.ok) {
    throw new Error("Failed to fetch members");
  }
  return response.json();
}

async function fetchWorkspaceInvites(workspaceId: string): Promise<WorkspaceInviteFromAPI[]> {
  const response = await fetch(`/api/workspaces/${workspaceId}/invites`);
  if (!response.ok) {
    throw new Error("Failed to fetch invites");
  }
  return response.json();
}

async function createWorkspace(data: { name: string; slug: string }): Promise<WorkspaceFromAPI> {
  const response = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create workspace");
  }
  return response.json();
}

async function updateWorkspace(
  id: string,
  data: { name?: string; settings?: Record<string, unknown> }
): Promise<WorkspaceFromAPI> {
  const response = await fetch(`/api/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update workspace");
  }
  return response.json();
}

async function inviteMember(
  workspaceId: string,
  data: { email: string; role: WorkspaceRole }
): Promise<WorkspaceInviteFromAPI> {
  const response = await fetch(`/api/workspaces/${workspaceId}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to invite member");
  }
  return response.json();
}

async function cancelInvite(workspaceId: string, inviteId: string): Promise<void> {
  const response = await fetch(`/api/workspaces/${workspaceId}/invites/${inviteId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to cancel invite");
  }
}

async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole
): Promise<WorkspaceMemberFromAPI> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update member role");
  }
  return response.json();
}

async function removeMember(workspaceId: string, memberId: string): Promise<void> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove member");
  }
}

async function acceptInvite(token: string): Promise<{ workspace_id: string; role: WorkspaceRole }> {
  const response = await fetch("/api/workspaces/accept-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to accept invite");
  }
  return response.json();
}

// Hooks
export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.lists(),
    queryFn: fetchUserWorkspaces,
  });
}

export function useWorkspace(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.workspaces.detail(id) : queryKeys.workspaces.all,
    queryFn: () => (id ? fetchWorkspace(id) : null),
    enabled: !!id,
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceId ? queryKeys.workspaces.members(workspaceId) : queryKeys.workspaces.all,
    queryFn: () => (workspaceId ? fetchWorkspaceMembers(workspaceId) : []),
    enabled: !!workspaceId,
  });
}

export function useWorkspaceInvites(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-invites", workspaceId] as const,
    queryFn: () => (workspaceId ? fetchWorkspaceInvites(workspaceId) : []),
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; settings?: Record<string, unknown> }) =>
      updateWorkspace(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      email,
      role,
    }: {
      workspaceId: string;
      email: string;
      role: WorkspaceRole;
    }) => inviteMember(workspaceId, { email, role }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invites", variables.workspaceId] });
    },
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, inviteId }: { workspaceId: string; inviteId: string }) =>
      cancelInvite(workspaceId, inviteId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invites", variables.workspaceId] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      memberId,
      role,
    }: {
      workspaceId: string;
      memberId: string;
      role: WorkspaceRole;
    }) => updateMemberRole(workspaceId, memberId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(variables.workspaceId) });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, memberId }: { workspaceId: string; memberId: string }) =>
      removeMember(workspaceId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(variables.workspaceId) });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkspaceRole } from "@scholaros/shared";

export interface WorkspaceState {
  // Current active workspace
  currentWorkspaceId: string | null;
  currentWorkspaceRole: WorkspaceRole | null;

  // Actions
  setCurrentWorkspace: (id: string | null, role: WorkspaceRole | null) => void;
  clearCurrentWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,

      setCurrentWorkspace: (id, role) =>
        set({
          currentWorkspaceId: id,
          currentWorkspaceRole: role,
        }),

      clearCurrentWorkspace: () =>
        set({
          currentWorkspaceId: null,
          currentWorkspaceRole: null,
        }),
    }),
    {
      name: "workspace-storage",
    }
  )
);

// Helper to check permissions
export function canManageWorkspace(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canEditTasks(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canViewTasks(role: WorkspaceRole | null): boolean {
  return role !== null; // All roles can view
}

export function canInviteMembers(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canRemoveMembers(role: WorkspaceRole | null): boolean {
  return role === "owner";
}

import { describe, it, expect, beforeEach } from "vitest";
import {
  useWorkspaceStore,
  canManageWorkspace,
  canEditTasks,
  canViewTasks,
  canInviteMembers,
  canRemoveMembers,
} from "@/lib/stores/workspace-store";
import type { WorkspaceRole } from "@scholaros/shared";

const initialState = {
  currentWorkspaceId: null,
  currentWorkspaceRole: null,
};

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.setState(initialState);
  });

  describe("initial state", () => {
    it("should have null currentWorkspaceId", () => {
      expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    });

    it("should have null currentWorkspaceRole", () => {
      expect(useWorkspaceStore.getState().currentWorkspaceRole).toBeNull();
    });
  });

  describe("setCurrentWorkspace", () => {
    it("should set workspace id and role", () => {
      useWorkspaceStore.getState().setCurrentWorkspace("ws-1", "owner");
      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspaceId).toBe("ws-1");
      expect(state.currentWorkspaceRole).toBe("owner");
    });

    it("should update workspace id and role on subsequent calls", () => {
      useWorkspaceStore.getState().setCurrentWorkspace("ws-1", "owner");
      useWorkspaceStore.getState().setCurrentWorkspace("ws-2", "member");
      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspaceId).toBe("ws-2");
      expect(state.currentWorkspaceRole).toBe("member");
    });

    it("should allow setting to null", () => {
      useWorkspaceStore.getState().setCurrentWorkspace("ws-1", "admin");
      useWorkspaceStore.getState().setCurrentWorkspace(null, null);
      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspaceId).toBeNull();
      expect(state.currentWorkspaceRole).toBeNull();
    });
  });

  describe("clearCurrentWorkspace", () => {
    it("should reset workspace to null", () => {
      useWorkspaceStore.getState().setCurrentWorkspace("ws-1", "owner");
      useWorkspaceStore.getState().clearCurrentWorkspace();
      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspaceId).toBeNull();
      expect(state.currentWorkspaceRole).toBeNull();
    });

    it("should be safe to call when already null", () => {
      useWorkspaceStore.getState().clearCurrentWorkspace();
      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspaceId).toBeNull();
      expect(state.currentWorkspaceRole).toBeNull();
    });
  });
});

describe("permission helpers", () => {
  const roles: (WorkspaceRole | null)[] = ["owner", "admin", "member", "limited", null];

  describe("canManageWorkspace", () => {
    it("should return true for owner", () => {
      expect(canManageWorkspace("owner")).toBe(true);
    });

    it("should return true for admin", () => {
      expect(canManageWorkspace("admin")).toBe(true);
    });

    it("should return false for member", () => {
      expect(canManageWorkspace("member")).toBe(false);
    });

    it("should return false for limited", () => {
      expect(canManageWorkspace("limited")).toBe(false);
    });

    it("should return false for null", () => {
      expect(canManageWorkspace(null)).toBe(false);
    });
  });

  describe("canEditTasks", () => {
    it("should return true for owner", () => {
      expect(canEditTasks("owner")).toBe(true);
    });

    it("should return true for admin", () => {
      expect(canEditTasks("admin")).toBe(true);
    });

    it("should return true for member", () => {
      expect(canEditTasks("member")).toBe(true);
    });

    it("should return false for limited", () => {
      expect(canEditTasks("limited")).toBe(false);
    });

    it("should return false for null", () => {
      expect(canEditTasks(null)).toBe(false);
    });
  });

  describe("canViewTasks", () => {
    it("should return true for all valid roles", () => {
      for (const role of roles.filter((r) => r !== null)) {
        expect(canViewTasks(role)).toBe(true);
      }
    });

    it("should return false for null", () => {
      expect(canViewTasks(null)).toBe(false);
    });
  });

  describe("canInviteMembers", () => {
    it("should return true for owner", () => {
      expect(canInviteMembers("owner")).toBe(true);
    });

    it("should return true for admin", () => {
      expect(canInviteMembers("admin")).toBe(true);
    });

    it("should return false for member", () => {
      expect(canInviteMembers("member")).toBe(false);
    });

    it("should return false for limited", () => {
      expect(canInviteMembers("limited")).toBe(false);
    });

    it("should return false for null", () => {
      expect(canInviteMembers(null)).toBe(false);
    });
  });

  describe("canRemoveMembers", () => {
    it("should return true only for owner", () => {
      expect(canRemoveMembers("owner")).toBe(true);
    });

    it("should return false for admin", () => {
      expect(canRemoveMembers("admin")).toBe(false);
    });

    it("should return false for member", () => {
      expect(canRemoveMembers("member")).toBe(false);
    });

    it("should return false for limited", () => {
      expect(canRemoveMembers("limited")).toBe(false);
    });

    it("should return false for null", () => {
      expect(canRemoveMembers(null)).toBe(false);
    });
  });

  describe("role hierarchy", () => {
    it("owner should have all permissions", () => {
      expect(canManageWorkspace("owner")).toBe(true);
      expect(canEditTasks("owner")).toBe(true);
      expect(canViewTasks("owner")).toBe(true);
      expect(canInviteMembers("owner")).toBe(true);
      expect(canRemoveMembers("owner")).toBe(true);
    });

    it("admin should have all except remove members", () => {
      expect(canManageWorkspace("admin")).toBe(true);
      expect(canEditTasks("admin")).toBe(true);
      expect(canViewTasks("admin")).toBe(true);
      expect(canInviteMembers("admin")).toBe(true);
      expect(canRemoveMembers("admin")).toBe(false);
    });

    it("member should only edit/view tasks", () => {
      expect(canManageWorkspace("member")).toBe(false);
      expect(canEditTasks("member")).toBe(true);
      expect(canViewTasks("member")).toBe(true);
      expect(canInviteMembers("member")).toBe(false);
      expect(canRemoveMembers("member")).toBe(false);
    });

    it("limited should only view tasks", () => {
      expect(canManageWorkspace("limited")).toBe(false);
      expect(canEditTasks("limited")).toBe(false);
      expect(canViewTasks("limited")).toBe(true);
      expect(canInviteMembers("limited")).toBe(false);
      expect(canRemoveMembers("limited")).toBe(false);
    });

    it("null role should have no permissions", () => {
      expect(canManageWorkspace(null)).toBe(false);
      expect(canEditTasks(null)).toBe(false);
      expect(canViewTasks(null)).toBe(false);
      expect(canInviteMembers(null)).toBe(false);
      expect(canRemoveMembers(null)).toBe(false);
    });
  });
});

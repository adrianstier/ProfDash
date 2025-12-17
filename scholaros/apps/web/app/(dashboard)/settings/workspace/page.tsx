"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Settings, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import {
  useWorkspaces,
  useWorkspace,
  useUpdateWorkspace,
  useWorkspaceMembers,
  useWorkspaceInvites,
  useInviteMember,
  useCancelInvite,
  useUpdateMemberRole,
  useRemoveMember,
} from "@/lib/hooks/use-workspaces";
import { useWorkspaceStore, canManageWorkspace, canInviteMembers, canRemoveMembers } from "@/lib/stores/workspace-store";
import type { WorkspaceRole } from "@scholaros/shared";

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  limited: "Limited",
};

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const { currentWorkspaceId, currentWorkspaceRole } = useWorkspaceStore();
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(currentWorkspaceId);
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(currentWorkspaceId);
  const { data: invites = [], isLoading: invitesLoading } = useWorkspaceInvites(currentWorkspaceId);

  const updateWorkspace = useUpdateWorkspace();
  const inviteMember = useInviteMember();
  const cancelInvite = useCancelInvite();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [activeTab, setActiveTab] = useState<"general" | "members">("general");
  const [workspaceName, setWorkspaceName] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");

  // Initialize name from workspace
  if (workspace && !workspaceName) {
    setWorkspaceName(workspace.name);
  }

  const handleSaveSettings = async () => {
    if (!currentWorkspaceId || !workspaceName.trim()) return;
    await updateWorkspace.mutateAsync({
      id: currentWorkspaceId,
      name: workspaceName.trim(),
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId || !inviteEmail.trim()) return;

    await inviteMember.mutateAsync({
      workspaceId: currentWorkspaceId,
      email: inviteEmail.trim(),
      role: inviteRole,
    });

    setInviteEmail("");
    setShowInviteModal(false);
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!currentWorkspaceId) return;
    await cancelInvite.mutateAsync({
      workspaceId: currentWorkspaceId,
      inviteId,
    });
  };

  const handleUpdateRole = async (memberId: string, newRole: WorkspaceRole) => {
    if (!currentWorkspaceId) return;
    await updateMemberRole.mutateAsync({
      workspaceId: currentWorkspaceId,
      memberId,
      role: newRole,
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspaceId) return;
    if (confirm("Are you sure you want to remove this member?")) {
      await removeMember.mutateAsync({
        workspaceId: currentWorkspaceId,
        memberId,
      });
    }
  };

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium">No workspace selected</p>
        <p className="text-muted-foreground">Select a workspace from the sidebar</p>
      </div>
    );
  }

  const canEdit = canManageWorkspace(currentWorkspaceRole);
  const canInvite = canInviteMembers(currentWorkspaceRole);
  const canRemove = canRemoveMembers(currentWorkspaceRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="rounded-md p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Workspace Settings</h1>
          <p className="text-muted-foreground">{workspace.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "general"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          General
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Members ({members.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "general" && (
        <div className="max-w-xl space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Workspace Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!canEdit}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <input
                  type="text"
                  value={workspace.slug}
                  disabled
                  className="mt-1 w-full rounded-md border bg-muted px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  URL-friendly identifier (cannot be changed)
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={handleSaveSettings}
                  disabled={updateWorkspace.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateWorkspace.isPending ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Your Role</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You are a <span className="font-medium text-foreground">{roleLabels[currentWorkspaceRole!]}</span> in this workspace.
            </p>
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-6">
          {/* Invite Button */}
          {canInvite && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Invite Member
              </button>
            </div>
          )}

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Pending Invites</h2>
              <div className="mt-4 space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-md border bg-muted/50 p-3"
                  >
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as {roleLabels[invite.role]} · Expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {canInvite && (
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        disabled={cancelInvite.isPending}
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Members</h2>
            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {member.profile?.full_name?.charAt(0) ||
                          member.profile?.email?.charAt(0) ||
                          "?"}
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.profile?.full_name || member.profile?.email || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canRemove && member.role !== "owner" ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as WorkspaceRole)}
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="limited">Limited</option>
                        </select>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-1 text-sm">
                          {roleLabels[member.role]}
                        </span>
                      )}
                      {canRemove && member.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removeMember.isPending}
                          className="rounded-md p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowInviteModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Invite Member</h2>
            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@university.edu"
                  required
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="admin">Admin - Can manage workspace</option>
                  <option value="member">Member - Can create and edit tasks</option>
                  <option value="limited">Limited - View only</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-md px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMember.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {inviteMember.isPending ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

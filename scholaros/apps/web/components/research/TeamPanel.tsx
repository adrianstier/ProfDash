"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Users,
  MapPin,
  Calendar,
  Loader2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useExperimentTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  TEAM_ROLE_CONFIG,
  getTeamRoleConfig,
} from "@/lib/hooks/use-experiment-team";
import { useFieldSites } from "@/lib/hooks/use-field-sites";
import type {
  ExperimentTeamAssignmentWithDetails,
  ExperimentTeamRole,
  Personnel,
} from "@scholaros/shared";

interface TeamPanelProps {
  projectId: string;
  experimentId: string;
  workspaceId: string;
  personnel: Personnel[];
  className?: string;
}

export function TeamPanel({
  projectId,
  experimentId,
  workspaceId,
  personnel,
  className,
}: TeamPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: teamAssignments = [], isLoading } = useExperimentTeam(
    projectId,
    experimentId
  );
  const { data: sites = [] } = useFieldSites(workspaceId, true);
  const removeTeamMember = useRemoveTeamMember(projectId, experimentId);

  // Filter out already assigned personnel
  const assignedIds = new Set(teamAssignments.map((a) => a.personnel_id));
  const availablePersonnel = personnel.filter((p) => !assignedIds.has(p.id));

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeTeamMember.mutateAsync(assignmentId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to remove team member:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group by role
  const byRole = teamAssignments.reduce(
    (acc, assignment) => {
      const role = assignment.role;
      if (!acc[role]) acc[role] = [];
      acc[role].push(assignment);
      return acc;
    },
    {} as Record<ExperimentTeamRole, ExperimentTeamAssignmentWithDetails[]>
  );

  const roleOrder: ExperimentTeamRole[] = ["lead", "co_lead", "contributor", "field_assistant"];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Team Members</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {teamAssignments.length}
          </span>
        </div>
        {availablePersonnel.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Team list by role */}
      {teamAssignments.length === 0 ? (
        <EmptyTeam
          hasAvailable={availablePersonnel.length > 0}
          onAdd={() => setShowAddForm(true)}
        />
      ) : (
        <div className="space-y-4">
          {roleOrder.map((role) => {
            const members = byRole[role];
            if (!members || members.length === 0) return null;

            const roleConfig = getTeamRoleConfig(role);

            return (
              <div key={role} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {roleConfig.label}s ({members.length})
                </h4>
                <div className="space-y-2">
                  {members.map((assignment) => (
                    <TeamMemberCard
                      key={assignment.id}
                      assignment={assignment}
                      sites={sites}
                      onRemove={() => setDeleteConfirm(assignment.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add member form */}
      {showAddForm && (
        <AddMemberModal
          projectId={projectId}
          experimentId={experimentId}
          workspaceId={workspaceId}
          availablePersonnel={availablePersonnel}
          sites={sites}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          memberName={
            teamAssignments.find((a) => a.id === deleteConfirm)?.personnel?.name ??
            "this member"
          }
          isDeleting={removeTeamMember.isPending}
          onConfirm={() => handleRemove(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Team Member Card
// ============================================================================

interface TeamMemberCardProps {
  assignment: ExperimentTeamAssignmentWithDetails;
  sites: Array<{ id: string; name: string; code?: string | null }>;
  onRemove: () => void;
}

function TeamMemberCard({ assignment, sites, onRemove }: TeamMemberCardProps) {
  const roleConfig = getTeamRoleConfig(assignment.role);

  // Get site names from site_access array
  const siteNames =
    assignment.site_access
      ?.map((siteId) => sites.find((s) => s.id === siteId)?.name)
      .filter(Boolean)
      .join(", ") || "None";

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return null;
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="group flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{assignment.personnel?.name}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              roleConfig.bgColor,
              roleConfig.textColor
            )}
          >
            {roleConfig.label}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {assignment.personnel?.email && (
            <span>{assignment.personnel.email}</span>
          )}

          {assignment.site_access && assignment.site_access.length > 0 && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{siteNames}</span>
            </div>
          )}

          {(assignment.start_date || assignment.end_date) && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDate(assignment.start_date) || "—"} to{" "}
                {formatDate(assignment.end_date) || "—"}
              </span>
            </div>
          )}
        </div>

        {assignment.notes && (
          <p className="mt-1 text-sm text-muted-foreground">{assignment.notes}</p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="rounded p-1.5 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        title="Remove from team"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyTeamProps {
  hasAvailable: boolean;
  onAdd: () => void;
}

function EmptyTeam({ hasAvailable, onAdd }: EmptyTeamProps) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <UserPlus className="mx-auto h-10 w-10 text-muted-foreground/50" />
      <h4 className="mt-3 font-medium">No team members assigned</h4>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAvailable
          ? "Add team members to this experiment to track who's working on it."
          : "Add personnel to your workspace first."}
      </p>
      {hasAvailable && (
        <button
          onClick={onAdd}
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Team Member
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Add Member Modal
// ============================================================================

interface AddMemberModalProps {
  projectId: string;
  experimentId: string;
  workspaceId: string;
  availablePersonnel: Personnel[];
  sites: Array<{ id: string; name: string; code?: string | null }>;
  onClose: () => void;
}

function AddMemberModal({
  projectId,
  experimentId,
  availablePersonnel,
  sites,
  onClose,
}: AddMemberModalProps) {
  const addTeamMember = useAddTeamMember(projectId, experimentId);

  const [formData, setFormData] = useState({
    personnel_id: "",
    role: "contributor" as ExperimentTeamRole,
    site_access: [] as string[],
    start_date: "",
    end_date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addTeamMember.mutateAsync({
        personnel_id: formData.personnel_id,
        role: formData.role,
        site_access: formData.site_access.length > 0 ? formData.site_access : undefined,
        start_date: formData.start_date ? new Date(formData.start_date) : undefined,
        end_date: formData.end_date ? new Date(formData.end_date) : undefined,
        notes: formData.notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to add team member:", error);
    }
  };

  const toggleSiteAccess = (siteId: string) => {
    setFormData({
      ...formData,
      site_access: formData.site_access.includes(siteId)
        ? formData.site_access.filter((id) => id !== siteId)
        : [...formData.site_access, siteId],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Add Team Member</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Person select */}
          <div>
            <label className="text-sm font-medium">
              Person <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.personnel_id}
              onChange={(e) => setFormData({ ...formData, personnel_id: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              required
            >
              <option value="">Select a person...</option>
              {availablePersonnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.role && `(${p.role})`}
                </option>
              ))}
            </select>
          </div>

          {/* Role select */}
          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as ExperimentTeamRole })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(TEAM_ROLE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Site access */}
          {sites.length > 0 && (
            <div>
              <label className="text-sm font-medium">Site Access</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {sites.map((site) => (
                  <label
                    key={site.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
                      formData.site_access.includes(site.id)
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.site_access.includes(site.id)}
                      onChange={() => toggleSiteAccess(site.id)}
                      className="sr-only"
                    />
                    {site.name}
                    {site.code && <span className="text-muted-foreground">({site.code})</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any notes about this assignment..."
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addTeamMember.isPending || !formData.personnel_id}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {addTeamMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Delete Confirmation
// ============================================================================

interface DeleteConfirmDialogProps {
  memberName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  memberName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Remove Team Member</h3>
        <p className="mt-2 text-muted-foreground">
          Are you sure you want to remove {memberName} from this experiment?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

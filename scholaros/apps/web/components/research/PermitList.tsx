"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Loader2,
  FileCheck,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePermits,
  useDeletePermit,
  PERMIT_STATUS_CONFIG,
  PERMIT_TYPE_CONFIG,
} from "@/lib/hooks/use-permits";
import { PermitCard } from "./PermitCard";
import { PermitModal } from "./PermitModal";
import type { PermitWithDetails, PermitStatus, PermitType } from "@scholaros/shared";

interface PermitListProps {
  projectId: string;
  workspaceId: string;
  className?: string;
}

export function PermitList({
  projectId,
  workspaceId,
  className,
}: PermitListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PermitStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<PermitType | "">("");
  const [showExpired, setShowExpired] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPermit, setEditingPermit] = useState<PermitWithDetails | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: permits = [], isLoading } = usePermits(projectId, {
    status: statusFilter || undefined,
    permitType: typeFilter || undefined,
    includeExpired: showExpired,
  });
  const deletePermit = useDeletePermit(projectId);

  // Filter by search term
  const filteredPermits = permits.filter((permit) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      permit.title.toLowerCase().includes(searchLower) ||
      permit.permit_number?.toLowerCase().includes(searchLower) ||
      permit.issuing_authority?.toLowerCase().includes(searchLower) ||
      permit.pi_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (permit: PermitWithDetails) => {
    setEditingPermit(permit);
    setShowModal(true);
  };

  const handleDelete = async (permitId: string) => {
    try {
      await deletePermit.mutateAsync(permitId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete permit:", error);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPermit(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permits..."
            className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PermitType | "")}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {Object.entries(PERMIT_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PermitStatus | "")}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(PERMIT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Show expired toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              className="rounded border"
            />
            Show expired
          </label>

          {/* Add button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Permit
          </button>
        </div>
      </div>

      {/* Permits display */}
      {filteredPermits.length === 0 ? (
        <EmptyState
          hasFilters={!!(search || statusFilter || typeFilter)}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("");
            setTypeFilter("");
          }}
          onAdd={() => setShowModal(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPermits.map((permit) => (
            <PermitCard
              key={permit.id}
              permit={permit}
              onEdit={() => handleEdit(permit)}
              onDelete={() => setDeleteConfirm(permit.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <PermitModal
          projectId={projectId}
          workspaceId={workspaceId}
          permit={editingPermit}
          onClose={handleModalClose}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          permitTitle={
            permits.find((p) => p.id === deleteConfirm)?.title ?? "this permit"
          }
          isDeleting={deletePermit.isPending}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAdd: () => void;
}

function EmptyState({ hasFilters, onClearFilters, onAdd }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Filter className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h4 className="mt-4 text-lg font-medium">No permits match your filters</h4>
        <p className="mt-2 text-sm text-muted-foreground">
          Try adjusting your search or filter criteria.
        </p>
        <button
          onClick={onClearFilters}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h4 className="mt-4 text-lg font-medium">No permits yet</h4>
      <p className="mt-2 text-sm text-muted-foreground">
        Add permits to track IACUC, collection, and other research authorizations.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Add Your First Permit
      </button>
    </div>
  );
}

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

interface DeleteConfirmDialogProps {
  permitTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  permitTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Delete Permit</h3>
        <p className="mt-2 text-muted-foreground">
          Are you sure you want to delete &quot;{permitTitle}&quot;? This action
          cannot be undone.
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
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

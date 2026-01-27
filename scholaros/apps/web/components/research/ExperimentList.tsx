"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Loader2,
  FlaskConical,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useExperiments,
  useDeleteExperiment,
  EXPERIMENT_STATUS_CONFIG,
} from "@/lib/hooks/use-experiments";
import { useFieldSites } from "@/lib/hooks/use-field-sites";
import { ExperimentCard } from "./ExperimentCard";
import { ExperimentModal } from "./ExperimentModal";
import type { ExperimentWithDetails, ExperimentStatus } from "@scholaros/shared";

interface ExperimentListProps {
  projectId: string;
  workspaceId: string;
  className?: string;
}

type ViewMode = "grid" | "list";

export function ExperimentList({
  projectId,
  workspaceId,
  className,
}: ExperimentListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | "">("");
  const [siteFilter, setSiteFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<ExperimentWithDetails | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: experiments = [], isLoading } = useExperiments(projectId, {
    status: statusFilter || undefined,
    siteId: siteFilter || undefined,
  });
  const { data: sites = [] } = useFieldSites(workspaceId, true);
  const deleteExperiment = useDeleteExperiment(projectId);

  // Filter by search term
  const filteredExperiments = experiments.filter((exp) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      exp.title.toLowerCase().includes(searchLower) ||
      exp.code?.toLowerCase().includes(searchLower) ||
      exp.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (experiment: ExperimentWithDetails) => {
    setEditingExperiment(experiment);
    setShowModal(true);
  };

  const handleDelete = async (experimentId: string) => {
    try {
      await deleteExperiment.mutateAsync(experimentId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete experiment:", error);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingExperiment(null);
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
            placeholder="Search experiments..."
            className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExperimentStatus | "")}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(EXPERIMENT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Site filter */}
          {sites.length > 0 && (
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          )}

          {/* View toggle */}
          <div className="flex items-center rounded-md border">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-l-md",
                viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50"
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-r-md",
                viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Experiment
          </button>
        </div>
      </div>

      {/* Experiments display */}
      {filteredExperiments.length === 0 ? (
        <EmptyState
          hasFilters={!!(search || statusFilter || siteFilter)}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("");
            setSiteFilter("");
          }}
          onAdd={() => setShowModal(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExperiments.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              projectId={projectId}
              onEdit={() => handleEdit(experiment)}
              onDelete={() => setDeleteConfirm(experiment.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExperiments.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              projectId={projectId}
              onEdit={() => handleEdit(experiment)}
              onDelete={() => setDeleteConfirm(experiment.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ExperimentModal
          projectId={projectId}
          workspaceId={workspaceId}
          experiment={editingExperiment}
          onClose={handleModalClose}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          experimentTitle={
            experiments.find((e) => e.id === deleteConfirm)?.title ?? "this experiment"
          }
          isDeleting={deleteExperiment.isPending}
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
        <h4 className="mt-4 text-lg font-medium">No experiments match your filters</h4>
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
      <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h4 className="mt-4 text-lg font-medium">No experiments yet</h4>
      <p className="mt-2 text-sm text-muted-foreground">
        Create experiments to organize your research activities.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Add Your First Experiment
      </button>
    </div>
  );
}

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

interface DeleteConfirmDialogProps {
  experimentTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  experimentTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Delete Experiment</h3>
        <p className="mt-2 text-muted-foreground">
          Are you sure you want to delete &quot;{experimentTitle}&quot;? This will also
          remove all associated team assignments, fieldwork schedules, and linked
          tasks. This action cannot be undone.
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

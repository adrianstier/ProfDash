"use client";

import { useState } from "react";
import {
  Plus,
  Check,
  FileText,
  Code,
  Database,
  FileBarChart,
  Presentation,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Upload,
} from "lucide-react";
import {
  useDeliverables,
  useCreateDeliverable,
  useCompleteDeliverable,
  useDeleteDeliverable,
  type DeliverableWithRelations,
} from "@/lib/hooks/use-project-hierarchy";
import type { DeliverableArtifactType } from "@scholaros/shared";

interface DeliverableListProps {
  projectId: string;
  phaseId: string;
  compact?: boolean;
}

const artifactIcons: Record<DeliverableArtifactType, React.ElementType> = {
  document: FileText,
  code: Code,
  data: Database,
  report: FileBarChart,
  presentation: Presentation,
  other: FileText,
};

export function DeliverableList({
  projectId,
  phaseId,
  compact = false,
}: DeliverableListProps) {
  const { data: deliverables = [], isLoading } = useDeliverables(projectId, phaseId);
  const createDeliverable = useCreateDeliverable();
  const completeDeliverable = useCompleteDeliverable();
  const deleteDeliverable = useDeleteDeliverable();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = async () => {
    if (!newTitle.trim()) return;

    try {
      await createDeliverable.mutateAsync({
        projectId,
        phaseId,
        title: newTitle,
        artifact_type: "document",
      });
      setNewTitle("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to create deliverable:", error);
    }
  };

  const handleToggleComplete = (deliverable: DeliverableWithRelations) => {
    completeDeliverable.mutate({ projectId, phaseId, deliverable });
  };

  const handleDelete = async (deliverableId: string) => {
    if (!confirm("Delete this deliverable?")) return;
    try {
      await deleteDeliverable.mutateAsync({ projectId, phaseId, deliverableId });
    } catch (error) {
      console.error("Failed to delete deliverable:", error);
    }
  };

  const completedCount = deliverables.filter((d) => d.status === "completed").length;

  if (isLoading) {
    return (
      <div className="space-y-1 animate-pulse">
        <div className="h-6 w-full rounded bg-muted" />
        <div className="h-6 w-full rounded bg-muted" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="text-xs text-muted-foreground">
        Deliverables: {completedCount}/{deliverables.length} complete
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {deliverables.map((deliverable) => (
        <DeliverableItem
          key={deliverable.id}
          deliverable={deliverable}
          onToggleComplete={() => handleToggleComplete(deliverable)}
          onDelete={() => handleDelete(deliverable.id)}
        />
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2 rounded border bg-card p-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Deliverable title..."
            className="flex-1 bg-transparent text-sm outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewTitle("");
              }
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || createDeliverable.isPending}
            className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewTitle("");
            }}
            className="rounded px-2 py-1 text-xs hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex w-full items-center gap-1.5 rounded border border-dashed p-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          Add deliverable
        </button>
      )}
    </div>
  );
}

interface DeliverableItemProps {
  deliverable: DeliverableWithRelations;
  onToggleComplete: () => void;
  onDelete: () => void;
}

function DeliverableItem({
  deliverable,
  onToggleComplete,
  onDelete,
}: DeliverableItemProps) {
  const isCompleted = deliverable.status === "completed";
  const Icon = artifactIcons[deliverable.artifact_type || "document"];

  return (
    <div
      className={`group flex items-center gap-2 rounded border p-2 transition-colors ${
        isCompleted ? "bg-muted/50 opacity-75" : "bg-card hover:border-primary/30"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleComplete}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground hover:border-primary"
        }`}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>

      {/* Icon */}
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

      {/* Title */}
      <span
        className={`flex-1 truncate text-sm ${
          isCompleted ? "line-through text-muted-foreground" : ""
        }`}
      >
        {deliverable.title}
      </span>

      {/* Workstream badge */}
      {deliverable.workstream && (
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${deliverable.workstream.color}`}
        >
          {deliverable.workstream.title}
        </span>
      )}

      {/* Link/upload */}
      {deliverable.url && (
        <a
          href={deliverable.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {deliverable.file_path && (
        <span className="shrink-0 text-muted-foreground" title={deliverable.file_path}>
          <Upload className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Actions */}
      <button
        onClick={onDelete}
        className="shrink-0 rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </button>
    </div>
  );
}

export function DeliverableProgress({
  deliverables,
}: {
  deliverables: DeliverableWithRelations[];
}) {
  const completed = deliverables.filter((d) => d.status === "completed").length;
  const total = deliverables.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-1.5 w-16 rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-green-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span>
        {completed}/{total}
      </span>
    </div>
  );
}

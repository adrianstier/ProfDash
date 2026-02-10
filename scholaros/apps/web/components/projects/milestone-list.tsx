"use client";

import { useState } from "react";
import { Plus, Check, Calendar, Trash2, GripVertical } from "lucide-react";
import { parseLocalDate } from "@scholaros/shared";
import {
  useMilestones,
  useCreateMilestone,
  useDeleteMilestone,
  useToggleMilestoneComplete,
  type ProjectMilestoneFromAPI,
} from "@/lib/hooks/use-projects";

interface MilestoneListProps {
  projectId: string;
}

export function MilestoneList({ projectId }: MilestoneListProps) {
  const { data: milestones = [], isLoading } = useMilestones(projectId);
  const createMilestone = useCreateMilestone();
  const toggleComplete = useToggleMilestoneComplete();
  const deleteMilestone = useDeleteMilestone();

  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;

    try {
      await createMilestone.mutateAsync({
        projectId,
        title: newMilestoneTitle,
        sort_order: milestones.length,
      });
      setNewMilestoneTitle("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to create milestone:", error);
    }
  };

  const handleToggleComplete = (milestone: ProjectMilestoneFromAPI) => {
    toggleComplete.mutate({ projectId, milestone });
  };

  const handleDelete = async (milestoneId: string) => {
    if (!confirm("Delete this milestone?")) return;
    try {
      await deleteMilestone.mutateAsync({ projectId, milestoneId });
    } catch (error) {
      console.error("Failed to delete milestone:", error);
    }
  };

  const completedCount = milestones.filter((m) => m.completed_at).length;
  const progress = milestones.length > 0
    ? Math.round((completedCount / milestones.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-12 rounded bg-muted" />
        <div className="h-12 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">Milestones</h3>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{milestones.length}
          </span>
        </div>
        {milestones.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>

      {/* Milestone list */}
      <div className="space-y-2">
        {milestones.map((milestone) => (
          <MilestoneItem
            key={milestone.id}
            milestone={milestone}
            onToggleComplete={() => handleToggleComplete(milestone)}
            onDelete={() => handleDelete(milestone.id)}
          />
        ))}

        {/* Add new milestone */}
        {isAdding ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
            <input
              type="text"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              placeholder="Milestone title..."
              className="flex-1 bg-transparent text-sm outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddMilestone();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewMilestoneTitle("");
                }
              }}
            />
            <button
              onClick={handleAddMilestone}
              disabled={!newMilestoneTitle.trim() || createMilestone.isPending}
              className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewMilestoneTitle("");
              }}
              className="rounded px-3 py-1 text-xs hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed p-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add milestone
          </button>
        )}
      </div>
    </div>
  );
}

interface MilestoneItemProps {
  milestone: ProjectMilestoneFromAPI;
  onToggleComplete: () => void;
  onDelete: () => void;
}

function MilestoneItem({ milestone, onToggleComplete, onDelete }: MilestoneItemProps) {
  const isCompleted = !!milestone.completed_at;

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        isCompleted ? "bg-muted/50" : "bg-card hover:border-primary/50"
      }`}
    >
      {/* Drag handle (for future drag-and-drop) */}
      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />

      {/* Checkbox */}
      <button
        onClick={onToggleComplete}
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
          isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground hover:border-primary"
        }`}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isCompleted ? "text-muted-foreground line-through" : ""
          }`}
        >
          {milestone.title}
        </p>
        {milestone.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {milestone.description}
          </p>
        )}
      </div>

      {/* Due date */}
      {milestone.due_date && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {parseLocalDate(milestone.due_date).toLocaleDateString()}
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="rounded p-1 opacity-0 hover:bg-muted group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
    </div>
  );
}

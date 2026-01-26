"use client";

import { useState } from "react";
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Edit2,
  Loader2,
} from "lucide-react";
import {
  useWorkstreams,
  useCreateWorkstream,
  useUpdateWorkstream,
  useDeleteWorkstream,
  type WorkstreamWithStats,
} from "@/lib/hooks/use-project-hierarchy";

interface WorkstreamTabsProps {
  projectId: string;
  selectedId?: string | null;
  onSelect?: (workstreamId: string | null) => void;
}

const colorOptions = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-yellow-500",
  "bg-red-500",
];

export function WorkstreamTabs({
  projectId,
  selectedId,
  onSelect,
}: WorkstreamTabsProps) {
  const { data: workstreams = [], isLoading } = useWorkstreams(projectId);
  const createWorkstream = useCreateWorkstream();
  const deleteWorkstream = useDeleteWorkstream();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;

    // Pick a color that hasn't been used yet
    const usedColors = workstreams.map((w) => w.color);
    const availableColor =
      colorOptions.find((c) => !usedColors.includes(c)) || colorOptions[0];

    try {
      await createWorkstream.mutateAsync({
        projectId,
        title: newTitle,
        color: availableColor,
      });
      setNewTitle("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to create workstream:", error);
    }
  };

  const handleDelete = async (workstreamId: string) => {
    if (!confirm("Delete this workstream? Tasks will be unlinked but not deleted."))
      return;
    try {
      await deleteWorkstream.mutateAsync({ projectId, workstreamId });
      if (selectedId === workstreamId) {
        onSelect?.(null);
      }
    } catch (error) {
      console.error("Failed to delete workstream:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading workstreams...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Workstreams</h3>
      </div>

      {workstreams.length === 0 && !isAdding ? (
        <div className="rounded-lg border-2 border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No workstreams yet. Create workstreams to organize parallel work tracks.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add workstream
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* All workstreams tab */}
          <button
            onClick={() => onSelect?.(null)}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              !selectedId
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-muted"
            }`}
          >
            All
          </button>

          {/* Workstream tabs */}
          {workstreams.map((ws) => (
            <WorkstreamTab
              key={ws.id}
              workstream={ws}
              isSelected={selectedId === ws.id}
              onSelect={() => onSelect?.(ws.id)}
              onDelete={() => handleDelete(ws.id)}
              showMenu={activeMenu === ws.id}
              onToggleMenu={() =>
                setActiveMenu(activeMenu === ws.id ? null : ws.id)
              }
            />
          ))}

          {/* Add button */}
          {isAdding ? (
            <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Name..."
                className="w-24 bg-transparent text-sm outline-none"
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
                disabled={!newTitle.trim() || createWorkstream.isPending}
                className="rounded px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface WorkstreamTabProps {
  workstream: WorkstreamWithStats;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  showMenu: boolean;
  onToggleMenu: () => void;
}

function WorkstreamTab({
  workstream,
  isSelected,
  onSelect,
  onDelete,
  showMenu,
  onToggleMenu,
}: WorkstreamTabProps) {
  const taskCount = workstream.task_count || 0;
  const completedCount = workstream.completed_task_count || 0;
  const overdueCount = workstream.overdue_task_count || 0;

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
        isSelected
          ? "border-primary bg-primary/10"
          : "hover:bg-muted cursor-pointer"
      }`}
      onClick={onSelect}
    >
      {/* Color dot */}
      <span className={`h-2.5 w-2.5 rounded-full ${workstream.color}`} />

      {/* Title */}
      <span className="text-sm font-medium">{workstream.title}</span>

      {/* Stats */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{taskCount}</span>
        {overdueCount > 0 && (
          <span className="flex items-center text-red-500">
            <AlertCircle className="h-3 w-3 mr-0.5" />
            {overdueCount}
          </span>
        )}
      </div>

      {/* Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMenu();
        }}
        className="ml-1 rounded p-0.5 opacity-0 hover:bg-background/50 group-hover:opacity-100"
      >
        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0" onClick={onToggleMenu} />
          <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border bg-popover p-1 shadow-md">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

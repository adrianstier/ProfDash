"use client";

import { useState } from "react";
import { Plus, FileText, Loader2 } from "lucide-react";
import {
  usePhases,
  useCreatePhase,
  type PhaseWithDetails,
} from "@/lib/hooks/use-project-hierarchy";
import { PhaseCard } from "./PhaseCard";

interface PhaseTimelineProps {
  projectId: string;
  onApplyTemplate?: () => void;
}

export function PhaseTimeline({ projectId, onApplyTemplate }: PhaseTimelineProps) {
  const { data: phases = [], isLoading, error } = usePhases(projectId);
  const createPhase = useCreatePhase();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Build a map of phase IDs to phases for blocking lookup
  const phaseMap = new Map<string, PhaseWithDetails>();
  phases.forEach((p) => phaseMap.set(p.id, p));

  const getBlockingPhases = (phase: PhaseWithDetails): PhaseWithDetails[] => {
    return (phase.blocked_by || [])
      .map((id) => phaseMap.get(id))
      .filter((p): p is PhaseWithDetails => p !== undefined && p.status !== "completed");
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;

    try {
      const blockedBy =
        phases.length > 0 ? [phases[phases.length - 1].id] : [];
      await createPhase.mutateAsync({
        projectId,
        title: newTitle,
        blocked_by: blockedBy,
      });
      setNewTitle("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to create phase:", error);
    }
  };

  // Calculate overall progress
  const completedPhases = phases.filter((p) => p.status === "completed").length;
  const progress =
    phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20">
        Failed to load phases: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Phases</h3>
          <span className="text-sm text-muted-foreground">
            {completedPhases}/{phases.length} complete
          </span>
          {phases.length > 0 && (
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

        {onApplyTemplate && phases.length === 0 && (
          <button
            onClick={onApplyTemplate}
            className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            Apply Template
          </button>
        )}
      </div>

      {/* Empty state */}
      {phases.length === 0 && !isAdding && (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h4 className="mt-3 font-medium">No phases yet</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Add phases to structure your project, or apply a template.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add Phase
            </button>
            {onApplyTemplate && (
              <button
                onClick={onApplyTemplate}
                className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <FileText className="h-4 w-4" />
                Apply Template
              </button>
            )}
          </div>
        </div>
      )}

      {/* Phase list */}
      {phases.length > 0 && (
        <div className="space-y-3">
          {phases.map((phase, index) => (
            <div key={phase.id} className="relative">
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute left-6 -top-3 h-3 w-0.5 bg-border" />
              )}
              <PhaseCard
                projectId={projectId}
                phase={phase}
                blockingPhases={getBlockingPhases(phase)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add new phase */}
      {isAdding ? (
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Phase title..."
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
            disabled={!newTitle.trim() || createPhase.isPending}
            className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewTitle("");
            }}
            className="rounded px-3 py-1 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        phases.length > 0 && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add Phase
          </button>
        )
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Play,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit2,
  Users,
} from "lucide-react";
import {
  useStartPhase,
  useCompletePhase,
  useDeletePhase,
  type PhaseWithDetails,
} from "@/lib/hooks/use-project-hierarchy";
import { DeliverableList, DeliverableProgress } from "./DeliverableList";
import type { PhaseStatus } from "@scholaros/shared";

interface PhaseCardProps {
  projectId: string;
  phase: PhaseWithDetails;
  blockingPhases?: PhaseWithDetails[];
  onEdit?: (phase: PhaseWithDetails) => void;
}

const statusConfig: Record<
  PhaseStatus,
  {
    icon: React.ElementType;
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  in_progress: {
    icon: Play,
    label: "In Progress",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  blocked: {
    icon: Lock,
    label: "Blocked",
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
};

export function PhaseCard({
  projectId,
  phase,
  blockingPhases = [],
  onEdit,
}: PhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(phase.status === "in_progress");
  const [showMenu, setShowMenu] = useState(false);

  const startPhase = useStartPhase();
  const completePhase = useCompletePhase();
  const deletePhase = useDeletePhase();

  const config = statusConfig[phase.status];
  const StatusIcon = config.icon;
  const deliverables = phase.deliverables || [];
  const completedDeliverables = deliverables.filter(
    (d) => d.status === "completed"
  ).length;
  const allDeliverablesComplete =
    deliverables.length > 0 && completedDeliverables === deliverables.length;

  const handleStart = async () => {
    try {
      await startPhase.mutateAsync({ projectId, phaseId: phase.id });
    } catch (error) {
      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message);
          alert(
            `Cannot start phase: blocked by ${parsed.blocking_phases
              ?.map((p: { title: string }) => p.title)
              .join(", ")}`
          );
        } catch {
          alert(error.message);
        }
      }
    }
  };

  const handleComplete = async () => {
    if (!allDeliverablesComplete && deliverables.length > 0) {
      if (
        !confirm(
          "Some deliverables are not complete. Are you sure you want to complete this phase?"
        )
      ) {
        return;
      }
    }

    try {
      const result = await completePhase.mutateAsync({
        projectId,
        phaseId: phase.id,
      });
      if (result.unblocked_phases?.length) {
        // Could show a toast here
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this phase? All deliverables will also be deleted."))
      return;
    try {
      await deletePhase.mutateAsync({ projectId, phaseId: phase.id });
    } catch (error) {
      console.error("Failed to delete phase:", error);
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all ${
        phase.status === "in_progress"
          ? "border-blue-300 dark:border-blue-700"
          : phase.status === "completed"
          ? "border-green-200 dark:border-green-800 opacity-75"
          : phase.status === "blocked"
          ? "border-orange-200 dark:border-orange-800"
          : "border-border"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-3 cursor-pointer ${config.bgColor}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse */}
        <button className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Status icon */}
        <StatusIcon className={`h-5 w-5 shrink-0 ${config.color}`} />

        {/* Title and info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{phase.title}</h4>
            <span
              className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          {phase.assigned_role && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Assigned: {phase.assigned_role}
            </p>
          )}
        </div>

        {/* Deliverables progress */}
        {deliverables.length > 0 && (
          <DeliverableProgress deliverables={deliverables} />
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {phase.status === "pending" && (
            <button
              onClick={handleStart}
              disabled={startPhase.isPending}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Start
            </button>
          )}
          {phase.status === "in_progress" && (
            <button
              onClick={handleComplete}
              disabled={completePhase.isPending}
              className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Complete
            </button>
          )}

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 hover:bg-background/50"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(phase);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
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
        </div>
      </div>

      {/* Blocked message */}
      {phase.status === "blocked" && blockingPhases.length > 0 && (
        <div className="px-3 py-2 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-b">
          <Lock className="h-3 w-3 inline mr-1" />
          Waiting on: {blockingPhases.map((p) => p.title).join(", ")}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 pt-0 mt-3 space-y-3">
          {/* Description */}
          {phase.description && (
            <p className="text-sm text-muted-foreground">{phase.description}</p>
          )}

          {/* Assignments */}
          {phase.assignments && phase.assignments.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {phase.assignments.map((a) => a.role?.name || a.user?.full_name).join(", ")}
              </span>
            </div>
          )}

          {/* Deliverables */}
          <div>
            <h5 className="mb-2 text-sm font-medium">Deliverables</h5>
            <DeliverableList projectId={projectId} phaseId={phase.id} />
          </div>
        </div>
      )}
    </div>
  );
}

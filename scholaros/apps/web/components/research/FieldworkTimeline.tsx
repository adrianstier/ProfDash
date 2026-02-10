"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@scholaros/shared";
import {
  useFieldworkSchedules,
  useDeleteFieldworkSchedule,
  getFieldworkStatusConfig,
} from "@/lib/hooks/use-fieldwork";
import { FieldworkCard } from "./FieldworkCard";
import { FieldworkModal } from "./FieldworkModal";
import type { FieldworkScheduleWithDetails } from "@scholaros/shared";

interface FieldworkTimelineProps {
  projectId: string;
  experimentId: string;
  workspaceId: string;
  className?: string;
}

export function FieldworkTimeline({
  projectId,
  experimentId,
  workspaceId,
  className,
}: FieldworkTimelineProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "list">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FieldworkScheduleWithDetails | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useFieldworkSchedules(
    projectId,
    experimentId
  );
  const deleteSchedule = useDeleteFieldworkSchedule(projectId, experimentId);

  const handleEdit = (schedule: FieldworkScheduleWithDetails) => {
    setEditingSchedule(schedule);
    setShowModal(true);
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      await deleteSchedule.mutateAsync(scheduleId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSchedule(null);
  };

  // Group schedules by status for list view
  const groupedSchedules = useMemo(() => {
    const groups: Record<string, FieldworkScheduleWithDetails[]> = {
      upcoming: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    schedules.forEach((schedule) => {
      if (schedule.status === "cancelled") {
        groups.cancelled.push(schedule);
      } else if (schedule.status === "completed") {
        groups.completed.push(schedule);
      } else if (schedule.status === "in_progress") {
        groups.in_progress.push(schedule);
      } else {
        groups.upcoming.push(schedule);
      }
    });

    return groups;
  }, [schedules]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Fieldwork Schedules</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {schedules.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 text-sm",
                viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "px-3 py-1.5 text-sm",
                viewMode === "timeline" ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              Timeline
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Trip
          </button>
        </div>
      </div>

      {/* Content */}
      {schedules.length === 0 ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : viewMode === "list" ? (
        <ListView
          groups={groupedSchedules}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteConfirm(id)}
        />
      ) : (
        <TimelineView
          schedules={schedules}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          onEdit={handleEdit}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <FieldworkModal
          projectId={projectId}
          experimentId={experimentId}
          workspaceId={workspaceId}
          schedule={editingSchedule}
          onClose={handleModalClose}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          scheduleName={
            schedules.find((s) => s.id === deleteConfirm)?.title ?? "this trip"
          }
          isDeleting={deleteSchedule.isPending}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// List View
// ============================================================================

interface ListViewProps {
  groups: Record<string, FieldworkScheduleWithDetails[]>;
  onEdit: (schedule: FieldworkScheduleWithDetails) => void;
  onDelete: (id: string) => void;
}

function ListView({ groups, onEdit, onDelete }: ListViewProps) {
  const sections = [
    { key: "in_progress", label: "In Progress", color: "text-orange-600" },
    { key: "upcoming", label: "Upcoming", color: "text-blue-600" },
    { key: "completed", label: "Completed", color: "text-green-600" },
    { key: "cancelled", label: "Cancelled", color: "text-gray-400" },
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ key, label, color }) => {
        const items = groups[key];
        if (!items || items.length === 0) return null;

        return (
          <div key={key}>
            <h4 className={cn("mb-2 text-sm font-medium", color)}>
              {label} ({items.length})
            </h4>
            <div className="space-y-3">
              {items.map((schedule) => (
                <FieldworkCard
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={() => onEdit(schedule)}
                  onDelete={() => onDelete(schedule.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Timeline View (Gantt-style)
// ============================================================================

interface TimelineViewProps {
  schedules: FieldworkScheduleWithDetails[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEdit: (schedule: FieldworkScheduleWithDetails) => void;
}

function TimelineView({
  schedules,
  currentMonth,
  onMonthChange,
  onEdit,
}: TimelineViewProps) {
  // Get days in the month range (show 3 months)
  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      const month = new Date(currentMonth);
      month.setMonth(month.getMonth() + i);
      result.push(month);
    }
    return result;
  }, [currentMonth]);

  const startDate = new Date(months[0].getFullYear(), months[0].getMonth(), 1);
  const endDate = new Date(months[2].getFullYear(), months[2].getMonth() + 1, 0);

  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const getBarPosition = (schedule: FieldworkScheduleWithDetails) => {
    if (!schedule.start_date) return null;

    const start = parseLocalDate(schedule.start_date);
    const end = schedule.end_date ? parseLocalDate(schedule.end_date) : start;

    const startOffset = Math.max(
      0,
      Math.floor((start.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const endOffset = Math.min(
      totalDays,
      Math.ceil((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
  };

  const prevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(prev);
  };

  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded p-1 hover:bg-muted"
          title="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-4 text-sm font-medium">
          {months.map((month) => (
            <span key={month.toISOString()}>
              {month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          ))}
        </div>
        <button
          onClick={nextMonth}
          className="rounded p-1 hover:bg-muted"
          title="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border">
        {/* Month headers */}
        <div className="flex border-b bg-muted/30">
          {months.map((month) => (
            <div
              key={month.toISOString()}
              className="flex-1 border-r px-2 py-1 text-center text-xs font-medium last:border-r-0"
            >
              {month.toLocaleDateString("en-US", { month: "long" })}
            </div>
          ))}
        </div>

        {/* Schedule rows */}
        <div className="divide-y">
          {schedules.map((schedule) => {
            const position = getBarPosition(schedule);
            const statusConfig = getFieldworkStatusConfig(schedule.status);

            return (
              <div
                key={schedule.id}
                className="relative flex h-12 items-center"
                onClick={() => onEdit(schedule)}
              >
                {/* Background grid */}
                <div className="absolute inset-0 flex">
                  {months.map((_, i) => (
                    <div
                      key={i}
                      className={cn("flex-1", i < months.length - 1 && "border-r")}
                    />
                  ))}
                </div>

                {/* Bar */}
                {position && (
                  <div
                    className={cn(
                      "absolute top-2 bottom-2 cursor-pointer rounded-md transition-opacity hover:opacity-80",
                      statusConfig.color
                    )}
                    style={position}
                    title={`${schedule.title}: ${schedule.start_date} - ${schedule.end_date}`}
                  >
                    <div className="flex h-full items-center gap-1 overflow-hidden px-2 text-white">
                      {schedule.site && <MapPin className="h-3 w-3 shrink-0" />}
                      <span className="truncate text-xs font-medium">
                        {schedule.title}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  onAdd: () => void;
}

function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h4 className="mt-4 text-lg font-medium">No fieldwork scheduled</h4>
      <p className="mt-2 text-sm text-muted-foreground">
        Schedule fieldwork trips to plan your research activities.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Schedule First Trip
      </button>
    </div>
  );
}

// ============================================================================
// Delete Confirmation
// ============================================================================

interface DeleteConfirmDialogProps {
  scheduleName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  scheduleName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Delete Fieldwork Schedule</h3>
        <p className="mt-2 text-muted-foreground">
          Are you sure you want to delete &quot;{scheduleName}&quot;? This action cannot
          be undone.
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

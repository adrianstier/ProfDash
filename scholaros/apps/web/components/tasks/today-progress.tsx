"use client";

import { useMemo } from "react";
import { PartyPopper, Sunrise, AlertTriangle } from "lucide-react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { cn } from "@/lib/utils";

export function TodayProgress() {
  const { data: tasks = [] } = useTasks();

  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const todayTasks = tasks.filter(
      (t) => t.due === today || (!t.due && t.status !== "done")
    );
    const overdueTasks = tasks.filter(
      (t) => t.due && t.due < today && t.status !== "done"
    );
    const completed = todayTasks.filter((t) => t.status === "done").length;
    const total = todayTasks.length;
    const pending = total - completed;

    return {
      total,
      completed,
      pending,
      overdue: overdueTasks.length,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      allDone: total > 0 && pending === 0,
      isEmpty: total === 0 && overdueTasks.length === 0,
    };
  }, [tasks, today]);

  // Empty state - no tasks for today
  if (stats.isEmpty) {
    return (
      <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 text-center">
        <Sunrise className="mx-auto h-10 w-10 text-blue-500 mb-3" />
        <h3 className="font-semibold text-lg">Start Your Day</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No tasks scheduled for today. Use the quick add below to plan your work.
        </p>
      </div>
    );
  }

  // All tasks completed
  if (stats.allDone) {
    return (
      <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-green-500 mb-3" />
        <h3 className="font-semibold text-lg text-green-700 dark:text-green-300">
          All Done!
        </h3>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Great job! You&apos;ve completed all {stats.completed} tasks for today.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overdue warning */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {stats.overdue} overdue {stats.overdue === 1 ? "task" : "tasks"}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Review and reschedule or complete these tasks
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Today&apos;s Progress</span>
          <span className="text-sm text-muted-foreground">
            {stats.completed} of {stats.total} tasks
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out",
              stats.percentage === 100
                ? "bg-green-500"
                : stats.percentage >= 50
                ? "bg-primary"
                : "bg-blue-400"
            )}
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{stats.percentage}% complete</span>
          {stats.pending > 0 && (
            <span>
              {stats.pending} {stats.pending === 1 ? "task" : "tasks"} remaining
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

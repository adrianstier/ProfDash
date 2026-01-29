"use client";

/**
 * Welcome Dashboard Modal
 *
 * A modal that shows users a summary of their day when they log in.
 * Displays:
 * - Personalized greeting
 * - Weekly progress chart with M-F completion data
 * - Upcoming/recent tasks with full titles
 * - Overdue task warnings with urgency colors
 * - Clear action hierarchy
 */

import { useState, useEffect, useMemo } from "react";
import { X, Plus, ListTodo, AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useRouter } from "next/navigation";
import { ARIA_LABELS } from "@/lib/constants";

interface WelcomeModalProps {
  userName?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface WeekDay {
  label: string;
  date: Date;
  completed: number;
  total: number;
}

export function WelcomeModal({ userName, isOpen: controlledOpen, onOpenChange }: WelcomeModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();
  const { data: tasks = [] } = useTasks();

  // Use controlled or internal state
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Show modal on first visit of the day
  useEffect(() => {
    if (controlledOpen !== undefined) return; // Skip if controlled

    const lastShown = localStorage.getItem("welcome-modal-last-shown");
    const today = new Date().toDateString();

    if (lastShown !== today) {
      // Small delay for smooth page load
      const timer = setTimeout(() => {
        setInternalOpen(true);
        localStorage.setItem("welcome-modal-last-shown", today);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [controlledOpen]);

  // Calculate weekly progress
  const weeklyData = useMemo((): WeekDay[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Get Monday of current week (adjust if Sunday = 0)
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const weekDays: WeekDay[] = [];
    const dayLabels = ["M", "T", "W", "T", "F"];

    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const dayTasks = tasks.filter((t) => t.due === dateStr);
      const completed = dayTasks.filter((t) => t.status === "done").length;

      weekDays.push({
        label: dayLabels[i],
        date,
        completed,
        total: dayTasks.length,
      });
    }

    return weekDays;
  }, [tasks]);

  // Get overdue tasks
  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((t) => t.due && t.due < today && t.status !== "done");
  }, [tasks]);

  // Get today's tasks
  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((t) => t.due === today).slice(0, 3);
  }, [tasks]);

  // Calculate max for chart scaling
  const maxTasks = Math.max(...weeklyData.map((d) => d.total), 1);

  const handleViewTasks = () => {
    setOpen(false);
    router.push("/today");
  };

  const handleAddTask = () => {
    setOpen(false);
    router.push("/today");
    // Focus quick-add after navigation
    setTimeout(() => {
      const quickAdd = document.querySelector<HTMLInputElement>('[data-quick-add]');
      quickAdd?.focus();
    }, 100);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with high-contrast close button */}
        <DialogHeader className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          {/* Close button - high contrast */}
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-2 bg-muted/80 hover:bg-muted text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label={ARIA_LABELS.closeDialog}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <DialogTitle className="text-2xl font-semibold pr-10">
            {getGreeting()}{userName ? `, ${userName}` : ""}!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Here&apos;s your day at a glance
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Overdue Warning Banner */}
          {overdueTasks.length > 0 && (
            <div
              role="alert"
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 border",
                overdueTasks.length >= 10
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                  : overdueTasks.length >= 5
                  ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-5 w-5 shrink-0",
                  overdueTasks.length >= 10
                    ? "text-red-500"
                    : overdueTasks.length >= 5
                    ? "text-orange-500"
                    : "text-amber-500"
                )}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    overdueTasks.length >= 10
                      ? "text-red-700 dark:text-red-300"
                      : overdueTasks.length >= 5
                      ? "text-orange-700 dark:text-orange-300"
                      : "text-amber-700 dark:text-amber-300"
                  )}
                >
                  {overdueTasks.length} overdue {overdueTasks.length === 1 ? "task needs" : "tasks need"} attention
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "shrink-0",
                  overdueTasks.length >= 10
                    ? "text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
                    : overdueTasks.length >= 5
                    ? "text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/50"
                    : "text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
                )}
                onClick={() => {
                  setOpen(false);
                  router.push("/upcoming?filter=overdue");
                }}
              >
                Review
              </Button>
            </div>
          )}

          {/* Weekly Progress Chart */}
          <section className="space-y-3" aria-labelledby="weekly-progress-title">
            <div className="flex items-center justify-between">
              <h3 id="weekly-progress-title" className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Weekly Progress
              </h3>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {weeklyData.reduce((acc, d) => acc + d.completed, 0)} / {weeklyData.reduce((acc, d) => acc + d.total, 0)} completed
              </span>
            </div>

            <div
              className="flex items-end justify-between gap-2 h-24 px-2"
              role="group"
              aria-label="Weekly task completion chart"
            >
              {weeklyData.map((day, index) => {
                const isToday = day.date.toDateString() === new Date().toDateString();
                const completionRate = day.total > 0 ? day.completed / day.total : 0;
                const barHeight = day.total > 0 ? (day.total / maxTasks) * 100 : 8;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-1.5 flex-1"
                    role="group"
                    aria-label={`${day.label}: ${day.completed} of ${day.total} tasks completed${isToday ? " (today)" : ""}`}
                  >
                    {/* Bar container */}
                    <div
                      className="w-full relative rounded-t-sm overflow-hidden bg-muted/50"
                      style={{ height: `${Math.max(barHeight, 8)}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(completionRate * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      {/* Completed portion */}
                      <div
                        className={cn(
                          "absolute bottom-0 left-0 right-0 transition-all duration-500",
                          isToday ? "bg-primary" : "bg-primary/60"
                        )}
                        style={{
                          height: `${completionRate * 100}%`,
                        }}
                      />
                      {/* Remaining portion (lighter) */}
                      <div
                        className={cn(
                          "absolute top-0 left-0 right-0",
                          isToday ? "bg-primary/20" : "bg-muted"
                        )}
                        style={{
                          height: `${(1 - completionRate) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Day label */}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isToday
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                      aria-hidden="true"
                    >
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Today's Tasks Preview */}
          {todayTasks.length > 0 && (
            <section className="space-y-2" aria-labelledby="today-tasks-title">
              <h3 id="today-tasks-title" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Up Next Today
              </h3>
              <ul className="space-y-1.5" role="list" aria-label="Today's tasks">
                {todayTasks.map((task) => (
                  <li key={task.id}>
                    <TaskPreviewItem
                      title={task.title}
                      status={task.status}
                      priority={task.priority}
                    />
                  </li>
                ))}
                {tasks.filter((t) => t.due === new Date().toISOString().split("T")[0]).length > 3 && (
                  <li className="text-xs text-muted-foreground pl-2">
                    +{tasks.filter((t) => t.due === new Date().toISOString().split("T")[0]).length - 3} more tasks
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Action Buttons - Clear hierarchy */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2" role="group" aria-label="Quick actions">
            <Button
              onClick={handleViewTasks}
              className="flex-1 gap-2"
              size="lg"
            >
              <ListTodo className="h-4 w-4" aria-hidden="true" />
              View Tasks
            </Button>
            <Button
              onClick={handleAddTask}
              variant="outline"
              className="flex-1 gap-2"
              size="lg"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Task preview item component with full text support
function TaskPreviewItem({
  title,
  status,
  priority,
}: {
  title: string;
  status: string;
  priority?: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = status === "done";
  const isTruncated = title.length > 50;

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-2.5 transition-colors",
        isCompleted && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Priority indicator */}
        {priority && (
          <div
            className={cn(
              "mt-0.5 h-2 w-2 rounded-full shrink-0",
              priority === "p1" && "bg-red-500",
              priority === "p2" && "bg-orange-500",
              priority === "p3" && "bg-blue-500",
              priority === "p4" && "bg-muted-foreground/50"
            )}
          />
        )}

        {/* Task title - full text with expand option */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm",
              isCompleted && "line-through text-muted-foreground",
              !isExpanded && isTruncated && "line-clamp-1"
            )}
            title={isTruncated && !isExpanded ? title : undefined}
          >
            {title}
          </p>

          {/* Expand/collapse for long titles */}
          {isTruncated && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Status indicator */}
        {isCompleted && (
          <span className="text-xs text-green-600 dark:text-green-400 shrink-0">
            Done
          </span>
        )}
      </div>
    </div>
  );
}

// Hook to control the welcome modal
export function useWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  const show = () => setIsOpen(true);
  const hide = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    setIsOpen,
    show,
    hide,
    toggle,
  };
}

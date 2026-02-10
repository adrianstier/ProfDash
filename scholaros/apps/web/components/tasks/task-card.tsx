"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  Calendar,
  Flag,
  Hash,
  MoreHorizontal,
  GripVertical,
  Pencil,
  Trash2,
  Clock,
  Sparkles,
  Repeat,
  ListChecks,
} from "lucide-react";
import type { TaskPriority, TaskCategory } from "@scholaros/shared";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useTaskStore } from "@/lib/stores/task-store";
import { ARIA_LABELS, DATE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";

// Priority styles with refined colors
const priorityConfig: Record<
  TaskPriority,
  { text: string; border: string; bg: string; icon: string }
> = {
  p1: {
    text: "text-priority-p1",
    border: "border-l-priority-p1",
    bg: "bg-priority-p1-light",
    icon: "text-priority-p1",
  },
  p2: {
    text: "text-priority-p2",
    border: "border-l-priority-p2",
    bg: "bg-priority-p2-light",
    icon: "text-priority-p2",
  },
  p3: {
    text: "text-priority-p3",
    border: "border-l-priority-p3",
    bg: "bg-priority-p3-light",
    icon: "text-priority-p3",
  },
  p4: {
    text: "text-muted-foreground",
    border: "border-l-border",
    bg: "",
    icon: "text-muted-foreground",
  },
};

// Category colors with new design system
const categoryConfig: Record<
  TaskCategory,
  { bg: string; text: string; border: string }
> = {
  research: {
    bg: "bg-category-research-light",
    text: "text-category-research",
    border: "border-category-research/20",
  },
  teaching: {
    bg: "bg-category-teaching-light",
    text: "text-category-teaching",
    border: "border-category-teaching/20",
  },
  grants: {
    bg: "bg-category-grants-light",
    text: "text-category-grants",
    border: "border-category-grants/20",
  },
  admin: {
    bg: "bg-category-admin-light",
    text: "text-category-admin",
    border: "border-category-admin/20",
  },
  "grad-mentorship": {
    bg: "bg-category-mentorship-light",
    text: "text-category-mentorship",
    border: "border-category-mentorship/20",
  },
  "undergrad-mentorship": {
    bg: "bg-cyan-100 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
  },
  misc: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
  // Academic categories
  meeting: {
    bg: "bg-cyan-100 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
  },
  analysis: {
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  submission: {
    bg: "bg-red-100 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
  revision: {
    bg: "bg-amber-100 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  presentation: {
    bg: "bg-orange-100 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  writing: {
    bg: "bg-blue-100 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  reading: {
    bg: "bg-indigo-100 dark:bg-indigo-900/20",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  coursework: {
    bg: "bg-pink-100 dark:bg-pink-900/20",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
};

interface TaskCardProps {
  task: TaskFromAPI;
  onToggleComplete?: (task: TaskFromAPI) => void;
  onEdit?: (task: TaskFromAPI) => void;
  onDelete?: (task: TaskFromAPI) => void;
  isDraggable?: boolean;
  isCompact?: boolean;
  showSelectionCheckbox?: boolean;
}

export const TaskCard = memo(function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  isDraggable = false,
  isCompact = false,
  showSelectionCheckbox = false,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const { openTaskDetail, isSelectionMode, toggleTaskSelection, selectedTaskIds } = useTaskStore();
  const isSelected = selectedTaskIds.has(task.id);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  // Handle completion with animation
  const handleToggleComplete = useCallback((taskToComplete: TaskFromAPI) => {
    if (taskToComplete.status !== "done") {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 600);
    }
    onToggleComplete?.(taskToComplete);
  }, [onToggleComplete]);

  // Focus trap and keyboard navigation for dropdown menu
  useEffect(() => {
    if (!showMenu) return;

    firstMenuItemRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMenu(false);
        menuButtonRef.current?.focus();
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const menuItems =
          menuRef.current?.querySelectorAll<HTMLButtonElement>(
            '[role="menuitem"]'
          );
        if (!menuItems?.length) return;

        const currentIndex = Array.from(menuItems).indexOf(
          document.activeElement as HTMLButtonElement
        );
        let nextIndex: number;

        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        }

        menuItems[nextIndex]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showMenu]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDueDate = useCallback((dateString: string) => {
    // Parse date-only strings as local time to avoid timezone shift
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
      ? new Date(dateString + "T00:00:00")
      : new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return DATE_LABELS.today;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return DATE_LABELS.tomorrow;
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  const isOverdue = useMemo(() => {
    if (!task.due || task.status === "done") return false;
    // Compare date strings (YYYY-MM-DD) to avoid timezone issues
    // task.due is already a date-only string from the API
    const today = new Date().toISOString().split("T")[0];
    return task.due < today;
  }, [task.due, task.status]);

  const priorityStyle = task.priority
    ? priorityConfig[task.priority]
    : priorityConfig.p4;
  const categoryStyle = task.category ? categoryConfig[task.category] : null;
  const isDone = task.status === "done";

  // Handle selection click
  const handleSelectionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskSelection(task.id);
  }, [task.id, toggleTaskSelection]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-card transition-all duration-200",
        // Only show border-left accent for P1 tasks to reduce visual noise
        task.priority === "p1" && "border-l-[3px] border-l-priority-p1",
        task.priority === "p1" && priorityStyle.bg,
        isDragging
          ? "opacity-50 shadow-xl ring-2 ring-primary scale-[1.02]"
          : "hover:shadow-md hover:border-border hover-glow",
        isDone && "opacity-60",
        justCompleted && "animate-success glow-success",
        isCompact ? "p-3" : "p-4",
        // Selection mode styles
        isSelected && "ring-2 ring-primary bg-primary/5",
        isSelectionMode && "cursor-pointer"
      )}
      onClick={isSelectionMode ? handleSelectionClick : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        {(isSelectionMode || showSelectionCheckbox) && (
          <button
            onClick={handleSelectionClick}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:border-primary"
            )}
            aria-label={isSelected ? `Deselect ${task.title}` : `Select ${task.title}`}
            role="checkbox"
            aria-checked={isSelected}
          >
            <Check
              className={cn(
                "h-3 w-3 transition-all duration-200",
                isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
              aria-hidden="true"
            />
          </button>
        )}

        {/* Drag Handle */}
        {isDraggable && !isSelectionMode && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none opacity-0 group-hover:opacity-100 active:cursor-grabbing transition-opacity duration-150"
            aria-label={ARIA_LABELS.dragToReorder(task.title)}
          >
            <GripVertical
              className="h-4 w-4 text-muted-foreground/50"
              aria-hidden="true"
            />
          </button>
        )}

        {/* Checkbox with celebration animation - hidden in selection mode */}
        {!isSelectionMode && (
          <button
            onClick={() => handleToggleComplete(task)}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
              isDone
                ? "border-success bg-success text-white scale-100"
                : "border-muted-foreground/30 hover:border-primary hover:scale-110 hover:bg-primary/5",
              justCompleted && "animate-success"
            )}
            aria-label={
              isDone
                ? ARIA_LABELS.markIncomplete(task.title)
                : ARIA_LABELS.markComplete(task.title)
            }
            role="checkbox"
            aria-checked={isDone}
          >
            <Check
              className={cn(
                "h-3 w-3 transition-all duration-200",
                isDone ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
              aria-hidden="true"
            />
          </button>
        )}

        {/* Completion sparkle effect */}
        {justCompleted && (
          <div className="absolute left-6 top-3 pointer-events-none">
            <Sparkles className="h-4 w-4 text-amber-500 animate-fade-in" />
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => openTaskDetail(task.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openTaskDetail(task.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={ARIA_LABELS.openDetails(task.title)}
        >
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm font-medium leading-snug transition-colors",
                isDone && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>
          </div>

          {!isCompact && task.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Metadata - Improved density */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* Priority badge - Icon only for compact */}
            {task.priority && task.priority !== "p4" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  priorityStyle.icon
                )}
                title={`Priority ${task.priority.toUpperCase()}`}
              >
                <Flag className="h-3 w-3" />
                {!isCompact && (
                  <span className="uppercase text-[10px]">{task.priority}</span>
                )}
              </span>
            )}

            {/* Category badge - More subtle */}
            {categoryStyle && !isCompact && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  categoryStyle.bg,
                  categoryStyle.text
                )}
              >
                <Hash className="h-2.5 w-2.5" />
                {task.category?.replace("-", " ")}
              </span>
            )}

            {/* Due date */}
            {task.due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  isOverdue
                    ? "text-priority-p1 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {isOverdue ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                {formatDueDate(task.due)}
              </span>
            )}

            {/* Recurring indicator */}
            {task.is_recurring && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                title="Recurring task"
              >
                <Repeat className="h-3 w-3" />
              </span>
            )}

            {/* Subtask progress indicator */}
            {task.subtasks && task.subtasks.length > 0 && (() => {
              const completed = task.subtasks.filter((s) => s.completed).length;
              const total = task.subtasks.length;
              const allDone = completed === total;
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px]",
                    allDone ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )}
                  title={`${completed} of ${total} subtasks completed`}
                >
                  <ListChecks className="h-3 w-3" />
                  <span>{completed}/{total}</span>
                  {/* Mini progress bar */}
                  <span className="inline-block w-8 h-1 rounded-full bg-muted overflow-hidden">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-all",
                        allDone ? "bg-green-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.round((completed / total) * 100)}%` }}
                    />
                  </span>
                </span>
              );
            })()}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            ref={menuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            )}
            aria-label={ARIA_LABELS.taskOptions(task.title)}
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <MoreHorizontal
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
                aria-hidden="true"
              />
              <div
                ref={menuRef}
                className="absolute right-0 top-10 z-20 min-w-[140px] rounded-xl border bg-popover p-1.5 shadow-lg animate-scale-in"
                role="menu"
                aria-label="Task actions"
              >
                <button
                  ref={firstMenuItemRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(task);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  role="menuitem"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(task);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
                  role="menuitem"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = "TaskCard";

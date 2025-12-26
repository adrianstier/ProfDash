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
} from "lucide-react";
import type { TaskPriority, TaskCategory } from "@scholaros/shared";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useTaskStore } from "@/lib/stores/task-store";
import { ARIA_LABELS, DATE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

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
};

interface TaskCardProps {
  task: TaskFromAPI;
  onToggleComplete?: (task: TaskFromAPI) => void;
  onEdit?: (task: TaskFromAPI) => void;
  onDelete?: (task: TaskFromAPI) => void;
  isDraggable?: boolean;
  isCompact?: boolean;
}

export function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  isDraggable = false,
  isCompact = false,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { openTaskDetail } = useTaskStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

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
    const date = new Date(dateString);
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
    return task.due && new Date(task.due) < new Date() && task.status !== "done";
  }, [task.due, task.status]);

  const priorityStyle = task.priority
    ? priorityConfig[task.priority]
    : priorityConfig.p4;
  const categoryStyle = task.category ? categoryConfig[task.category] : null;
  const isDone = task.status === "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border-l-[3px] border bg-card transition-all duration-200",
        priorityStyle.border,
        task.priority === "p1" && priorityStyle.bg,
        isDragging
          ? "opacity-50 shadow-xl ring-2 ring-primary scale-[1.02]"
          : "hover:shadow-md hover:border-border",
        isDone && "opacity-60",
        isCompact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {isDraggable && (
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

        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete?.(task)}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
            isDone
              ? "border-success bg-success text-white scale-100"
              : "border-muted-foreground/30 hover:border-primary hover:scale-110"
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

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Priority badge */}
            {task.priority && task.priority !== "p4" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold",
                  priorityStyle.icon
                )}
              >
                <Flag className="h-3 w-3" />
                {!isCompact && (
                  <span className="uppercase">{task.priority}</span>
                )}
              </span>
            )}

            {/* Category badge */}
            {categoryStyle && !isCompact && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
                  categoryStyle.bg,
                  categoryStyle.text,
                  categoryStyle.border
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
                  "inline-flex items-center gap-1 text-xs font-medium",
                  isOverdue
                    ? "text-priority-p1"
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
}

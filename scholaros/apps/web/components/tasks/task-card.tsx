"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Calendar, Flag, Hash, MoreHorizontal, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { TaskPriority, TaskCategory } from "@scholaros/shared";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useTaskStore } from "@/lib/stores/task-store";
import { useState } from "react";

const priorityColors: Record<TaskPriority, string> = {
  p1: "text-red-500",
  p2: "text-orange-500",
  p3: "text-blue-500",
  p4: "text-gray-400",
};

const categoryColors: Record<TaskCategory, string> = {
  research: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  teaching: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  grants: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  admin: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "grad-mentorship": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  "undergrad-mentorship": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  misc: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const isOverdue = task.due && new Date(task.due) < new Date() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-card transition-all ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : "hover:shadow-md"
      } ${task.status === "done" ? "opacity-60" : ""} ${isCompact ? "p-2" : "p-3"}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        {isDraggable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none opacity-0 group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete?.(task)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            task.status === "done"
              ? "border-green-500 bg-green-500 text-white"
              : "border-muted-foreground/30 hover:border-primary"
          }`}
        >
          {task.status === "done" && <Check className="h-3 w-3" />}
        </button>

        {/* Content */}
        <div
          className="flex-1 cursor-pointer"
          onClick={() => openTaskDetail(task.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium ${
                task.status === "done" ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.title}
            </p>
          </div>

          {!isCompact && task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {/* Priority */}
            {task.priority && task.priority !== "p4" && (
              <span className={`flex items-center gap-0.5 ${priorityColors[task.priority]}`}>
                <Flag className="h-3 w-3" />
                {!isCompact && task.priority.toUpperCase()}
              </span>
            )}

            {/* Category */}
            {task.category && !isCompact && (
              <span
                className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 ${categoryColors[task.category]}`}
              >
                <Hash className="h-2.5 w-2.5" />
                {task.category}
              </span>
            )}

            {/* Due date */}
            {task.due && (
              <span
                className={`flex items-center gap-0.5 ${
                  isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {formatDueDate(task.due)}
              </span>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 min-w-32 rounded-md border bg-popover p-1 shadow-md">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(task);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(task);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-accent"
                >
                  <Trash2 className="h-4 w-4" />
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

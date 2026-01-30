"use client";

import { useState, useCallback } from "react";
import {
  ChevronRight,
  AlertTriangle,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskSectionId, TaskSection } from "@/lib/utils/task-grouping";
import type { TaskFromAPI } from "@scholaros/shared";
import { TaskCard } from "./task-card";

// Icon mapping for section types
const SECTION_ICONS: Record<TaskSectionId, typeof AlertTriangle> = {
  overdue: AlertTriangle,
  today: Calendar,
  tomorrow: Clock,
  coming_up: CalendarClock,
  this_week: CalendarDays,
  next_week: CalendarDays,
  later: CalendarClock,
  no_date: CalendarX,
};

// Left border color mapping
const BORDER_COLORS: Record<TaskSectionId, string> = {
  overdue: "border-l-red-500",
  today: "border-l-amber-500",
  tomorrow: "border-l-orange-500",
  coming_up: "border-l-blue-500",
  this_week: "border-l-blue-500",
  next_week: "border-l-indigo-500",
  later: "border-l-green-500",
  no_date: "border-l-gray-400 dark:border-l-gray-600",
};

interface TaskSectionHeaderProps {
  section: TaskSection;
  defaultCollapsed?: boolean;
  onToggleComplete?: (task: TaskFromAPI) => void;
  onEdit?: (task: TaskFromAPI) => void;
  onDelete?: (task: TaskFromAPI) => void;
}

/**
 * Collapsible task section with color-coded header, count badge,
 * and expandable list of TaskCards.
 */
export function TaskSectionGroup({
  section,
  defaultCollapsed = false,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskSectionHeaderProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const Icon = SECTION_ICONS[section.id] ?? Calendar;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 overflow-hidden transition-colors",
        "border-l-4",
        BORDER_COLORS[section.id]
      )}
    >
      {/* Section Header */}
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left",
          "transition-colors duration-150",
          "hover:bg-muted/50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
          section.bgColor
        )}
        aria-expanded={!collapsed}
        aria-controls={`section-${section.id}`}
      >
        {/* Chevron */}
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            !collapsed && "rotate-90"
          )}
        />

        {/* Icon */}
        <Icon className={cn("h-4 w-4", section.color)} />

        {/* Title */}
        <span
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            section.color
          )}
        >
          {section.title}
        </span>

        {/* Count Badge */}
        <span
          className={cn(
            "ml-auto inline-flex items-center justify-center",
            "rounded-full px-2 py-0.5",
            "text-xs font-medium",
            section.bgColor,
            section.color
          )}
        >
          {section.count}
        </span>
      </button>

      {/* Section Content */}
      {!collapsed && (
        <div
          id={`section-${section.id}`}
          className="px-4 pb-3 pt-1 space-y-2"
        >
          {section.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 px-2">
              No tasks in this section
            </p>
          ) : (
            section.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface TaskSectionsListProps {
  sections: TaskSection[];
  onToggleComplete?: (task: TaskFromAPI) => void;
  onEdit?: (task: TaskFromAPI) => void;
  onDelete?: (task: TaskFromAPI) => void;
  emptyMessage?: string;
}

/**
 * Renders a list of TaskSectionGroups.
 * Handles the empty state when no sections have tasks.
 */
export function TaskSectionsList({
  sections,
  onToggleComplete,
  onEdit,
  onDelete,
  emptyMessage = "No tasks to display",
}: TaskSectionsListProps) {
  const nonEmpty = sections.filter((s) => s.count > 0);

  if (nonEmpty.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nonEmpty.map((section) => (
        <TaskSectionGroup
          key={section.id}
          section={section}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

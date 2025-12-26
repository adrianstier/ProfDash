"use client";

import {
  type LucideIcon,
  CheckSquare,
  Plus,
  PartyPopper,
  FolderOpen,
  SearchX,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "success" | "muted" | "primary";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const variantStyles = {
    default: {
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
      containerBg: "",
    },
    success: {
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      containerBg: "bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30 rounded-2xl",
    },
    muted: {
      iconBg: "bg-muted/50",
      iconColor: "text-muted-foreground/70",
      containerBg: "",
    },
    primary: {
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      containerBg: "bg-primary/5 border border-primary/10 rounded-2xl",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in",
        styles.containerBg,
        className
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl mb-5 shadow-sm",
          styles.iconBg
        )}
      >
        <Icon className={cn("h-7 w-7", styles.iconColor)} />
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-8 flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="btn-primary inline-flex items-center gap-2"
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="btn-ghost"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function TasksEmptyState({ onAddTask }: { onAddTask: () => void }) {
  return (
    <EmptyState
      icon={CheckSquare}
      title="No tasks yet"
      description="Create your first task to get started organizing your academic work."
      action={{
        label: "Add Task",
        onClick: onAddTask,
        icon: Plus,
      }}
    />
  );
}

export function AllDoneState() {
  return (
    <EmptyState
      icon={PartyPopper}
      title="All caught up!"
      description="Great job! You've completed all your tasks for today. Time for a well-deserved break."
      variant="success"
    />
  );
}

export function ProjectsEmptyState({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects yet"
      description="Create your first project to track manuscripts, grants, and research work."
      action={{
        label: "Create Project",
        onClick: onCreateProject,
        icon: Plus,
      }}
    />
  );
}

export function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No results found"
      description="Try adjusting your filters or search terms to find what you're looking for."
      action={{
        label: "Clear Filters",
        onClick: onClear,
      }}
      variant="muted"
    />
  );
}

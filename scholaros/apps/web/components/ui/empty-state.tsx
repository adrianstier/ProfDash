"use client";

import {
  type LucideIcon,
  CheckSquare,
  Plus,
  PartyPopper,
  FolderOpen,
  SearchX,
  Lightbulb,
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
  variant?: "default" | "success" | "muted" | "primary" | "celebration";
  className?: string;
  tips?: string[];
  shortcutHint?: { key: string; action: string };
  illustration?: "tasks" | "projects" | "search" | "success" | "welcome";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
  tips,
  shortcutHint,
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
      containerBg: "bg-gradient-to-br from-green-50/80 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/20 border border-green-200/50 dark:border-green-800/30 rounded-2xl",
    },
    muted: {
      iconBg: "bg-muted/50",
      iconColor: "text-muted-foreground/70",
      containerBg: "",
    },
    primary: {
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      containerBg: "bg-gradient-to-br from-primary/5 to-amber-500/5 border border-primary/10 rounded-2xl",
    },
    celebration: {
      iconBg: "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      containerBg: "bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-rose-50/50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-rose-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in",
        styles.containerBg,
        className
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl mb-4 shadow-sm",
          styles.iconBg
        )}
      >
        <Icon className={cn("h-6 w-6", styles.iconColor)} />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>

      {/* Quick tips section */}
      {tips && tips.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-md">
          {tips.map((tip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground animate-fade-in"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <Lightbulb className="h-3 w-3 text-amber-500" />
              {tip}
            </span>
          ))}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {shortcutHint && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Press</span>
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            {shortcutHint.key}
          </kbd>
          <span>to {shortcutHint.action}</span>
        </div>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
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
      tips={[
        "Type 'p1' for high priority",
        "Use #grants for category",
        "Type 'tomorrow' for due date",
      ]}
      shortcutHint={{ key: "Q", action: "quick add" }}
    />
  );
}

export function AllDoneState() {
  const celebrations = [
    { emoji: "🎉", message: "Amazing work! You crushed it today!" },
    { emoji: "🚀", message: "All done! You're on fire!" },
    { emoji: "✨", message: "Incredible! Everything checked off!" },
    { emoji: "🏆", message: "Champion! No tasks left standing!" },
  ];
  const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];

  return (
    <EmptyState
      icon={PartyPopper}
      title={`${celebration.emoji} All caught up!`}
      description={`${celebration.message} Time for a well-deserved break.`}
      variant="celebration"
      tips={["Enjoy a coffee break", "Stretch and move around", "Celebrate your productivity!"]}
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

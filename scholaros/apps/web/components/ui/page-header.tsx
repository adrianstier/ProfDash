"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: {
    label: string;
    variant?: "default" | "success" | "warning" | "primary";
  };
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const badgeVariants = {
  default: "bg-muted text-muted-foreground",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  primary: "bg-primary/10 text-primary",
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-6 lg:p-8 animate-fade-in overflow-hidden",
        className
      )}
    >
      {/* Subtle decorative gradient */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          {/* Title row with optional icon */}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">
                  {title}
                </h1>
                {badge && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      badgeVariants[badge.variant || "default"]
                    )}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions slot */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Optional additional content (stats, filters, etc.) */}
      {children && <div className="relative mt-6">{children}</div>}
    </header>
  );
}

// Stat card for use within page headers
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning";
}

const statVariants = {
  default: "bg-muted/50",
  primary: "bg-primary/10 text-primary",
  success: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  warning: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 hover-glow",
        statVariants[variant]
      )}
    >
      {Icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/50">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </div>
      {trend && (
        <span
          className={cn(
            "ml-auto text-xs font-medium",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}
        >
          {trend.isPositive ? "+" : ""}
          {trend.value}%
        </span>
      )}
    </div>
  );
}

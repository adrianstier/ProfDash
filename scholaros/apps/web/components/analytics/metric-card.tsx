"use client";

import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

export type MetricTrend = "up" | "down" | "stable";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: MetricTrend;
  trendValue?: string;
  trendLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  valueClassName?: string;
  tooltip?: string;
}

// ============================================================================
// Metric Card Component
// ============================================================================

export function MetricCard({
  title,
  value,
  description,
  trend,
  trendValue,
  trendLabel,
  icon,
  loading,
  className,
  valueClassName,
  tooltip,
}: MetricCardProps) {
  if (loading) {
    return <MetricCardSkeleton className={className} />;
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/60 hover:text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        <span className={cn("text-3xl font-bold tracking-tight", valueClassName)}>
          {value}
        </span>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Trend */}
      {trend && trendValue && (
        <div className="mt-4 flex items-center gap-2">
          <TrendBadge trend={trend} value={trendValue} />
          {trendLabel && (
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Trend Badge
// ============================================================================

interface TrendBadgeProps {
  trend: MetricTrend;
  value: string;
}

function TrendBadge({ trend, value }: TrendBadgeProps) {
  const config = {
    up: {
      icon: TrendingUp,
      color: "text-green-600 bg-green-500/10",
    },
    down: {
      icon: TrendingDown,
      color: "text-red-600 bg-red-500/10",
    },
    stable: {
      icon: Minus,
      color: "text-muted-foreground bg-muted",
    },
  };

  const { icon: Icon, color } = config[trend];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        color
      )}
    >
      <Icon className="h-3 w-3" />
      {value}
    </span>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="mt-3">
        <div className="h-9 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

// ============================================================================
// Mini Metric Card (for inline displays)
// ============================================================================

interface MiniMetricProps {
  label: string;
  value: string | number;
  trend?: MetricTrend;
  className?: string;
}

export function MiniMetric({ label, value, trend, className }: MiniMetricProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
      {trend && (
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            trend === "up" && "bg-green-500",
            trend === "down" && "bg-red-500",
            trend === "stable" && "bg-muted-foreground"
          )}
        />
      )}
    </div>
  );
}

// ============================================================================
// Metric Grid (layout helper)
// ============================================================================

interface MetricGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ children, columns = 4, className }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { OnboardingFunnelMetrics } from "@scholaros/shared/types";

// ============================================================================
// Types
// ============================================================================

interface CohortTableProps {
  data: OnboardingFunnelMetrics[];
  loading?: boolean;
  className?: string;
}

// ============================================================================
// Cohort Table Component
// ============================================================================

export function CohortTable({ data, loading, className }: CohortTableProps) {
  if (loading) {
    return <CohortTableSkeleton className={className} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn("rounded-xl border bg-card p-6 text-center", className)}>
        <p className="text-muted-foreground">No cohort data available</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Cohort Analysis</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Compare onboarding metrics across different user cohorts
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cohort
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Users
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Started
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Completed
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Completion Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Skip Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                7d Retention
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((cohort, index) => (
              <tr
                key={cohort.cohort_date}
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  index === 0 && "bg-primary/5"
                )}
              >
                <td className="px-4 py-3 text-sm font-medium">
                  {formatCohortDate(cohort.cohort_date)}
                  {index === 0 && (
                    <span className="ml-2 text-xs text-primary font-normal">
                      Latest
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {cohort.cohort_size.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {cohort.started_count.toLocaleString()}
                  <span className="text-muted-foreground ml-1">
                    ({formatPercent(cohort.started_rate)})
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {cohort.completed_count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <RateBadge value={cohort.completion_rate} />
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      "text-sm",
                      cohort.skip_rate > 0.3
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatPercent(cohort.skip_rate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <RateBadge value={cohort.retained_7d_rate} variant="retention" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Rate Badge
// ============================================================================

interface RateBadgeProps {
  value: number;
  variant?: "completion" | "retention";
}

function RateBadge({ value, variant = "completion" }: RateBadgeProps) {
  const thresholds = variant === "completion"
    ? { good: 0.7, ok: 0.5 }
    : { good: 0.6, ok: 0.4 };

  const color = value >= thresholds.good
    ? "bg-green-500/10 text-green-600"
    : value >= thresholds.ok
    ? "bg-amber-500/10 text-amber-600"
    : "bg-red-500/10 text-red-600";

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {formatPercent(value)}
    </span>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatCohortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ============================================================================
// Skeleton
// ============================================================================

function CohortTableSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <div className="p-6 border-b">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted mt-2" />
      </div>
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {[...Array(7)].map((_, j) => (
              <div
                key={j}
                className="h-8 flex-1 animate-pulse rounded bg-muted"
                style={{ animationDelay: `${(i * 7 + j) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Comparison Table (for A/B test results)
// ============================================================================

interface ComparisonRow {
  metric: string;
  control: number;
  treatment: number;
  lift: number;
  pValue: number;
  isSignificant: boolean;
}

interface ComparisonTableProps {
  title: string;
  data: ComparisonRow[];
  className?: string;
}

export function ComparisonTable({ title, data, className }: ComparisonTableProps) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Metric
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Control
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Treatment
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Lift
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Significance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={row.metric} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium">{row.metric}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatPercent(row.control)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatPercent(row.treatment)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      row.lift > 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {row.lift > 0 ? "+" : ""}
                    {formatPercent(row.lift)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {row.isSignificant ? (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                      p={row.pValue.toFixed(3)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      p={row.pValue.toFixed(3)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

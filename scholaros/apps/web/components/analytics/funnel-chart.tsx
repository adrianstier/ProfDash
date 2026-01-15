"use client";

import { cn } from "@/lib/utils";
import type { OnboardingFunnelMetrics } from "@scholaros/shared/types";

// ============================================================================
// Types
// ============================================================================

interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  title?: string;
  className?: string;
  showPercentage?: boolean;
  showDropoff?: boolean;
}

// ============================================================================
// Funnel Chart Component
// ============================================================================

export function FunnelChart({
  steps,
  title,
  className,
  showPercentage = true,
  showDropoff = true,
}: FunnelChartProps) {
  const maxValue = steps[0]?.value || 1;

  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      {title && (
        <h3 className="text-lg font-semibold mb-6">{title}</h3>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => {
          const prevStep = steps[index - 1];
          const dropoff = prevStep
            ? ((prevStep.value - step.value) / prevStep.value * 100).toFixed(1)
            : null;

          return (
            <div key={step.label} className="relative">
              {/* Dropoff indicator */}
              {showDropoff && dropoff && parseFloat(dropoff) > 0 && (
                <div className="absolute -top-2 right-0 text-xs text-red-500 font-medium">
                  -{dropoff}%
                </div>
              )}

              {/* Step label and value */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{step.value.toLocaleString()}</span>
                  {showPercentage && (
                    <span className="text-xs text-muted-foreground">
                      ({step.percentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Bar */}
              <div className="h-10 w-full overflow-hidden rounded-lg bg-muted">
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-out rounded-lg",
                    step.color || "bg-primary"
                  )}
                  style={{ width: `${(step.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Onboarding Funnel (specialized for onboarding data)
// ============================================================================

interface OnboardingFunnelProps {
  data: OnboardingFunnelMetrics | null;
  loading?: boolean;
  className?: string;
}

export function OnboardingFunnel({ data, loading, className }: OnboardingFunnelProps) {
  if (loading) {
    return <FunnelChartSkeleton className={className} />;
  }

  if (!data) {
    return (
      <div className={cn("rounded-xl border bg-card p-6 text-center", className)}>
        <p className="text-muted-foreground">No funnel data available</p>
      </div>
    );
  }

  const steps: FunnelStep[] = [
    {
      label: "Users Signed Up",
      value: data.cohort_size,
      percentage: 100,
      color: "bg-primary",
    },
    {
      label: "Started Onboarding",
      value: data.started_count,
      percentage: data.started_rate * 100,
      color: "bg-blue-500",
    },
    {
      label: "Profile Completed",
      value: data.step_1_completed,
      percentage: (data.step_1_completed / data.cohort_size) * 100,
      color: "bg-blue-400",
    },
    {
      label: "Workspace Created",
      value: data.step_2_completed,
      percentage: (data.step_2_completed / data.cohort_size) * 100,
      color: "bg-blue-300",
    },
    {
      label: "First Task Created",
      value: data.step_3_completed,
      percentage: (data.step_3_completed / data.cohort_size) * 100,
      color: "bg-green-400",
    },
    {
      label: "Onboarding Completed",
      value: data.completed_count,
      percentage: data.completion_rate * 100,
      color: "bg-green-500",
    },
  ];

  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Onboarding Funnel</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Cohort: {data.cohort_date}</span>
          <span>n = {data.cohort_size}</span>
        </div>
      </div>

      {/* Funnel visualization */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const prevStep = steps[index - 1];
          const dropoff = prevStep && prevStep.value > 0
            ? ((prevStep.value - step.value) / prevStep.value * 100)
            : 0;

          return (
            <div key={step.label} className="relative group">
              {/* Dropoff indicator */}
              {dropoff > 0 && index > 0 && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                    -{dropoff.toFixed(1)}% dropoff
                  </span>
                </div>
              )}

              {/* Step row */}
              <div className="flex items-center gap-4">
                {/* Step number */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index}
                </div>

                {/* Bar container */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{step.label}</span>
                    <span>
                      {step.value.toLocaleString()}
                      <span className="ml-1 text-muted-foreground">
                        ({step.percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="h-8 w-full overflow-hidden rounded-lg bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all duration-700 ease-out rounded-lg",
                        step.color
                      )}
                      style={{ width: `${step.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary metrics */}
      <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">
            {(data.completion_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Completion Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-500">
            {(data.skip_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Skip Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">
            {(data.retained_7d_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">7-Day Retention</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Horizontal Funnel (alternative layout)
// ============================================================================

interface HorizontalFunnelProps {
  steps: Array<{ label: string; value: number; percentage: number }>;
  className?: string;
}

export function HorizontalFunnel({ steps, className }: HorizontalFunnelProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          {/* Step block */}
          <div
            className="relative flex flex-col items-center justify-center rounded-lg bg-primary/10 px-4 py-3 text-center"
            style={{
              width: `${Math.max(80, step.percentage * 1.5)}px`,
              height: `${Math.max(60, step.percentage * 0.8)}px`,
            }}
          >
            <span className="text-lg font-bold">{step.value}</span>
            <span className="text-xs text-muted-foreground">{step.label}</span>
          </div>

          {/* Arrow */}
          {index < steps.length - 1 && (
            <svg
              className="h-4 w-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function FunnelChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      <div className="h-6 w-48 animate-pulse rounded bg-muted mb-6" />
      <div className="space-y-4">
        {[100, 85, 70, 55, 40, 30].map((width, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-full overflow-hidden rounded-lg bg-muted">
              <div
                className="h-full animate-pulse bg-muted-foreground/10"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

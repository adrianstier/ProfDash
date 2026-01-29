"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Loading skeleton for the analytics dashboard
function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Summary Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-16 mt-2" />
            <Skeleton className="h-3 w-32 mt-2" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-48 mb-4" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        ))}
      </div>

      {/* Activity Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-48 mb-4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>

      {/* Team Productivity */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-3 w-56 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamically import the AnalyticsDashboard with lazy loading
export const LazyAnalyticsDashboard = dynamic(
  () => import("./analytics-dashboard").then((mod) => ({ default: mod.AnalyticsDashboard })),
  {
    loading: () => <AnalyticsDashboardSkeleton />,
    ssr: false, // Disable SSR for this heavy component
  }
);

// Re-export the skeleton for use elsewhere
export { AnalyticsDashboardSkeleton };

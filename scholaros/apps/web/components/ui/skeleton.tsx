"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

// Common skeleton patterns
export function TaskCardSkeleton() {
  return (
    <div className="rounded-xl border border-l-[3px] border-l-muted bg-card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <TaskCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <ProjectCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <StatCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border/50">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-4 flex-1 max-w-[200px]" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-4 py-3 px-4 border-b bg-muted/30">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16 ml-auto" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="px-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <TableRowSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

// Full page loading state with visual interest
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="rounded-2xl border bg-gradient-to-br from-muted/30 to-muted/10 p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <StatsGridSkeleton />

      {/* Content skeleton */}
      <TaskListSkeleton count={4} />
    </div>
  );
}

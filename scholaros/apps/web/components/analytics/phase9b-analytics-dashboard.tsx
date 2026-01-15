"use client";

import { useState } from "react";
import {
  Users,
  Search,
  TrendingUp,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard, MetricGrid, type MetricTrend } from "./metric-card";
import { OnboardingFunnel } from "./funnel-chart";
import { CohortTable } from "./cohort-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  OnboardingFunnelMetrics,
  SearchMetrics,
} from "@scholaros/shared/types";

// ============================================================================
// Types
// ============================================================================

interface Phase9BAnalyticsDashboardProps {
  className?: string;
}

type TimeRange = "7d" | "14d" | "30d" | "90d";

// ============================================================================
// Phase 9B Analytics Dashboard Component
// Focuses on onboarding funnel, search analytics, and feature validation metrics
// ============================================================================

export function Phase9BAnalyticsDashboard({ className }: Phase9BAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // In a real implementation, these would come from API calls
  // using React Query hooks like useOnboardingMetrics, useSearchMetrics
  const mockOnboardingData: OnboardingFunnelMetrics = {
    cohort_date: "2026-01-01",
    cohort_size: 500,
    started_count: 425,
    started_rate: 0.85,
    step_1_completed: 380,
    step_2_completed: 340,
    step_3_completed: 290,
    step_4_completed: 260,
    completed_count: 235,
    completion_rate: 0.47,
    skipped_count: 85,
    skip_rate: 0.17,
    avg_time_to_complete_ms: 180000,
    retained_7d_count: 200,
    retained_7d_rate: 0.85,
  };

  const mockSearchMetrics: SearchMetrics = {
    date: "2026-01-14",
    total_searches: 1250,
    unique_users: 320,
    total_selections: 890,
    click_through_rate: 0.712,
    unique_queries: 480,
    avg_queries_per_user: 3.9,
    no_results_count: 45,
    no_results_rate: 0.036,
    results_by_type: {
      task: 520,
      project: 180,
      grant: 95,
      publication: 75,
      navigation: 20,
      action: 0,
    },
  };

  const mockCohortData: OnboardingFunnelMetrics[] = [
    mockOnboardingData,
    {
      ...mockOnboardingData,
      cohort_date: "2025-12-15",
      cohort_size: 450,
      completed_count: 200,
      completion_rate: 0.44,
      retained_7d_rate: 0.82,
    },
    {
      ...mockOnboardingData,
      cohort_date: "2025-12-01",
      cohort_size: 400,
      completed_count: 175,
      completion_rate: 0.44,
      retained_7d_rate: 0.78,
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getTrend = (current: number, baseline: number): MetricTrend => {
    if (current > baseline * 1.05) return "up";
    if (current < baseline * 0.95) return "down";
    return "stable";
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phase 9B Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track onboarding, search, and feature engagement metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <MetricGrid columns={4}>
          <MetricCard
            title="Onboarding Completion"
            value={`${(mockOnboardingData.completion_rate * 100).toFixed(1)}%`}
            description={`${mockOnboardingData.completed_count} of ${mockOnboardingData.cohort_size} users`}
            trend={getTrend(mockOnboardingData.completion_rate, 0.45)}
            trendValue="+4.4%"
            trendLabel="vs last period"
            icon={<Users className="h-4 w-4 text-primary" />}
            tooltip="Percentage of users who complete the full onboarding flow"
          />
          <MetricCard
            title="Search CTR"
            value={`${(mockSearchMetrics.click_through_rate * 100).toFixed(1)}%`}
            description={`${mockSearchMetrics.total_selections} selections`}
            trend={getTrend(mockSearchMetrics.click_through_rate, 0.68)}
            trendValue="+3.2%"
            trendLabel="vs last period"
            icon={<Search className="h-4 w-4 text-primary" />}
            tooltip="Click-through rate for search results"
          />
          <MetricCard
            title="7-Day Retention"
            value={`${(mockOnboardingData.retained_7d_rate * 100).toFixed(1)}%`}
            description="of completed users"
            trend={getTrend(mockOnboardingData.retained_7d_rate, 0.80)}
            trendValue="+5.0%"
            trendLabel="vs last period"
            icon={<Calendar className="h-4 w-4 text-primary" />}
            tooltip="Users who return within 7 days of completing onboarding"
          />
          <MetricCard
            title="Daily Active Users"
            value="320"
            description="Average this period"
            trend="up"
            trendValue="+12.5%"
            trendLabel="vs last period"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            tooltip="Average daily active users during selected period"
          />
        </MetricGrid>
      </section>

      {/* Onboarding Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Onboarding Analytics</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <OnboardingFunnel data={mockOnboardingData} />
          <div className="space-y-4">
            <MetricCard
              title="Average Time to Complete"
              value={formatDuration(mockOnboardingData.avg_time_to_complete_ms || 0)}
              description="From start to finish"
              tooltip="Average time users take to complete the entire onboarding flow"
            />
            <MetricCard
              title="Skip Rate"
              value={`${(mockOnboardingData.skip_rate * 100).toFixed(1)}%`}
              description={`${mockOnboardingData.skipped_count} users skipped`}
              trend={mockOnboardingData.skip_rate > 0.2 ? "down" : "stable"}
              trendValue={mockOnboardingData.skip_rate > 0.2 ? "-2.1%" : "0%"}
              tooltip="Percentage of users who skip the onboarding flow"
            />
          </div>
        </div>
      </section>

      {/* Search Analytics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Search Analytics</h2>
        <MetricGrid columns={3}>
          <MetricCard
            title="Total Searches"
            value={mockSearchMetrics.total_searches.toLocaleString()}
            description={`${mockSearchMetrics.unique_users} unique users`}
            icon={<Search className="h-4 w-4 text-primary" />}
          />
          <MetricCard
            title="Unique Queries"
            value={mockSearchMetrics.unique_queries.toLocaleString()}
            description={`${mockSearchMetrics.avg_queries_per_user.toFixed(1)} avg per user`}
          />
          <MetricCard
            title="No Results Rate"
            value={`${(mockSearchMetrics.no_results_rate * 100).toFixed(1)}%`}
            description={`${mockSearchMetrics.no_results_count} searches`}
            trend={mockSearchMetrics.no_results_rate > 0.05 ? "down" : "stable"}
            trendValue="-0.8%"
            tooltip="Percentage of searches that returned no results"
          />
        </MetricGrid>

        {/* Search by Type */}
        <div className="mt-4 rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">Searches by Result Type</h3>
          <div className="space-y-3">
            {Object.entries(mockSearchMetrics.results_by_type).map(([type, count]) => {
              const percentage = (count / mockSearchMetrics.total_selections) * 100;
              return (
                <div key={type} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-24 capitalize">{type}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-20 text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cohort Analysis */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Cohort Analysis</h2>
        <CohortTable data={mockCohortData} />
      </section>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

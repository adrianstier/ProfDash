// Re-export existing dashboard
export { AnalyticsDashboard } from "./analytics-dashboard";

// Phase 9B Analytics Components
export { Phase9BAnalyticsDashboard } from "./phase9b-analytics-dashboard";
export { MetricCard, MiniMetric, MetricGrid, type MetricTrend } from "./metric-card";
export { FunnelChart, OnboardingFunnel, HorizontalFunnel } from "./funnel-chart";
export { CohortTable, ComparisonTable } from "./cohort-table";

// Analytics Provider and Hooks
export {
  AnalyticsProvider,
  useFeatureTracking,
  useTaskTracking,
  useProjectTracking,
  useGrantTracking,
} from "./analytics-provider";

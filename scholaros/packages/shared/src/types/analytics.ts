/**
 * Analytics Types for Phase 9B Data Science Implementation
 *
 * This module defines types for:
 * - Analytics event tracking
 * - Onboarding funnel analysis
 * - Search analytics and ranking
 * - Recurring task analytics
 * - Feature validation
 */

// ============================================================================
// Core Analytics Event Types
// ============================================================================

export type AnalyticsEventType =
  // Onboarding events
  | "onboarding_started"
  | "onboarding_step_viewed"
  | "onboarding_step_completed"
  | "onboarding_step_abandoned"
  | "onboarding_skipped"
  | "onboarding_completed"
  | "onboarding_profile_field_filled"
  | "onboarding_workspace_action"
  | "onboarding_first_task_action"
  // Search events
  | "search_opened"
  | "search_query_entered"
  | "search_results_displayed"
  | "search_result_selected"
  | "search_result_action"
  | "search_closed"
  | "search_no_results"
  // Recurring task events
  | "recurring_task_created"
  | "recurring_task_completed"
  | "recurring_task_edited"
  | "recurring_task_deleted"
  | "recurring_task_skipped"
  // General feature events
  | "feature_viewed"
  | "feature_interacted"
  | "action_completed"
  | "error_occurred";

export type EntityType =
  | "task"
  | "project"
  | "grant"
  | "publication"
  | "workspace"
  | "user"
  | "search"
  | "navigation";

export interface AnalyticsEventMetadata {
  duration_ms?: number;
  result?: "success" | "failure" | "abandoned";
  error_code?: string;
  error_message?: string;
  feature_flags?: Record<string, boolean>;
  ab_test_group?: string;
  performance_metrics?: Record<string, number>;
}

export interface AnalyticsEvent {
  event_id: string;
  event_name: AnalyticsEventType;
  timestamp: string;
  user_id: string;
  session_id: string;
  workspace_id?: string | null;
  platform: "web" | "mobile";
  viewport_width?: number;
  user_agent?: string;
  properties: Record<string, unknown>;
  metadata?: AnalyticsEventMetadata;
}

export interface AnalyticsEventBatch {
  events: AnalyticsEvent[];
}

// ============================================================================
// Onboarding Analytics Types
// ============================================================================

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export const ONBOARDING_STEPS = {
  NOT_STARTED: 0,
  WELCOME: 1,
  PROFILE: 2,
  WORKSPACE: 3,
  FIRST_TASK: 4,
  COMPLETION: 5,
} as const;

export const ONBOARDING_STEP_NAMES: Record<OnboardingStep, string> = {
  0: "not_started",
  1: "welcome",
  2: "profile",
  3: "workspace",
  4: "first_task",
  5: "completion",
};

export interface OnboardingProgress {
  step: OnboardingStep;
  completed: boolean;
  skipped: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface OnboardingStepEvent {
  step: OnboardingStep;
  step_name: string;
  duration_ms: number;
  interactions_count: number;
  fields_completed?: string[];
}

export interface OnboardingFunnelMetrics {
  cohort_date: string;
  cohort_size: number;
  started_count: number;
  started_rate: number;
  step_1_completed: number;
  step_2_completed: number;
  step_3_completed: number;
  step_4_completed: number;
  completed_count: number;
  completion_rate: number;
  skipped_count: number;
  skip_rate: number;
  avg_time_to_complete_ms: number | null;
  retained_7d_count: number;
  retained_7d_rate: number;
}

export interface OnboardingPrediction {
  user_id: string;
  completion_probability: number;
  risk_category: "high_risk" | "medium_risk" | "low_risk";
  top_risk_factors: string[];
  recommended_interventions: OnboardingIntervention[];
}

export interface OnboardingIntervention {
  action: string;
  message: string;
  priority: "high" | "medium" | "low";
}

// ============================================================================
// Search Analytics Types
// ============================================================================

export type SearchResultType =
  | "task"
  | "project"
  | "grant"
  | "publication"
  | "navigation"
  | "action";

export type SearchSource =
  | "command_palette"
  | "quick_search"
  | "navigation";

export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  workspace_id: string | null;
  query: string;
  query_normalized: string;
  result_type: SearchResultType | null;
  result_id: string | null;
  result_title: string | null;
  source: SearchSource;
  selected: boolean;
  created_at: string;
}

export interface RecentSearch {
  query: string;
  result_type: SearchResultType | null;
  result_id: string | null;
  result_title: string | null;
  last_searched_at: string;
}

export interface SearchSession {
  session_id: string;
  user_id: string;
  workspace_id: string | null;
  queries_entered: number;
  results_selected: number;
  session_start: string;
  session_end: string;
  duration_ms: number;
}

export interface SearchMetrics {
  date: string;
  total_searches: number;
  unique_users: number;
  total_selections: number;
  click_through_rate: number;
  unique_queries: number;
  avg_queries_per_user: number;
  no_results_count: number;
  no_results_rate: number;
  results_by_type: Record<SearchResultType, number>;
}

// ============================================================================
// Search Ranking Types
// ============================================================================

export interface SearchRankingFeatures {
  // Query-Document Relevance
  title_exact_match: number;
  title_token_overlap: number;
  char_ngram_similarity: number;
  title_length: number;
  title_word_count: number;

  // User Personalization
  user_previously_selected: number;
  user_type_preference: number;

  // Temporal Signals
  days_since_update: number;
  updated_this_week: number;

  // Contextual Signals
  type_matches_context: number;

  // Result type indicators (one-hot)
  type_task: number;
  type_project: number;
  type_grant: number;
  type_publication: number;
  type_navigation: number;
}

export interface SearchRankingWeights {
  title_exact_match: number;
  title_token_overlap: number;
  char_ngram_similarity: number;
  user_previously_selected: number;
  user_type_preference: number;
  updated_this_week: number;
  type_matches_context: number;
  title_length: number; // Penalty (negative weight)
  days_since_update: number; // Penalty (negative weight)
}

export const DEFAULT_RANKING_WEIGHTS: SearchRankingWeights = {
  title_exact_match: 5.0,
  title_token_overlap: 3.0,
  char_ngram_similarity: 1.5,
  user_previously_selected: 2.0,
  user_type_preference: 1.0,
  updated_this_week: 0.5,
  type_matches_context: 1.5,
  title_length: -0.01,
  days_since_update: -0.005,
};

export interface ScoredSearchResult<T> {
  result: T;
  score: number;
  features: Partial<SearchRankingFeatures>;
}

export interface SearchRankingMetrics {
  mean_reciprocal_rank: number;
  click_through_rate: number;
  precision_at_5: number;
  ndcg: number;
  sample_size: number;
}

// ============================================================================
// Recurring Task Analytics Types
// ============================================================================

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringTaskFields {
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  recurrence_date: string | null;
  recurrence_exceptions: string[];
}

export interface RecurrenceInfo {
  is_parent: boolean;
  is_instance: boolean;
  parent_id: string;
  rule: string | null;
  instance_date: string | null;
  exception_count: number;
  instance_count: number;
}

export type RecurrenceEditScope = "this" | "this_and_future" | "all";

export interface RecurringTaskMetrics {
  date: string;
  recurring_tasks_created: number;
  unique_creators: number;
  instances_generated: number;
  instances_completed: number;
  instance_completion_rate: number;
}

export interface RecurrencePatternDistribution {
  frequency: RecurrenceFrequency;
  count: number;
  percentage: number;
}

export interface RecurringTaskAdoption {
  adoption_rate: number;
  recurring_task_rate: number;
  average_recurring_per_user: number;
  total_recurring_tasks: number;
  total_adopters: number;
}

export interface CompletionRateComparison {
  instance_completion_rate: number;
  one_time_completion_rate: number;
  lift: number | null;
  p_value: number | null;
  is_statistically_significant: boolean | null;
  sample_sizes: {
    recurring_instances: number;
    one_time_tasks: number;
  };
}

// ============================================================================
// Feature Validation Types
// ============================================================================

export interface FeatureValidationResult {
  feature_name: string;
  metric_name: string;
  baseline_value: number;
  current_value: number;
  lift: number;
  confidence_interval: [number, number];
  p_value: number;
  is_significant: boolean;
  sample_size: number;
  recommendation: "ship" | "iterate" | "drop";
}

export interface ABTestConfig {
  name: string;
  baseline_rate: number;
  minimum_detectable_effect: number;
  alpha: number;
  power: number;
}

export interface ABTestResult {
  control_rate: number;
  treatment_rate: number;
  lift: number;
  lift_ci_lower: number;
  lift_ci_upper: number;
  p_value: number;
  is_significant: boolean;
  recommendation: "ship" | "iterate" | "drop";
  sample_sizes: {
    control: number;
    treatment: number;
  };
}

export interface FeatureValidationSpec {
  feature_name: string;
  sprint: number;
  primary_metric: string;
  baseline_estimate: number | null;
  success_threshold: number;
  min_sample_size: number;
  observation_days: number;
  secondary_metrics: string[];
}

// ============================================================================
// Analytics Dashboard Types
// ============================================================================

export interface AnalyticsDashboardData {
  onboarding: {
    funnel: OnboardingFunnelMetrics[];
    current_completion_rate: number;
    trend: "up" | "down" | "stable";
  };
  search: {
    metrics: SearchMetrics[];
    current_ctr: number;
    trend: "up" | "down" | "stable";
  };
  recurring_tasks: {
    adoption: RecurringTaskAdoption;
    pattern_distribution: RecurrencePatternDistribution[];
    completion_comparison: CompletionRateComparison;
  };
}

// ============================================================================
// ML Model Types
// ============================================================================

export interface ModelPrediction<T> {
  prediction: T;
  confidence: number;
  model_version: string;
  timestamp: string;
}

export interface ModelMetrics {
  model_name: string;
  version: string;
  auc_roc?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  mrr?: number;
  ctr?: number;
  sample_size: number;
  last_trained: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: "positive" | "negative";
}

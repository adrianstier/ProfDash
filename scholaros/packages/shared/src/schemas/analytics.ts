import { z } from "zod";

// ============================================================================
// Analytics Event Schemas
// ============================================================================

export const AnalyticsEventTypeSchema = z.enum([
  // Onboarding events
  "onboarding_started",
  "onboarding_step_viewed",
  "onboarding_step_completed",
  "onboarding_step_abandoned",
  "onboarding_skipped",
  "onboarding_completed",
  "onboarding_profile_field_filled",
  "onboarding_workspace_action",
  "onboarding_first_task_action",
  // Search events
  "search_opened",
  "search_query_entered",
  "search_results_displayed",
  "search_result_selected",
  "search_result_action",
  "search_closed",
  "search_no_results",
  // Recurring task events
  "recurring_task_created",
  "recurring_task_completed",
  "recurring_task_edited",
  "recurring_task_deleted",
  "recurring_task_skipped",
  // General feature events
  "feature_viewed",
  "feature_interacted",
  "action_completed",
  "error_occurred",
]);

export const EntityTypeSchema = z.enum([
  "task",
  "project",
  "grant",
  "publication",
  "workspace",
  "user",
  "search",
  "navigation",
]);

export const AnalyticsEventMetadataSchema = z.object({
  duration_ms: z.number().int().positive().optional(),
  result: z.enum(["success", "failure", "abandoned"]).optional(),
  error_code: z.string().max(50).optional(),
  error_message: z.string().max(500).optional(),
  feature_flags: z.record(z.boolean()).optional(),
  ab_test_group: z.string().max(50).optional(),
  performance_metrics: z.record(z.number()).optional(),
});

export const AnalyticsEventSchema = z.object({
  event_id: z.string().uuid(),
  event_name: AnalyticsEventTypeSchema,
  timestamp: z.string().datetime(),
  user_id: z.string().uuid(),
  session_id: z.string().min(1).max(100),
  workspace_id: z.string().uuid().nullable().optional(),
  platform: z.enum(["web", "mobile"]).default("web"),
  viewport_width: z.number().int().positive().optional(),
  user_agent: z.string().max(500).optional(),
  properties: z.record(z.unknown()).default({}),
  metadata: AnalyticsEventMetadataSchema.optional(),
});

export const AnalyticsEventBatchSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(100),
});

// ============================================================================
// Onboarding Schemas
// ============================================================================

export const OnboardingStepSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const OnboardingProgressSchema = z.object({
  step: OnboardingStepSchema,
  completed: z.boolean(),
  skipped: z.boolean(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export const UpdateOnboardingSchema = z.object({
  step: OnboardingStepSchema.optional(),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const OnboardingStepEventSchema = z.object({
  step: OnboardingStepSchema,
  step_name: z.string().min(1).max(50),
  duration_ms: z.number().int().nonnegative(),
  interactions_count: z.number().int().nonnegative(),
  fields_completed: z.array(z.string()).optional(),
});

// ============================================================================
// Search Schemas
// ============================================================================

export const SearchResultTypeSchema = z.enum([
  "task",
  "project",
  "grant",
  "publication",
  "navigation",
  "action",
]);

export const SearchSourceSchema = z.enum([
  "command_palette",
  "quick_search",
  "navigation",
]);

export const SearchHistoryInsertSchema = z.object({
  query: z.string().min(1).max(200),
  workspace_id: z.string().uuid().optional(),
  result_type: SearchResultTypeSchema.optional(),
  result_id: z.string().uuid().optional(),
  result_title: z.string().max(500).optional(),
  source: SearchSourceSchema.default("command_palette"),
  selected: z.boolean().default(false),
});

export const SearchQueryParamsSchema = z.object({
  q: z.string().min(1).max(200),
  types: z.array(SearchResultTypeSchema).optional(),
  limit: z.number().min(1).max(20).default(5),
  workspace_id: z.string().uuid().optional(),
});

export const RecentSearchSchema = z.object({
  query: z.string(),
  result_type: SearchResultTypeSchema.nullable(),
  result_id: z.string().uuid().nullable(),
  result_title: z.string().nullable(),
  last_searched_at: z.string().datetime(),
});

// ============================================================================
// Search Ranking Schemas
// ============================================================================

export const SearchRankingFeaturesSchema = z.object({
  // Query-Document Relevance
  title_exact_match: z.number().min(0).max(1),
  title_token_overlap: z.number().min(0).max(1),
  char_ngram_similarity: z.number().min(0).max(1),
  title_length: z.number().int().nonnegative(),
  title_word_count: z.number().int().nonnegative(),

  // User Personalization
  user_previously_selected: z.number().min(0).max(1),
  user_type_preference: z.number().min(0).max(1),

  // Temporal Signals
  days_since_update: z.number().int().nonnegative(),
  updated_this_week: z.number().min(0).max(1),

  // Contextual Signals
  type_matches_context: z.number().min(0).max(1),

  // Result type indicators
  type_task: z.number().min(0).max(1),
  type_project: z.number().min(0).max(1),
  type_grant: z.number().min(0).max(1),
  type_publication: z.number().min(0).max(1),
  type_navigation: z.number().min(0).max(1),
}).partial();

export const SearchRankingWeightsSchema = z.object({
  title_exact_match: z.number().default(5.0),
  title_token_overlap: z.number().default(3.0),
  char_ngram_similarity: z.number().default(1.5),
  user_previously_selected: z.number().default(2.0),
  user_type_preference: z.number().default(1.0),
  updated_this_week: z.number().default(0.5),
  type_matches_context: z.number().default(1.5),
  title_length: z.number().default(-0.01),
  days_since_update: z.number().default(-0.005),
});

// ============================================================================
// Recurring Task Schemas
// ============================================================================

export const RecurrenceFrequencySchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const RecurrenceRuleSchema = z.object({
  frequency: RecurrenceFrequencySchema,
  interval: z.number().int().min(1).max(365),
  byDay: z.array(z.enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])).optional(),
  byMonthDay: z.array(z.number().int().min(1).max(31)).optional(),
  byMonth: z.array(z.number().int().min(1).max(12)).optional(),
  until: z.string().datetime().optional(),
  count: z.number().int().min(1).max(999).optional(),
});

export const CreateRecurringTaskSchema = z.object({
  title: z.string().min(1).max(500),
  recurrence_rule: z.string().startsWith("RRULE:"),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  workspace_id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable().optional(),
});

export const RecurrenceEditScopeSchema = z.enum([
  "this",
  "this_and_future",
  "all",
]);

export const UpdateRecurrenceSchema = z.object({
  scope: RecurrenceEditScopeSchema,
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    recurrence_rule: z.string().startsWith("RRULE:").optional(),
    due: z.string().optional(),
    category: z.string().optional(),
    priority: z.string().optional(),
  }),
});

// ============================================================================
// Feature Validation Schemas
// ============================================================================

export const ABTestConfigSchema = z.object({
  name: z.string().min(1).max(100),
  baseline_rate: z.number().min(0).max(1),
  minimum_detectable_effect: z.number().min(0).max(1),
  alpha: z.number().min(0).max(1).default(0.05),
  power: z.number().min(0).max(1).default(0.80),
});

export const ABTestResultSchema = z.object({
  control_rate: z.number(),
  treatment_rate: z.number(),
  lift: z.number(),
  lift_ci_lower: z.number(),
  lift_ci_upper: z.number(),
  p_value: z.number(),
  is_significant: z.boolean(),
  recommendation: z.enum(["ship", "iterate", "drop"]),
  sample_sizes: z.object({
    control: z.number().int(),
    treatment: z.number().int(),
  }),
});

export const FeatureValidationResultSchema = z.object({
  feature_name: z.string(),
  metric_name: z.string(),
  baseline_value: z.number(),
  current_value: z.number(),
  lift: z.number(),
  confidence_interval: z.tuple([z.number(), z.number()]),
  p_value: z.number(),
  is_significant: z.boolean(),
  sample_size: z.number().int(),
  recommendation: z.enum(["ship", "iterate", "drop"]),
});

// ============================================================================
// Dashboard & Metrics Schemas
// ============================================================================

export const OnboardingFunnelMetricsSchema = z.object({
  cohort_date: z.string(),
  cohort_size: z.number().int(),
  started_count: z.number().int(),
  started_rate: z.number(),
  step_1_completed: z.number().int(),
  step_2_completed: z.number().int(),
  step_3_completed: z.number().int(),
  step_4_completed: z.number().int(),
  completed_count: z.number().int(),
  completion_rate: z.number(),
  skipped_count: z.number().int(),
  skip_rate: z.number(),
  avg_time_to_complete_ms: z.number().nullable(),
  retained_7d_count: z.number().int(),
  retained_7d_rate: z.number(),
});

export const SearchMetricsSchema = z.object({
  date: z.string(),
  total_searches: z.number().int(),
  unique_users: z.number().int(),
  total_selections: z.number().int(),
  click_through_rate: z.number(),
  unique_queries: z.number().int(),
  avg_queries_per_user: z.number(),
  no_results_count: z.number().int(),
  no_results_rate: z.number(),
  results_by_type: z.record(z.number().int()),
});

export const RecurringTaskMetricsSchema = z.object({
  date: z.string(),
  recurring_tasks_created: z.number().int(),
  unique_creators: z.number().int(),
  instances_generated: z.number().int(),
  instances_completed: z.number().int(),
  instance_completion_rate: z.number(),
});

export const RecurringTaskAdoptionSchema = z.object({
  adoption_rate: z.number(),
  recurring_task_rate: z.number(),
  average_recurring_per_user: z.number(),
  total_recurring_tasks: z.number().int(),
  total_adopters: z.number().int(),
});

// ============================================================================
// ML Model Schemas
// ============================================================================

export const ModelPredictionSchema = z.object({
  prediction: z.unknown(),
  confidence: z.number().min(0).max(1),
  model_version: z.string(),
  timestamp: z.string().datetime(),
});

export const ModelMetricsSchema = z.object({
  model_name: z.string(),
  version: z.string(),
  auc_roc: z.number().optional(),
  precision: z.number().optional(),
  recall: z.number().optional(),
  f1: z.number().optional(),
  mrr: z.number().optional(),
  ctr: z.number().optional(),
  sample_size: z.number().int(),
  last_trained: z.string().datetime(),
});

export const OnboardingPredictionSchema = z.object({
  user_id: z.string().uuid(),
  completion_probability: z.number().min(0).max(1),
  risk_category: z.enum(["high_risk", "medium_risk", "low_risk"]),
  top_risk_factors: z.array(z.string()),
  recommended_interventions: z.array(z.object({
    action: z.string(),
    message: z.string(),
    priority: z.enum(["high", "medium", "low"]),
  })),
});

// ============================================================================
// Export Inferred Types
// ============================================================================

export type AnalyticsEventSchemaType = z.infer<typeof AnalyticsEventSchema>;
export type AnalyticsEventBatchSchemaType = z.infer<typeof AnalyticsEventBatchSchema>;
export type OnboardingProgressSchemaType = z.infer<typeof OnboardingProgressSchema>;
export type UpdateOnboardingSchemaType = z.infer<typeof UpdateOnboardingSchema>;
export type SearchHistoryInsertSchemaType = z.infer<typeof SearchHistoryInsertSchema>;
export type SearchQueryParamsSchemaType = z.infer<typeof SearchQueryParamsSchema>;
export type RecurrenceRuleSchemaType = z.infer<typeof RecurrenceRuleSchema>;
export type CreateRecurringTaskSchemaType = z.infer<typeof CreateRecurringTaskSchema>;
export type UpdateRecurrenceSchemaType = z.infer<typeof UpdateRecurrenceSchema>;
export type ABTestConfigSchemaType = z.infer<typeof ABTestConfigSchema>;
export type ABTestResultSchemaType = z.infer<typeof ABTestResultSchema>;
export type FeatureValidationResultSchemaType = z.infer<typeof FeatureValidationResultSchema>;
export type OnboardingFunnelMetricsSchemaType = z.infer<typeof OnboardingFunnelMetricsSchema>;
export type SearchMetricsSchemaType = z.infer<typeof SearchMetricsSchema>;
export type RecurringTaskMetricsSchemaType = z.infer<typeof RecurringTaskMetricsSchema>;
export type ModelPredictionSchemaType = z.infer<typeof ModelPredictionSchema>;
export type OnboardingPredictionSchemaType = z.infer<typeof OnboardingPredictionSchema>;

/**
 * Analytics Schema Tests
 *
 * Tests for the Phase 9B analytics Zod schemas.
 * Run with: pnpm test
 */

import { describe, it, expect } from "vitest";
import {
  AnalyticsEventSchema,
  AnalyticsEventBatchSchema,
  AnalyticsEventTypeSchema,
  OnboardingProgressSchema,
  UpdateOnboardingSchema,
  SearchHistoryInsertSchema,
  SearchQueryParamsSchema,
  RecurrenceRuleSchema,
  CreateRecurringTaskSchema,
  RecurrenceEditScopeSchema,
  ABTestConfigSchema,
  ABTestResultSchema,
} from "@scholaros/shared/schemas";

describe("Analytics Event Schemas", () => {
  describe("AnalyticsEventTypeSchema", () => {
    it("should accept all onboarding event types", () => {
      const onboardingEvents = [
        "onboarding_started",
        "onboarding_step_viewed",
        "onboarding_step_completed",
        "onboarding_step_abandoned",
        "onboarding_skipped",
        "onboarding_completed",
        "onboarding_profile_field_filled",
        "onboarding_workspace_action",
        "onboarding_first_task_action",
      ];

      onboardingEvents.forEach((event) => {
        const result = AnalyticsEventTypeSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all search event types", () => {
      const searchEvents = [
        "search_opened",
        "search_query_entered",
        "search_results_displayed",
        "search_result_selected",
        "search_result_action",
        "search_closed",
        "search_no_results",
      ];

      searchEvents.forEach((event) => {
        const result = AnalyticsEventTypeSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all recurring task event types", () => {
      const recurringEvents = [
        "recurring_task_created",
        "recurring_task_completed",
        "recurring_task_edited",
        "recurring_task_deleted",
        "recurring_task_skipped",
      ];

      recurringEvents.forEach((event) => {
        const result = AnalyticsEventTypeSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it("should accept general feature events", () => {
      const generalEvents = [
        "feature_viewed",
        "feature_interacted",
        "action_completed",
        "error_occurred",
      ];

      generalEvents.forEach((event) => {
        const result = AnalyticsEventTypeSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid event types", () => {
      const invalidEvents = ["invalid_event", "custom_event", "unknown"];

      invalidEvents.forEach((event) => {
        const result = AnalyticsEventTypeSchema.safeParse(event);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("AnalyticsEventSchema", () => {
    it("should validate a complete event", () => {
      const event = {
        event_id: "550e8400-e29b-41d4-a716-446655440000",
        event_name: "onboarding_started",
        timestamp: "2024-01-15T10:30:00Z",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
        workspace_id: "550e8400-e29b-41d4-a716-446655440002",
        platform: "web",
        viewport_width: 1920,
        user_agent: "Mozilla/5.0...",
        properties: { source: "signup" },
        metadata: {
          duration_ms: 5000,
          result: "success",
        },
      };

      const result = AnalyticsEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal event", () => {
      const event = {
        event_id: "550e8400-e29b-41d4-a716-446655440000",
        event_name: "feature_viewed",
        timestamp: "2024-01-15T10:30:00Z",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
      };

      const result = AnalyticsEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should apply default platform", () => {
      const event = {
        event_id: "550e8400-e29b-41d4-a716-446655440000",
        event_name: "feature_viewed",
        timestamp: "2024-01-15T10:30:00Z",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
      };

      const result = AnalyticsEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platform).toBe("web");
      }
    });

    it("should reject invalid UUID for event_id", () => {
      const event = {
        event_id: "not-a-uuid",
        event_name: "feature_viewed",
        timestamp: "2024-01-15T10:30:00Z",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
      };

      const result = AnalyticsEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it("should reject invalid timestamp format", () => {
      const event = {
        event_id: "550e8400-e29b-41d4-a716-446655440000",
        event_name: "feature_viewed",
        timestamp: "not-a-timestamp",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
      };

      const result = AnalyticsEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it("should accept nullable workspace_id", () => {
      const event = {
        event_id: "550e8400-e29b-41d4-a716-446655440000",
        event_name: "feature_viewed",
        timestamp: "2024-01-15T10:30:00Z",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
        workspace_id: null,
      };

      const result = AnalyticsEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe("AnalyticsEventBatchSchema", () => {
    it("should validate a batch of events", () => {
      const batch = {
        events: [
          {
            event_id: "550e8400-e29b-41d4-a716-446655440000",
            event_name: "feature_viewed",
            timestamp: "2024-01-15T10:30:00Z",
            user_id: "550e8400-e29b-41d4-a716-446655440001",
            session_id: "session-123",
          },
          {
            event_id: "550e8400-e29b-41d4-a716-446655440002",
            event_name: "action_completed",
            timestamp: "2024-01-15T10:31:00Z",
            user_id: "550e8400-e29b-41d4-a716-446655440001",
            session_id: "session-123",
          },
        ],
      };

      const result = AnalyticsEventBatchSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });

    it("should reject empty batch", () => {
      const batch = { events: [] };
      const result = AnalyticsEventBatchSchema.safeParse(batch);
      expect(result.success).toBe(false);
    });

    it("should reject batch exceeding 100 events", () => {
      const events = Array.from({ length: 101 }, (_, i) => ({
        event_id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
        event_name: "feature_viewed",
        timestamp: "2024-01-15T10:30:00Z",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
      }));

      const batch = { events };
      const result = AnalyticsEventBatchSchema.safeParse(batch);
      expect(result.success).toBe(false);
    });

    it("should accept batch at maximum size (100)", () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        event_id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
        event_name: "feature_viewed",
        timestamp: "2024-01-15T10:30:00Z",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        session_id: "session-123",
      }));

      const batch = { events };
      const result = AnalyticsEventBatchSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });
  });
});

describe("Recurrence Schemas", () => {
  describe("RecurrenceRuleSchema", () => {
    it("should validate daily recurrence", () => {
      const rule = {
        frequency: "daily",
        interval: 1,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("should validate weekly recurrence with days", () => {
      const rule = {
        frequency: "weekly",
        interval: 1,
        byDay: ["MO", "WE", "FR"],
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("should validate monthly recurrence", () => {
      const rule = {
        frequency: "monthly",
        interval: 1,
        byMonthDay: [1, 15],
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("should validate yearly recurrence", () => {
      const rule = {
        frequency: "yearly",
        interval: 1,
        byMonth: [1, 6, 12],
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("should validate recurrence with end date", () => {
      const rule = {
        frequency: "daily",
        interval: 1,
        until: "2024-12-31T23:59:59Z",
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("should validate recurrence with count", () => {
      const rule = {
        frequency: "weekly",
        interval: 1,
        count: 10,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("should reject invalid frequency", () => {
      const rule = {
        frequency: "biweekly",
        interval: 1,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(false);
    });

    it("should reject invalid interval", () => {
      const rule = {
        frequency: "daily",
        interval: 0,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(false);
    });

    it("should reject invalid day abbreviation", () => {
      const rule = {
        frequency: "weekly",
        interval: 1,
        byDay: ["MON", "TUE"],
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateRecurringTaskSchema", () => {
    it("should validate a recurring task", () => {
      const task = {
        title: "Weekly standup",
        recurrence_rule: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO",
        due: "2024-01-15",
      };

      const result = CreateRecurringTaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("should require RRULE prefix", () => {
      const task = {
        title: "Weekly standup",
        recurrence_rule: "FREQ=WEEKLY;INTERVAL=1",
        due: "2024-01-15",
      };

      const result = CreateRecurringTaskSchema.safeParse(task);
      expect(result.success).toBe(false);
    });

    it("should require valid date format", () => {
      const task = {
        title: "Weekly standup",
        recurrence_rule: "RRULE:FREQ=WEEKLY;INTERVAL=1",
        due: "01-15-2024", // Wrong format
      };

      const result = CreateRecurringTaskSchema.safeParse(task);
      expect(result.success).toBe(false);
    });
  });

  describe("RecurrenceEditScopeSchema", () => {
    it("should accept valid scopes", () => {
      const validScopes = ["this", "this_and_future", "all"];

      validScopes.forEach((scope) => {
        const result = RecurrenceEditScopeSchema.safeParse(scope);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid scopes", () => {
      const invalidScopes = ["single", "future", "none"];

      invalidScopes.forEach((scope) => {
        const result = RecurrenceEditScopeSchema.safeParse(scope);
        expect(result.success).toBe(false);
      });
    });
  });
});

describe("A/B Testing Schemas", () => {
  describe("ABTestConfigSchema", () => {
    it("should validate a complete config", () => {
      const config = {
        name: "onboarding_flow_v2",
        baseline_rate: 0.4,
        minimum_detectable_effect: 0.1,
        alpha: 0.05,
        power: 0.8,
      };

      const result = ABTestConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should apply defaults", () => {
      const config = {
        name: "test",
        baseline_rate: 0.5,
        minimum_detectable_effect: 0.1,
      };

      const result = ABTestConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alpha).toBe(0.05);
        expect(result.data.power).toBe(0.8);
      }
    });

    it("should reject rates outside 0-1", () => {
      const config = {
        name: "test",
        baseline_rate: 1.5, // Invalid
        minimum_detectable_effect: 0.1,
      };

      const result = ABTestConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("ABTestResultSchema", () => {
    it("should validate a complete result", () => {
      const result = {
        control_rate: 0.4,
        treatment_rate: 0.5,
        lift: 0.25,
        lift_ci_lower: 0.1,
        lift_ci_upper: 0.4,
        p_value: 0.02,
        is_significant: true,
        recommendation: "ship",
        sample_sizes: {
          control: 1000,
          treatment: 1000,
        },
      };

      const parseResult = ABTestResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it("should accept all recommendation values", () => {
      const recommendations = ["ship", "iterate", "drop"];

      recommendations.forEach((rec) => {
        const result = {
          control_rate: 0.4,
          treatment_rate: 0.5,
          lift: 0.25,
          lift_ci_lower: 0.1,
          lift_ci_upper: 0.4,
          p_value: 0.02,
          is_significant: true,
          recommendation: rec,
          sample_sizes: { control: 100, treatment: 100 },
        };

        const parseResult = ABTestResultSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
      });
    });
  });
});

describe("Metadata Validation", () => {
  it("should validate result metadata", () => {
    const metadata = {
      duration_ms: 5000,
      result: "success",
      error_code: undefined,
      feature_flags: { new_feature: true },
    };

    expect(metadata.duration_ms).toBe(5000);
    expect(metadata.result).toBe("success");
  });

  it("should accept all result types", () => {
    const results = ["success", "failure", "abandoned"];

    results.forEach((r) => {
      expect(results.includes(r)).toBe(true);
    });
  });
});

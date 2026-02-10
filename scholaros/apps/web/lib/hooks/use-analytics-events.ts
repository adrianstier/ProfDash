/**
 * Analytics Event Tracking Hook
 *
 * Provides type-safe event tracking throughout the application.
 * Events are batched and sent to the analytics API.
 *
 * Features:
 * - Automatic batching (reduces API calls)
 * - Session management
 * - Workspace context
 * - Visibility-based flushing
 * - Type-safe event tracking
 */

import { useCallback, useRef, useEffect, useMemo } from "react";
import { useUser } from "./use-user";
import { useWorkspaceStore } from "../stores/workspace-store";
import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsEventMetadata,
  OnboardingStep,
  SearchResultType,
  RecurrenceFrequency,
  RecurrenceEditScope,
} from "@scholaros/shared/types";

// ============================================================================
// Configuration
// ============================================================================

interface EventCollectorConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  apiEndpoint: string;
}

const DEFAULT_CONFIG: EventCollectorConfig = {
  batchSize: 10,
  flushIntervalMs: 5000,
  maxQueueSize: 100,
  apiEndpoint: "/api/analytics/events",
};

// ============================================================================
// Session Management
// ============================================================================

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Session ID persists for the browser session
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    // Check sessionStorage first
    if (typeof window !== "undefined") {
      sessionId = sessionStorage.getItem("analytics_session_id");
      if (!sessionId) {
        sessionId = generateSessionId();
        sessionStorage.setItem("analytics_session_id", sessionId);
      }
    } else {
      sessionId = generateSessionId();
    }
  }
  return sessionId;
}

// ============================================================================
// Event Queue
// ============================================================================

// Global queue to persist across hook instances
const eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEvents(
  config: EventCollectorConfig,
  events: AnalyticsEvent[]
): Promise<boolean> {
  if (events.length === 0) return true;

  try {
    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
    return response.ok;
  } catch (error) {
    console.error("[Analytics] Flush failed:", error);
    return false;
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

interface TrackOptions {
  immediate?: boolean;
  metadata?: AnalyticsEventMetadata;
}

interface UseAnalyticsEventsReturn {
  // Core tracking
  track: (
    eventName: AnalyticsEventType,
    properties?: Record<string, unknown>,
    options?: TrackOptions
  ) => void;

  // Onboarding events
  trackOnboardingStarted: (source: "signup" | "invite" | "resume") => void;
  trackOnboardingStepViewed: (step: OnboardingStep, stepName: string) => void;
  trackOnboardingStepCompleted: (
    step: OnboardingStep,
    stepName: string,
    durationMs: number,
    interactionsCount: number
  ) => void;
  trackOnboardingSkipped: (atStep: OnboardingStep) => void;
  trackOnboardingCompleted: (
    totalDurationMs: number,
    stepsCompleted: number,
    firstTaskCreated: boolean
  ) => void;

  // Search events
  trackSearchOpened: (trigger: "keyboard_shortcut" | "click" | "programmatic") => void;
  trackSearchQueryEntered: (
    query: string,
    isModification: boolean,
    timeSinceOpenMs: number
  ) => void;
  trackSearchResultSelected: (
    resultType: SearchResultType,
    resultPosition: number,
    totalResults: number,
    timeToSelectMs: number
  ) => void;
  trackSearchClosed: (
    trigger: "escape" | "click_outside" | "selection" | "navigation",
    queriesEntered: number,
    resultsSelected: number,
    sessionDurationMs: number
  ) => void;
  trackSearchNoResults: (query: string) => void;

  // Recurring task events
  trackRecurringTaskCreated: (
    frequency: RecurrenceFrequency,
    interval: number,
    hasEndDate: boolean,
    category: string,
    priority: string
  ) => void;
  trackRecurringTaskCompleted: (
    instanceNumber: number,
    daysSinceDue: number,
    nextOccurrenceGenerated: boolean
  ) => void;
  trackRecurringTaskEdited: (
    editScope: RecurrenceEditScope,
    fieldsChanged: string[],
    changedRecurrenceRule: boolean
  ) => void;

  // Utility
  flush: () => Promise<void>;
  sessionId: string;
}

export function useAnalyticsEvents(
  config: Partial<EventCollectorConfig> = {}
): UseAnalyticsEventsReturn {
  const { user } = useUser();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });

  // Setup flush interval
  useEffect(() => {
    const scheduleFlush = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(async () => {
        if (eventQueue.length > 0) {
          const batch = eventQueue.splice(0, configRef.current.batchSize);
          const success = await flushEvents(configRef.current, batch);
          if (!success && eventQueue.length < configRef.current.maxQueueSize) {
            // Re-queue on failure
            eventQueue.unshift(...batch);
          }
        }
        scheduleFlush();
      }, configRef.current.flushIntervalMs);
    };

    scheduleFlush();

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, []);

  // Flush on visibility change (page hide)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && eventQueue.length > 0) {
        // Use sendBeacon for reliability during page unload.
        // Wrap in a Blob with Content-Type so the API route can parse JSON.
        const blob = new Blob(
          [JSON.stringify({ events: [...eventQueue] })],
          { type: "application/json" }
        );
        navigator.sendBeacon?.(configRef.current.apiEndpoint, blob);
        eventQueue.length = 0;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Core track function
  const track = useCallback(
    (
      eventName: AnalyticsEventType,
      properties: Record<string, unknown> = {},
      options: TrackOptions = {}
    ) => {
      if (!user?.id) return;

      const event: AnalyticsEvent = {
        event_id: crypto.randomUUID(),
        event_name: eventName,
        timestamp: new Date().toISOString(),
        user_id: user.id,
        session_id: getSessionId(),
        workspace_id: workspaceId ?? null,
        platform: "web",
        viewport_width: typeof window !== "undefined" ? window.innerWidth : undefined,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        properties,
        metadata: options.metadata,
      };

      if (options.immediate) {
        flushEvents(configRef.current, [event]);
      } else {
        eventQueue.push(event);

        // Flush if queue is full
        if (eventQueue.length >= configRef.current.batchSize) {
          const batch = eventQueue.splice(0, configRef.current.batchSize);
          flushEvents(configRef.current, batch);
        }
      }
    },
    [user?.id, workspaceId]
  );

  // Onboarding event trackers
  const trackOnboardingStarted = useCallback(
    (source: "signup" | "invite" | "resume") => {
      track("onboarding_started", { source });
    },
    [track]
  );

  const trackOnboardingStepViewed = useCallback(
    (step: OnboardingStep, stepName: string) => {
      track("onboarding_step_viewed", { step, step_name: stepName });
    },
    [track]
  );

  const trackOnboardingStepCompleted = useCallback(
    (
      step: OnboardingStep,
      stepName: string,
      durationMs: number,
      interactionsCount: number
    ) => {
      track("onboarding_step_completed", {
        step,
        step_name: stepName,
        duration_ms: durationMs,
        interactions_count: interactionsCount,
      });
    },
    [track]
  );

  const trackOnboardingSkipped = useCallback(
    (atStep: OnboardingStep) => {
      track("onboarding_skipped", { at_step: atStep }, { immediate: true });
    },
    [track]
  );

  const trackOnboardingCompleted = useCallback(
    (totalDurationMs: number, stepsCompleted: number, firstTaskCreated: boolean) => {
      track(
        "onboarding_completed",
        {
          total_duration_ms: totalDurationMs,
          steps_completed: stepsCompleted,
          first_task_created: firstTaskCreated,
        },
        { immediate: true }
      );
    },
    [track]
  );

  // Search event trackers
  const trackSearchOpened = useCallback(
    (trigger: "keyboard_shortcut" | "click" | "programmatic") => {
      track("search_opened", {
        trigger,
        context_page: typeof window !== "undefined" ? window.location.pathname : "",
      });
    },
    [track]
  );

  const trackSearchQueryEntered = useCallback(
    (query: string, isModification: boolean, timeSinceOpenMs: number) => {
      track("search_query_entered", {
        query_length: query.length,
        is_modification: isModification,
        time_since_open_ms: timeSinceOpenMs,
      });
    },
    [track]
  );

  const trackSearchResultSelected = useCallback(
    (
      resultType: SearchResultType,
      resultPosition: number,
      totalResults: number,
      timeToSelectMs: number
    ) => {
      track("search_result_selected", {
        result_type: resultType,
        result_position: resultPosition,
        total_results: totalResults,
        time_to_select_ms: timeToSelectMs,
      });
    },
    [track]
  );

  const trackSearchClosed = useCallback(
    (
      trigger: "escape" | "click_outside" | "selection" | "navigation",
      queriesEntered: number,
      resultsSelected: number,
      sessionDurationMs: number
    ) => {
      track("search_closed", {
        trigger,
        queries_entered: queriesEntered,
        results_selected: resultsSelected,
        session_duration_ms: sessionDurationMs,
      });
    },
    [track]
  );

  const trackSearchNoResults = useCallback(
    (query: string) => {
      track("search_no_results", {
        query,
        query_length: query.length,
      });
    },
    [track]
  );

  // Recurring task event trackers
  const trackRecurringTaskCreated = useCallback(
    (
      frequency: RecurrenceFrequency,
      interval: number,
      hasEndDate: boolean,
      category: string,
      priority: string
    ) => {
      track("recurring_task_created", {
        frequency,
        interval,
        has_end_date: hasEndDate,
        category,
        priority,
      });
    },
    [track]
  );

  const trackRecurringTaskCompleted = useCallback(
    (
      instanceNumber: number,
      daysSinceDue: number,
      nextOccurrenceGenerated: boolean
    ) => {
      track("recurring_task_completed", {
        instance_number: instanceNumber,
        days_since_due: daysSinceDue,
        next_occurrence_generated: nextOccurrenceGenerated,
      });
    },
    [track]
  );

  const trackRecurringTaskEdited = useCallback(
    (
      editScope: RecurrenceEditScope,
      fieldsChanged: string[],
      changedRecurrenceRule: boolean
    ) => {
      track("recurring_task_edited", {
        edit_scope: editScope,
        fields_changed: fieldsChanged,
        changed_recurrence_rule: changedRecurrenceRule,
      });
    },
    [track]
  );

  // Manual flush
  const flush = useCallback(async () => {
    if (eventQueue.length > 0) {
      const batch = [...eventQueue];
      eventQueue.length = 0;
      await flushEvents(configRef.current, batch);
    }
  }, []);

  return useMemo(
    () => ({
      track,
      trackOnboardingStarted,
      trackOnboardingStepViewed,
      trackOnboardingStepCompleted,
      trackOnboardingSkipped,
      trackOnboardingCompleted,
      trackSearchOpened,
      trackSearchQueryEntered,
      trackSearchResultSelected,
      trackSearchClosed,
      trackSearchNoResults,
      trackRecurringTaskCreated,
      trackRecurringTaskCompleted,
      trackRecurringTaskEdited,
      flush,
      sessionId: getSessionId(),
    }),
    [
      track,
      trackOnboardingStarted,
      trackOnboardingStepViewed,
      trackOnboardingStepCompleted,
      trackOnboardingSkipped,
      trackOnboardingCompleted,
      trackSearchOpened,
      trackSearchQueryEntered,
      trackSearchResultSelected,
      trackSearchClosed,
      trackSearchNoResults,
      trackRecurringTaskCreated,
      trackRecurringTaskCompleted,
      trackRecurringTaskEdited,
      flush,
    ]
  );
}

// ============================================================================
// Query Keys for Analytics Data
// ============================================================================

export const analyticsKeys = {
  all: ["analytics"] as const,
  events: () => [...analyticsKeys.all, "events"] as const,
  onboarding: () => [...analyticsKeys.all, "onboarding"] as const,
  onboardingFunnel: (cohortStart: string, cohortEnd: string) =>
    [...analyticsKeys.onboarding(), "funnel", cohortStart, cohortEnd] as const,
  search: () => [...analyticsKeys.all, "search"] as const,
  searchMetrics: (startDate: string, endDate: string) =>
    [...analyticsKeys.search(), "metrics", startDate, endDate] as const,
  recurringTasks: () => [...analyticsKeys.all, "recurring-tasks"] as const,
  recurringTaskAdoption: (workspaceId: string) =>
    [...analyticsKeys.recurringTasks(), "adoption", workspaceId] as const,
  dashboard: (workspaceId: string, period: string) =>
    [...analyticsKeys.all, "dashboard", workspaceId, period] as const,
};

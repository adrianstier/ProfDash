import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAnalyticsStore } from "@/lib/stores/analytics-store";

const initialSearchSession = {
  isOpen: false,
  openedAt: null,
  trigger: null,
  queriesEntered: 0,
  resultsSelected: 0,
  lastQuery: "",
  lastQueryAt: null,
};

const initialOnboardingSession = {
  isActive: false,
  startedAt: null,
  currentStep: 0,
  stepStartedAt: null,
  interactionCount: 0,
  completedSteps: [],
};

const initialFeatureEngagement = {
  firstUsedAt: {},
  usageCount: {},
  lastUsedAt: {},
};

describe("useAnalyticsStore", () => {
  beforeEach(() => {
    useAnalyticsStore.setState({
      searchSession: { ...initialSearchSession },
      onboardingSession: { ...initialOnboardingSession },
      featureEngagement: { ...initialFeatureEngagement },
    });
  });

  describe("initial state", () => {
    it("should have default search session", () => {
      const { searchSession } = useAnalyticsStore.getState();
      expect(searchSession.isOpen).toBe(false);
      expect(searchSession.openedAt).toBeNull();
      expect(searchSession.trigger).toBeNull();
      expect(searchSession.queriesEntered).toBe(0);
      expect(searchSession.resultsSelected).toBe(0);
      expect(searchSession.lastQuery).toBe("");
      expect(searchSession.lastQueryAt).toBeNull();
    });

    it("should have default onboarding session", () => {
      const { onboardingSession } = useAnalyticsStore.getState();
      expect(onboardingSession.isActive).toBe(false);
      expect(onboardingSession.startedAt).toBeNull();
      expect(onboardingSession.currentStep).toBe(0);
      expect(onboardingSession.completedSteps).toEqual([]);
    });

    it("should have empty feature engagement", () => {
      const { featureEngagement } = useAnalyticsStore.getState();
      expect(featureEngagement.firstUsedAt).toEqual({});
      expect(featureEngagement.usageCount).toEqual({});
      expect(featureEngagement.lastUsedAt).toEqual({});
    });
  });

  describe("search session", () => {
    it("should open a search session with trigger", () => {
      useAnalyticsStore.getState().openSearchSession("keyboard_shortcut");
      const { searchSession } = useAnalyticsStore.getState();
      expect(searchSession.isOpen).toBe(true);
      expect(searchSession.trigger).toBe("keyboard_shortcut");
      expect(searchSession.openedAt).toBeTypeOf("number");
    });

    it("should open with click trigger", () => {
      useAnalyticsStore.getState().openSearchSession("click");
      expect(useAnalyticsStore.getState().searchSession.trigger).toBe("click");
    });

    it("should open with programmatic trigger", () => {
      useAnalyticsStore.getState().openSearchSession("programmatic");
      expect(useAnalyticsStore.getState().searchSession.trigger).toBe("programmatic");
    });

    it("should reset counters on new session open", () => {
      useAnalyticsStore.getState().openSearchSession("click");
      useAnalyticsStore.getState().recordSearchQuery("test");
      useAnalyticsStore.getState().openSearchSession("keyboard_shortcut");
      const { searchSession } = useAnalyticsStore.getState();
      expect(searchSession.queriesEntered).toBe(0);
      expect(searchSession.lastQuery).toBe("");
    });

    it("should close search session and return session data", () => {
      useAnalyticsStore.getState().openSearchSession("click");
      useAnalyticsStore.getState().recordSearchQuery("query1");
      const closedSession = useAnalyticsStore.getState().closeSearchSession();
      expect(closedSession.isOpen).toBe(true);
      expect(closedSession.trigger).toBe("click");
      expect(closedSession.queriesEntered).toBe(1);

      // After close, session should be reset
      expect(useAnalyticsStore.getState().searchSession.isOpen).toBe(false);
    });

    it("should record search queries and increment counter", () => {
      useAnalyticsStore.getState().openSearchSession("click");
      useAnalyticsStore.getState().recordSearchQuery("first query");
      useAnalyticsStore.getState().recordSearchQuery("second query");
      const { searchSession } = useAnalyticsStore.getState();
      expect(searchSession.queriesEntered).toBe(2);
      expect(searchSession.lastQuery).toBe("second query");
      expect(searchSession.lastQueryAt).toBeTypeOf("number");
    });

    it("should record search selection and increment counter", () => {
      useAnalyticsStore.getState().openSearchSession("click");
      useAnalyticsStore.getState().recordSearchSelection("task");
      useAnalyticsStore.getState().recordSearchSelection("project");
      expect(useAnalyticsStore.getState().searchSession.resultsSelected).toBe(2);
    });

    it("should reset search session", () => {
      useAnalyticsStore.getState().openSearchSession("click");
      useAnalyticsStore.getState().recordSearchQuery("test");
      useAnalyticsStore.getState().resetSearchSession();
      const { searchSession } = useAnalyticsStore.getState();
      expect(searchSession.isOpen).toBe(false);
      expect(searchSession.queriesEntered).toBe(0);
    });
  });

  describe("onboarding session", () => {
    it("should start an onboarding session", () => {
      useAnalyticsStore.getState().startOnboardingSession();
      const { onboardingSession } = useAnalyticsStore.getState();
      expect(onboardingSession.isActive).toBe(true);
      expect(onboardingSession.startedAt).toBeTypeOf("number");
      expect(onboardingSession.currentStep).toBe(1); // default initial step
      expect(onboardingSession.stepStartedAt).toBeTypeOf("number");
      expect(onboardingSession.interactionCount).toBe(0);
    });

    it("should start onboarding with custom initial step", () => {
      useAnalyticsStore.getState().startOnboardingSession(3);
      expect(useAnalyticsStore.getState().onboardingSession.currentStep).toBe(3);
    });

    it("should advance onboarding step", () => {
      useAnalyticsStore.getState().startOnboardingSession(1);
      useAnalyticsStore.getState().advanceOnboardingStep(2);
      const { onboardingSession } = useAnalyticsStore.getState();
      expect(onboardingSession.currentStep).toBe(2);
      expect(onboardingSession.completedSteps).toEqual([1]);
      expect(onboardingSession.interactionCount).toBe(0); // reset on advance
    });

    it("should accumulate completed steps", () => {
      useAnalyticsStore.getState().startOnboardingSession(1);
      useAnalyticsStore.getState().advanceOnboardingStep(2);
      useAnalyticsStore.getState().advanceOnboardingStep(3);
      const { onboardingSession } = useAnalyticsStore.getState();
      expect(onboardingSession.completedSteps).toEqual([1, 2]);
      expect(onboardingSession.currentStep).toBe(3);
    });

    it("should record onboarding interactions", () => {
      useAnalyticsStore.getState().startOnboardingSession();
      useAnalyticsStore.getState().recordOnboardingInteraction();
      useAnalyticsStore.getState().recordOnboardingInteraction();
      expect(useAnalyticsStore.getState().onboardingSession.interactionCount).toBe(2);
    });

    it("should complete onboarding session and return data", () => {
      useAnalyticsStore.getState().startOnboardingSession(1);
      useAnalyticsStore.getState().advanceOnboardingStep(2);
      const session = useAnalyticsStore.getState().completeOnboardingSession();
      expect(session.isActive).toBe(true);
      expect(session.currentStep).toBe(2);
      expect(session.completedSteps).toEqual([1]);

      // Should be reset after completion
      expect(useAnalyticsStore.getState().onboardingSession.isActive).toBe(false);
    });

    it("should skip onboarding session and return data", () => {
      useAnalyticsStore.getState().startOnboardingSession(1);
      const session = useAnalyticsStore.getState().skipOnboardingSession();
      expect(session.isActive).toBe(true);

      // Should be reset after skip
      expect(useAnalyticsStore.getState().onboardingSession.isActive).toBe(false);
    });

    it("should reset onboarding session", () => {
      useAnalyticsStore.getState().startOnboardingSession();
      useAnalyticsStore.getState().resetOnboardingSession();
      expect(useAnalyticsStore.getState().onboardingSession.isActive).toBe(false);
      expect(useAnalyticsStore.getState().onboardingSession.currentStep).toBe(0);
    });
  });

  describe("feature engagement", () => {
    it("should track first usage of a feature", () => {
      const before = Date.now();
      useAnalyticsStore.getState().trackFeatureUsage("kanban_view");
      const engagement = useAnalyticsStore.getState().getFeatureEngagement("kanban_view");
      expect(engagement.usageCount).toBe(1);
      expect(engagement.firstUsedAt).toBeTypeOf("number");
      expect(engagement.firstUsedAt!).toBeGreaterThanOrEqual(before);
      expect(engagement.lastUsedAt).toBeTypeOf("number");
    });

    it("should increment usage count on subsequent uses", () => {
      useAnalyticsStore.getState().trackFeatureUsage("calendar");
      useAnalyticsStore.getState().trackFeatureUsage("calendar");
      useAnalyticsStore.getState().trackFeatureUsage("calendar");
      const engagement = useAnalyticsStore.getState().getFeatureEngagement("calendar");
      expect(engagement.usageCount).toBe(3);
    });

    it("should not overwrite firstUsedAt on subsequent uses", () => {
      useAnalyticsStore.getState().trackFeatureUsage("grants");
      const first = useAnalyticsStore.getState().getFeatureEngagement("grants").firstUsedAt;

      // Small delay to ensure timestamps differ
      useAnalyticsStore.getState().trackFeatureUsage("grants");
      const second = useAnalyticsStore.getState().getFeatureEngagement("grants").firstUsedAt;
      expect(second).toBe(first);
    });

    it("should update lastUsedAt on each use", () => {
      useAnalyticsStore.getState().trackFeatureUsage("search");
      const first = useAnalyticsStore.getState().getFeatureEngagement("search").lastUsedAt;

      useAnalyticsStore.getState().trackFeatureUsage("search");
      const second = useAnalyticsStore.getState().getFeatureEngagement("search").lastUsedAt;
      expect(second).toBeGreaterThanOrEqual(first!);
    });

    it("should return null values for unknown feature", () => {
      const engagement = useAnalyticsStore.getState().getFeatureEngagement("nonexistent");
      expect(engagement.firstUsedAt).toBeNull();
      expect(engagement.usageCount).toBe(0);
      expect(engagement.lastUsedAt).toBeNull();
    });

    it("should track multiple features independently", () => {
      useAnalyticsStore.getState().trackFeatureUsage("feature_a");
      useAnalyticsStore.getState().trackFeatureUsage("feature_b");
      useAnalyticsStore.getState().trackFeatureUsage("feature_a");

      expect(useAnalyticsStore.getState().getFeatureEngagement("feature_a").usageCount).toBe(2);
      expect(useAnalyticsStore.getState().getFeatureEngagement("feature_b").usageCount).toBe(1);
    });
  });
});

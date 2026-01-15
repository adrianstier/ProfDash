/**
 * Analytics Store
 *
 * Zustand store for analytics-related UI state and session tracking.
 *
 * This store manages:
 * - Search session state (for timing and interaction counting)
 * - Onboarding session state (for funnel tracking)
 * - Feature engagement tracking
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OnboardingStep, SearchResultType } from "@scholaros/shared/types";

// ============================================================================
// Search Session State
// ============================================================================

interface SearchSession {
  isOpen: boolean;
  openedAt: number | null;
  trigger: "keyboard_shortcut" | "click" | "programmatic" | null;
  queriesEntered: number;
  resultsSelected: number;
  lastQuery: string;
  lastQueryAt: number | null;
}

// ============================================================================
// Onboarding Session State
// ============================================================================

interface OnboardingSession {
  isActive: boolean;
  startedAt: number | null;
  currentStep: OnboardingStep;
  stepStartedAt: number | null;
  interactionCount: number;
  completedSteps: OnboardingStep[];
}

// ============================================================================
// Feature Engagement State
// ============================================================================

interface FeatureEngagement {
  firstUsedAt: Record<string, number>;
  usageCount: Record<string, number>;
  lastUsedAt: Record<string, number>;
}

// ============================================================================
// Store Interface
// ============================================================================

interface AnalyticsState {
  // Search session
  searchSession: SearchSession;

  // Onboarding session
  onboardingSession: OnboardingSession;

  // Feature engagement (persisted)
  featureEngagement: FeatureEngagement;

  // Search session actions
  openSearchSession: (trigger: "keyboard_shortcut" | "click" | "programmatic") => void;
  closeSearchSession: () => SearchSession;
  recordSearchQuery: (query: string) => void;
  recordSearchSelection: (resultType: SearchResultType) => void;

  // Onboarding session actions
  startOnboardingSession: (initialStep?: OnboardingStep) => void;
  advanceOnboardingStep: (step: OnboardingStep) => void;
  recordOnboardingInteraction: () => void;
  completeOnboardingSession: () => OnboardingSession;
  skipOnboardingSession: () => OnboardingSession;

  // Feature engagement actions
  trackFeatureUsage: (featureName: string) => void;
  getFeatureEngagement: (featureName: string) => {
    firstUsedAt: number | null;
    usageCount: number;
    lastUsedAt: number | null;
  };

  // Reset
  resetSearchSession: () => void;
  resetOnboardingSession: () => void;
}

// ============================================================================
// Initial States
// ============================================================================

const initialSearchSession: SearchSession = {
  isOpen: false,
  openedAt: null,
  trigger: null,
  queriesEntered: 0,
  resultsSelected: 0,
  lastQuery: "",
  lastQueryAt: null,
};

const initialOnboardingSession: OnboardingSession = {
  isActive: false,
  startedAt: null,
  currentStep: 0,
  stepStartedAt: null,
  interactionCount: 0,
  completedSteps: [],
};

const initialFeatureEngagement: FeatureEngagement = {
  firstUsedAt: {},
  usageCount: {},
  lastUsedAt: {},
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Initial state
      searchSession: initialSearchSession,
      onboardingSession: initialOnboardingSession,
      featureEngagement: initialFeatureEngagement,

      // Search session actions
      openSearchSession: (trigger) => {
        set({
          searchSession: {
            ...initialSearchSession,
            isOpen: true,
            openedAt: Date.now(),
            trigger,
          },
        });
      },

      closeSearchSession: () => {
        const session = get().searchSession;
        set({ searchSession: initialSearchSession });
        return session;
      },

      recordSearchQuery: (query) => {
        set((state) => ({
          searchSession: {
            ...state.searchSession,
            queriesEntered: state.searchSession.queriesEntered + 1,
            lastQuery: query,
            lastQueryAt: Date.now(),
          },
        }));
      },

      recordSearchSelection: () => {
        set((state) => ({
          searchSession: {
            ...state.searchSession,
            resultsSelected: state.searchSession.resultsSelected + 1,
          },
        }));
      },

      // Onboarding session actions
      startOnboardingSession: (initialStep = 1) => {
        set({
          onboardingSession: {
            isActive: true,
            startedAt: Date.now(),
            currentStep: initialStep,
            stepStartedAt: Date.now(),
            interactionCount: 0,
            completedSteps: [],
          },
        });
      },

      advanceOnboardingStep: (step) => {
        set((state) => ({
          onboardingSession: {
            ...state.onboardingSession,
            currentStep: step,
            stepStartedAt: Date.now(),
            interactionCount: 0,
            completedSteps: [
              ...state.onboardingSession.completedSteps,
              state.onboardingSession.currentStep,
            ],
          },
        }));
      },

      recordOnboardingInteraction: () => {
        set((state) => ({
          onboardingSession: {
            ...state.onboardingSession,
            interactionCount: state.onboardingSession.interactionCount + 1,
          },
        }));
      },

      completeOnboardingSession: () => {
        const session = get().onboardingSession;
        set({ onboardingSession: initialOnboardingSession });
        return session;
      },

      skipOnboardingSession: () => {
        const session = get().onboardingSession;
        set({ onboardingSession: initialOnboardingSession });
        return session;
      },

      // Feature engagement actions
      trackFeatureUsage: (featureName) => {
        const now = Date.now();
        set((state) => ({
          featureEngagement: {
            firstUsedAt: {
              ...state.featureEngagement.firstUsedAt,
              [featureName]:
                state.featureEngagement.firstUsedAt[featureName] ?? now,
            },
            usageCount: {
              ...state.featureEngagement.usageCount,
              [featureName]:
                (state.featureEngagement.usageCount[featureName] ?? 0) + 1,
            },
            lastUsedAt: {
              ...state.featureEngagement.lastUsedAt,
              [featureName]: now,
            },
          },
        }));
      },

      getFeatureEngagement: (featureName) => {
        const state = get();
        return {
          firstUsedAt: state.featureEngagement.firstUsedAt[featureName] ?? null,
          usageCount: state.featureEngagement.usageCount[featureName] ?? 0,
          lastUsedAt: state.featureEngagement.lastUsedAt[featureName] ?? null,
        };
      },

      // Reset actions
      resetSearchSession: () => {
        set({ searchSession: initialSearchSession });
      },

      resetOnboardingSession: () => {
        set({ onboardingSession: initialOnboardingSession });
      },
    }),
    {
      name: "scholaros-analytics",
      storage: createJSONStorage(() => localStorage),
      // Only persist feature engagement, not session state
      partialize: (state) => ({
        featureEngagement: state.featureEngagement,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSearchSession = (state: AnalyticsState) => state.searchSession;
export const selectOnboardingSession = (state: AnalyticsState) => state.onboardingSession;
export const selectFeatureEngagement = (state: AnalyticsState) => state.featureEngagement;

// ============================================================================
// Hooks for Common Patterns
// ============================================================================

/**
 * Hook to track search session duration
 */
export function useSearchSessionDuration() {
  const openedAt = useAnalyticsStore((s) => s.searchSession.openedAt);

  if (!openedAt) return 0;
  return Date.now() - openedAt;
}

/**
 * Hook to track onboarding step duration
 */
export function useOnboardingStepDuration() {
  const stepStartedAt = useAnalyticsStore((s) => s.onboardingSession.stepStartedAt);

  if (!stepStartedAt) return 0;
  return Date.now() - stepStartedAt;
}

/**
 * Hook to check if a feature has been used before
 */
export function useIsFeatureNew(featureName: string) {
  const firstUsedAt = useAnalyticsStore(
    (s) => s.featureEngagement.firstUsedAt[featureName]
  );
  return firstUsedAt === undefined;
}

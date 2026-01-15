/**
 * Onboarding Hook
 *
 * React Query hook for managing onboarding progress.
 * Integrates with /api/onboarding and analytics tracking.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAnalyticsStore } from "../stores/analytics-store";
import { useAnalyticsEvents } from "./use-analytics-events";
import type { OnboardingProgress, OnboardingStep } from "@scholaros/shared/types";
import { ONBOARDING_STEP_NAMES } from "@scholaros/shared/types";

// ============================================================================
// Query Keys
// ============================================================================

export const onboardingKeys = {
  all: ["onboarding"] as const,
  progress: () => [...onboardingKeys.all, "progress"] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchOnboardingProgress(): Promise<OnboardingProgress> {
  const response = await fetch("/api/onboarding");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch onboarding progress");
  }
  return response.json();
}

async function updateOnboardingProgress(
  updates: Partial<{ step: OnboardingStep; completed: boolean; skipped: boolean }>
): Promise<OnboardingProgress> {
  const response = await fetch("/api/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update onboarding progress");
  }
  return response.json();
}

// ============================================================================
// Hook
// ============================================================================

export interface UseOnboardingReturn {
  // Progress data
  progress: OnboardingProgress | undefined;
  isLoading: boolean;
  isError: boolean;

  // Step information
  currentStep: OnboardingStep;
  stepName: string;
  isCompleted: boolean;
  isSkipped: boolean;
  hasStarted: boolean;

  // Actions
  startOnboarding: () => Promise<void>;
  nextStep: () => Promise<void>;
  goToStep: (step: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;

  // Mutation states
  isUpdating: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  const queryClient = useQueryClient();

  // Analytics
  const analyticsStore = useAnalyticsStore();
  const analytics = useAnalyticsEvents();

  // Query
  const {
    data: progress,
    isLoading,
    isError,
  } = useQuery({
    queryKey: onboardingKeys.progress(),
    queryFn: fetchOnboardingProgress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: updateOnboardingProgress,
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.progress(), data);
    },
  });

  // Derived state
  const currentStep = progress?.step ?? 0;
  const stepName = ONBOARDING_STEP_NAMES[currentStep] || "unknown";
  const isCompleted = progress?.completed ?? false;
  const isSkipped = progress?.skipped ?? false;
  const hasStarted = currentStep > 0 || progress?.startedAt !== null;

  // Start onboarding (go to step 1)
  const startOnboarding = useCallback(async () => {
    // Track in analytics store
    analyticsStore.startOnboardingSession(1);
    analytics.trackOnboardingStarted("signup");

    await mutation.mutateAsync({ step: 1 });
  }, [analyticsStore, analytics, mutation]);

  // Go to next step
  const nextStep = useCallback(async () => {
    const nextStepNum = Math.min(currentStep + 1, 5) as OnboardingStep;

    // Track step completion
    const stepDuration = analyticsStore.onboardingSession.stepStartedAt
      ? Date.now() - analyticsStore.onboardingSession.stepStartedAt
      : 0;
    analytics.trackOnboardingStepCompleted(
      currentStep,
      stepName,
      stepDuration,
      analyticsStore.onboardingSession.interactionCount
    );

    // Advance in analytics store
    analyticsStore.advanceOnboardingStep(nextStepNum);

    // Track viewing next step
    const nextStepName = ONBOARDING_STEP_NAMES[nextStepNum];
    analytics.trackOnboardingStepViewed(nextStepNum, nextStepName);

    await mutation.mutateAsync({ step: nextStepNum });
  }, [currentStep, stepName, analyticsStore, analytics, mutation]);

  // Go to specific step
  const goToStep = useCallback(
    async (step: OnboardingStep) => {
      // Track step view
      const newStepName = ONBOARDING_STEP_NAMES[step];
      analytics.trackOnboardingStepViewed(step, newStepName);

      // Update analytics store
      analyticsStore.advanceOnboardingStep(step);

      await mutation.mutateAsync({ step });
    },
    [analyticsStore, analytics, mutation]
  );

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    // Calculate total duration
    const session = analyticsStore.completeOnboardingSession();
    const totalDuration = session.startedAt ? Date.now() - session.startedAt : 0;

    // Track completion
    analytics.trackOnboardingCompleted(
      totalDuration,
      session.completedSteps.length,
      true // Assume first task was created if they completed
    );

    await mutation.mutateAsync({ completed: true });
  }, [analyticsStore, analytics, mutation]);

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    // Track skip
    analytics.trackOnboardingSkipped(currentStep);

    // Clear session
    analyticsStore.skipOnboardingSession();

    await mutation.mutateAsync({ skipped: true });
  }, [currentStep, analyticsStore, analytics, mutation]);

  return {
    progress,
    isLoading,
    isError,
    currentStep,
    stepName,
    isCompleted,
    isSkipped,
    hasStarted,
    startOnboarding,
    nextStep,
    goToStep,
    completeOnboarding,
    skipOnboarding,
    isUpdating: mutation.isPending,
  };
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to check if onboarding should be shown
 */
export function useShouldShowOnboarding(): boolean {
  const { progress, isLoading } = useOnboarding();

  if (isLoading) return false;
  if (!progress) return true; // Show onboarding for new users

  // Don't show if completed or skipped
  if (progress.completed || progress.skipped) return false;

  // Show if user is in the middle of onboarding (step > 0 and < 5)
  if (progress.step > 0 && progress.step < 5) return true;

  // Show for new users who haven't started
  if (progress.step === 0) return true;

  return false;
}

/**
 * Hook to track onboarding interactions
 */
export function useOnboardingInteraction() {
  const { recordOnboardingInteraction } = useAnalyticsStore();
  return recordOnboardingInteraction;
}

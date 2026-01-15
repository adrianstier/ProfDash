"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/lib/hooks/use-onboarding";
import { useAnalyticsStore } from "@/lib/stores/analytics-store";
import { useAnalyticsEvents } from "@/lib/hooks/use-analytics-events";
import { OnboardingProgress, ProgressDots } from "./onboarding-progress";
import {
  StepWelcome,
  StepProfile,
  StepWorkspace,
  StepFirstTask,
  StepCalendar,
  StepCompletion,
} from "./steps";
import type { OnboardingStep } from "@scholaros/shared/types";
import { ONBOARDING_STEP_NAMES } from "@scholaros/shared/types";

// ============================================================================
// Types
// ============================================================================

interface OnboardingWizardProps {
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// Onboarding Wizard Component
// ============================================================================

export function OnboardingWizard({ onClose, className }: OnboardingWizardProps) {
  const router = useRouter();
  const {
    progress,
    currentStep,
    isLoading,
    isUpdating,
    nextStep,
    goToStep,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  const { trackOnboardingStepViewed } = useAnalyticsEvents();

  // Track step views
  useEffect(() => {
    if (currentStep > 0) {
      const stepName = ONBOARDING_STEP_NAMES[currentStep];
      trackOnboardingStepViewed(currentStep, stepName);
    }
  }, [currentStep, trackOnboardingStepViewed]);

  // Handle skip
  const handleSkip = async () => {
    await skipOnboarding();
    onClose?.();
    router.push("/today");
  };

  // Handle completion
  const handleComplete = async () => {
    await completeOnboarding();
    onClose?.();
    router.push("/today");
  };

  // Handle going to next step
  const handleNext = async () => {
    if (currentStep >= 5) {
      await handleComplete();
    } else {
      await nextStep();
    }
  };

  // Handle going back
  const handleBack = async () => {
    if (currentStep > 1) {
      await goToStep((currentStep - 1) as OnboardingStep);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center min-h-screen", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Already completed
  if (progress?.completed || progress?.skipped) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background",
        className
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">ScholarOS</span>
          {currentStep > 0 && currentStep < 5 && (
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 5
            </span>
          )}
        </div>
        <button
          onClick={handleSkip}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Skip onboarding"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Progress (visible for steps 1-4) */}
      {currentStep > 0 && currentStep < 5 && (
        <div className="border-b px-6 py-4">
          {/* Desktop progress */}
          <div className="hidden md:block">
            <OnboardingProgress currentStep={currentStep} />
          </div>
          {/* Mobile progress */}
          <div className="md:hidden">
            <OnboardingProgress currentStep={currentStep} variant="compact" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-6 py-12">
          <StepRenderer
            step={currentStep}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            onComplete={handleComplete}
            isUpdating={isUpdating}
          />
        </div>
      </main>

      {/* Footer with progress dots (mobile) */}
      {currentStep > 0 && currentStep < 5 && (
        <footer className="border-t px-6 py-4 md:hidden">
          <ProgressDots currentStep={currentStep} />
        </footer>
      )}
    </div>
  );
}

// ============================================================================
// Step Renderer
// ============================================================================

interface StepRendererProps {
  step: OnboardingStep;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isUpdating: boolean;
}

function StepRenderer({
  step,
  onNext,
  onBack,
  onSkip,
  onComplete,
}: StepRendererProps) {
  switch (step) {
    case 0:
    case 1:
      return <StepWelcome onNext={onNext} onSkip={onSkip} />;
    case 2:
      return <StepProfile onNext={onNext} onBack={onBack} />;
    case 3:
      return <StepWorkspace onNext={onNext} onBack={onBack} />;
    case 4:
      return <StepFirstTask onNext={onNext} onBack={onBack} />;
    case 5:
      return <StepCompletion onComplete={onComplete} />;
    default:
      return <StepWelcome onNext={onNext} onSkip={onSkip} />;
  }
}

// ============================================================================
// Onboarding Modal Wrapper
// ============================================================================

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative flex h-full items-center justify-center p-4">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-background shadow-2xl">
          <OnboardingWizard onClose={onClose} className="relative h-[85vh]" />
        </div>
      </div>
    </div>
  );
}

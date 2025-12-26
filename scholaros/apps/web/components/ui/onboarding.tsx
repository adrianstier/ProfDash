"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  FileText,
  Calendar,
  Kanban,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to ScholarOS",
    description:
      "Your AI-native academic operations dashboard. Let's take a quick tour of the key features.",
    icon: Sparkles,
  },
  {
    id: "tasks",
    title: "Quick Task Entry",
    description:
      "Press 'Q' anywhere to quickly add tasks. Use natural language like 'p1 Review NSF proposal #grants friday' to set priority, category, and due date.",
    icon: CheckSquare,
  },
  {
    id: "projects",
    title: "Track Your Research",
    description:
      "Organize manuscripts, grants, and research projects. Link tasks to projects and track progress through stages.",
    icon: FileText,
  },
  {
    id: "calendar",
    title: "Unified Calendar",
    description:
      "See all your tasks and Google Calendar events in one view. Connect your calendar in Settings.",
    icon: Calendar,
  },
  {
    id: "board",
    title: "Kanban Board",
    description:
      "Drag tasks between columns to update their status. Perfect for visualizing your workflow.",
    icon: Kanban,
  },
];

const STORAGE_KEY = "scholaros_onboarding_completed";

interface OnboardingProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function Onboarding({ forceShow = false, onComplete }: OnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }

    // Check if onboarding has been completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay before showing to let the page load
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {ONBOARDING_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentStep
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted hover:bg-muted-foreground/30"
              )}
              aria-label={`Go to step ${index + 1}`}
              aria-current={index === currentStep ? "step" : undefined}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h2
            id="onboarding-title"
            className="text-xl font-semibold mb-2"
          >
            {step.title}
          </h2>
          <p className="text-muted-foreground">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="text-sm text-muted-foreground">
            {currentStep + 1} of {ONBOARDING_STEPS.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isLastStep ? "Get Started" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to reset onboarding (for settings page)
export function useOnboarding() {
  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasCompletedOnboarding = () => {
    return !!localStorage.getItem(STORAGE_KEY);
  };

  return { resetOnboarding, hasCompletedOnboarding };
}

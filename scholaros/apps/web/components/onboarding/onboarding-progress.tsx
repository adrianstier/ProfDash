"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@scholaros/shared/types";

// ============================================================================
// Types
// ============================================================================

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  className?: string;
  variant?: "default" | "compact";
}

// ============================================================================
// Step Configuration
// ============================================================================

const STEPS = [
  { step: 1 as OnboardingStep, label: "Welcome", shortLabel: "1" },
  { step: 2 as OnboardingStep, label: "Profile", shortLabel: "2" },
  { step: 3 as OnboardingStep, label: "Workspace", shortLabel: "3" },
  { step: 4 as OnboardingStep, label: "First Task", shortLabel: "4" },
  { step: 5 as OnboardingStep, label: "Complete", shortLabel: "5" },
];

// ============================================================================
// Progress Indicator Component
// ============================================================================

export function OnboardingProgress({
  currentStep,
  className,
  variant = "default",
}: OnboardingProgressProps) {
  if (variant === "compact") {
    return (
      <CompactProgress currentStep={currentStep} className={className} />
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.step;
        const isCurrent = currentStep === step.step;
        const isLast = index === STEPS.length - 1;

        return (
          <div key={step.step} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.shortLabel}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors",
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-12 transition-colors duration-300",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Compact Progress (for mobile or small spaces)
// ============================================================================

function CompactProgress({
  currentStep,
  className,
}: {
  currentStep: OnboardingStep;
  className?: string;
}) {
  const totalSteps = STEPS.length;
  const completedSteps = Math.max(0, currentStep - 1);
  const progressPercent = (completedSteps / (totalSteps - 1)) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-muted-foreground">
          {STEPS.find((s) => s.step === currentStep)?.label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Progress Dots (minimal variant)
// ============================================================================

interface ProgressDotsProps {
  currentStep: OnboardingStep;
  totalSteps?: number;
  className?: string;
}

export function ProgressDots({
  currentStep,
  totalSteps = 5,
  className,
}: ProgressDotsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
        const isCompleted = currentStep > step;
        const isCurrent = currentStep === step;

        return (
          <div
            key={step}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              isCurrent
                ? "w-6 bg-primary"
                : isCompleted
                ? "w-2 bg-primary"
                : "w-2 bg-muted-foreground/30"
            )}
          />
        );
      })}
    </div>
  );
}

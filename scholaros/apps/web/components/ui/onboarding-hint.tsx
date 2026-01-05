"use client";

import { useState, useEffect } from "react";
import { X, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingHintProps {
  id: string; // Unique ID for localStorage persistence
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  showOnce?: boolean;
  delay?: number; // Delay in ms before showing
  className?: string;
  children?: React.ReactNode;
}

export function OnboardingHint({
  id,
  title,
  description,
  position = "bottom",
  showOnce = true,
  delay = 500,
  className,
  children,
}: OnboardingHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if hint was already dismissed
    const dismissed = localStorage.getItem(`hint-dismissed-${id}`);
    if (dismissed && showOnce) {
      setIsDismissed(true);
      return;
    }

    // Show hint after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [id, showOnce, delay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    if (showOnce) {
      localStorage.setItem(`hint-dismissed-${id}`, "true");
    }
  };

  if (isDismissed) return <>{children}</>;

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div className={cn("relative inline-block", className)}>
      {children}

      {isVisible && (
        <div
          className={cn(
            "absolute z-50 w-64 animate-fade-in",
            positionClasses[position]
          )}
        >
          {/* Pulsing indicator */}
          <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-primary animate-hint" />

          {/* Hint card */}
          <div className="relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-amber-500/5 p-4 shadow-lg backdrop-blur-sm">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss hint"
            >
              <X className="h-3 w-3" />
            </button>

            {/* Content */}
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div className="pr-4">
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {/* Got it button */}
            <button
              onClick={handleDismiss}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              Got it
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Feature discovery tooltip that appears on first interaction
interface FeatureDiscoveryProps {
  id: string;
  content: string;
  children: React.ReactNode;
}

export function FeatureDiscovery({ id, content, children }: FeatureDiscoveryProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const interacted = localStorage.getItem(`feature-discovered-${id}`);
    if (interacted) {
      setHasInteracted(true);
    }
  }, [id]);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
        setHasInteracted(true);
        localStorage.setItem(`feature-discovered-${id}`, "true");
      }, 3000);
    }
  };

  return (
    <div className="relative" onMouseEnter={handleInteraction}>
      {children}

      {showTooltip && !hasInteracted && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in">
          <div className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg whitespace-nowrap">
            <Sparkles className="h-3 w-3" />
            {content}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary" />
        </div>
      )}
    </div>
  );
}

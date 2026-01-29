"use client";

/**
 * Onboarding Wizard Wrapper
 *
 * This component wraps the WelcomeWizard and handles the logic for
 * showing/hiding the onboarding wizard based on user status.
 *
 * It checks if the user has completed onboarding and shows the wizard
 * if they haven't.
 */

import { useState, useEffect, useCallback } from "react";
import { useShouldShowOnboarding } from "@/lib/hooks/use-onboarding";
import { WelcomeWizard } from "./welcome-wizard";

export function OnboardingWizardWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const shouldShowOnboarding = useShouldShowOnboarding();

  // Track client-side mount to avoid hydration issues
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Show wizard when shouldShowOnboarding becomes true
  useEffect(() => {
    if (hasMounted && shouldShowOnboarding) {
      // Small delay to ensure smooth page load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hasMounted, shouldShowOnboarding]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Don't render anything on server or before mount
  if (!hasMounted) {
    return null;
  }

  // Don't render if wizard shouldn't be shown
  if (!isOpen && !shouldShowOnboarding) {
    return null;
  }

  // Only render when the wizard should be shown
  if (!isOpen) {
    return null;
  }

  return <WelcomeWizard onClose={handleClose} />;
}

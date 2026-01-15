"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalyticsEvents } from "@/lib/hooks/use-analytics-events";

/**
 * Analytics Provider
 *
 * Provides automatic page view tracking and sets up analytics infrastructure.
 * Should be placed near the root of your component tree.
 */
interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const { track, flush } = useAnalyticsEvents();
  const prevPathRef = useRef<string | null>(null);

  // Track page views
  useEffect(() => {
    // Don't track the same page twice
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    // Track page view
    track("feature_viewed", {
      page: pathname,
      title: document.title,
      referrer: document.referrer || null,
    });
  }, [pathname, track]);

  // Flush analytics on unmount or page visibility change
  useEffect(() => {
    const handleBeforeUnload = () => {
      flush();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [flush]);

  return <>{children}</>;
}

/**
 * Hook for tracking feature interactions
 * Use this in components to track when users interact with specific features
 */
export function useFeatureTracking(featureName: string) {
  const { track } = useAnalyticsEvents();
  const hasTrackedView = useRef(false);

  // Track feature view (only once per mount)
  useEffect(() => {
    if (!hasTrackedView.current) {
      track("feature_viewed", {
        feature: featureName,
      });
      hasTrackedView.current = true;
    }
  }, [featureName, track]);

  // Return a function to track interactions
  const trackInteraction = (action: string, metadata?: Record<string, unknown>) => {
    track("feature_interacted", {
      feature: featureName,
      action,
      ...metadata,
    });
  };

  return { trackInteraction };
}

/**
 * Hook for tracking task-related events
 */
export function useTaskTracking() {
  const { track } = useAnalyticsEvents();

  return {
    trackTaskCreated: (taskData: {
      category: string;
      priority: string;
      hasProject: boolean;
      hasDueDate: boolean;
    }) => {
      track("action_completed", {
        action: "task_created",
        ...taskData,
      });
    },

    trackTaskCompleted: (taskData: {
      category: string;
      priority: string;
      daysOverdue?: number;
    }) => {
      track("action_completed", {
        action: "task_completed",
        ...taskData,
      });
    },

    trackTaskDeleted: (taskData: { category: string; status: string }) => {
      track("action_completed", {
        action: "task_deleted",
        ...taskData,
      });
    },
  };
}

/**
 * Hook for tracking project-related events
 */
export function useProjectTracking() {
  const { track } = useAnalyticsEvents();

  return {
    trackProjectCreated: (projectData: { type: string; hasDeadline: boolean }) => {
      track("action_completed", {
        action: "project_created",
        ...projectData,
      });
    },

    trackProjectStageChanged: (projectData: {
      type: string;
      fromStage: string;
      toStage: string;
    }) => {
      track("action_completed", {
        action: "project_stage_changed",
        ...projectData,
      });
    },
  };
}

/**
 * Hook for tracking grant-related events
 */
export function useGrantTracking() {
  const { track } = useAnalyticsEvents();

  return {
    trackGrantSearched: (searchData: { query: string; filtersApplied: string[] }) => {
      track("action_completed", {
        action: "grant_searched",
        ...searchData,
      });
    },

    trackGrantWatchlisted: (grantData: { agency: string; amount?: number }) => {
      track("action_completed", {
        action: "grant_watchlisted",
        ...grantData,
      });
    },
  };
}

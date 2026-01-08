"use client";

/**
 * Feature Spotlight - Contextual Feature Discovery
 *
 * Research Mapping:
 * - Issue #3: Onboarding Flow Not Integrated
 * - Issue #18: Missing Tooltips Throughout UI
 * - Persona: Dr. Lisa Anderson (Late Adopter) - needs extensive onboarding
 * - Persona: Dr. Sarah Chen (New PI) - will look for 'help' or 'tutorial' features
 *
 * This component creates contextual tooltips that appear based on user behavior
 * to help users discover features at the right moment.
 */

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Lightbulb,
  ArrowRight,
  Mic,
  FileText,
  Wand2,
  ListTree,
  Mail,
  FileImage,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Feature definitions with research-backed descriptions
export interface SpotlightFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  trigger: "first-visit" | "empty-state" | "user-action" | "time-delay" | "context";
  targetSelector?: string;
  relatedPersonas: string[];
  relatedIssues: number[];
  action?: {
    label: string;
    onClick: () => void;
  };
}

// AI Features to spotlight based on implemented features
const AI_FEATURES: SpotlightFeature[] = [
  {
    id: "voice-input",
    title: "Voice Input",
    description: "Speak your tasks instead of typing. Perfect for quick capture or when you're on the go.",
    icon: <Mic className="h-4 w-4" />,
    trigger: "context",
    relatedPersonas: ["Dr. Kevin Nguyen (Mobile-First)"],
    relatedIssues: [29],
  },
  {
    id: "content-importer",
    title: "Smart Content Import",
    description: "Paste meeting notes, emails, or documents. AI extracts tasks automatically - no manual entry needed.",
    icon: <FileText className="h-4 w-4" />,
    trigger: "user-action",
    relatedPersonas: ["Dr. Sarah Chen (New PI)", "Prof. Marcus Thompson (Power User)"],
    relatedIssues: [14],
  },
  {
    id: "task-enhance",
    title: "AI Task Enhancement",
    description: "Let AI improve your task description with better clarity, actionable steps, and context.",
    icon: <Wand2 className="h-4 w-4" />,
    trigger: "context",
    relatedPersonas: ["Dr. Sarah Chen (New PI)"],
    relatedIssues: [],
  },
  {
    id: "task-breakdown",
    title: "AI Task Breakdown",
    description: "Break complex tasks into manageable subtasks with time estimates and dependencies.",
    icon: <ListTree className="h-4 w-4" />,
    trigger: "context",
    relatedPersonas: ["Prof. Marcus Thompson (Power User)"],
    relatedIssues: [],
  },
  {
    id: "email-generator",
    title: "Email Generator",
    description: "Generate professional emails for task-related communication - follow-ups, reminders, and updates.",
    icon: <Mail className="h-4 w-4" />,
    trigger: "context",
    relatedPersonas: ["Dr. Sarah Chen (New PI)", "Maria Santos (Grad Student)"],
    relatedIssues: [],
  },
  {
    id: "file-parser",
    title: "Document Scanner",
    description: "Upload PDFs or images containing tasks. AI extracts action items using vision technology.",
    icon: <FileImage className="h-4 w-4" />,
    trigger: "context",
    relatedPersonas: ["Dr. James Okonkwo (Publication Tracker)"],
    relatedIssues: [],
  },
];

// Local storage key for tracking which features have been seen
const SEEN_FEATURES_KEY = "scholaros_seen_features";

// Context for managing feature discovery state
interface FeatureDiscoveryContextType {
  seenFeatures: Set<string>;
  markAsSeen: (featureId: string) => void;
  showSpotlight: (featureId: string) => void;
  hideSpotlight: () => void;
  currentSpotlight: SpotlightFeature | null;
  resetAllSpotlights: () => void;
}

const FeatureDiscoveryContext = createContext<FeatureDiscoveryContextType | null>(null);

export function useFeatureDiscovery() {
  const context = useContext(FeatureDiscoveryContext);
  if (!context) {
    throw new Error("useFeatureDiscovery must be used within FeatureDiscoveryProvider");
  }
  return context;
}

interface FeatureDiscoveryProviderProps {
  children: React.ReactNode;
}

export function FeatureDiscoveryProvider({ children }: FeatureDiscoveryProviderProps) {
  const [seenFeatures, setSeenFeatures] = useState<Set<string>>(new Set());
  const [currentSpotlight, setCurrentSpotlight] = useState<SpotlightFeature | null>(null);

  // Load seen features from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SEEN_FEATURES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSeenFeatures(new Set(parsed));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const markAsSeen = useCallback((featureId: string) => {
    setSeenFeatures((prev) => {
      const next = new Set(prev);
      next.add(featureId);
      localStorage.setItem(SEEN_FEATURES_KEY, JSON.stringify([...next]));
      return next;
    });
    setCurrentSpotlight(null);
  }, []);

  const showSpotlight = useCallback((featureId: string) => {
    const feature = AI_FEATURES.find((f) => f.id === featureId);
    if (feature && !seenFeatures.has(featureId)) {
      setCurrentSpotlight(feature);
    }
  }, [seenFeatures]);

  const hideSpotlight = useCallback(() => {
    setCurrentSpotlight(null);
  }, []);

  const resetAllSpotlights = useCallback(() => {
    localStorage.removeItem(SEEN_FEATURES_KEY);
    setSeenFeatures(new Set());
  }, []);

  return (
    <FeatureDiscoveryContext.Provider
      value={{
        seenFeatures,
        markAsSeen,
        showSpotlight,
        hideSpotlight,
        currentSpotlight,
        resetAllSpotlights,
      }}
    >
      {children}
    </FeatureDiscoveryContext.Provider>
  );
}

// The spotlight overlay component
interface FeatureSpotlightOverlayProps {
  feature: SpotlightFeature;
  onDismiss: () => void;
  onAction?: () => void;
}

function FeatureSpotlightOverlay({
  feature,
  onDismiss,
  onAction,
}: FeatureSpotlightOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Spotlight card */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* New feature badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            <Sparkles className="h-3 w-3" />
            New AI Feature
          </div>
        </div>

        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4">
          <div className="text-purple-600 dark:text-purple-400">
            {feature.icon}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {feature.description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {feature.action && (
            <button
              onClick={() => {
                feature.action?.onClick();
                onAction?.();
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try it now
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onDismiss}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors",
              !feature.action && "flex-1"
            )}
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Main spotlight component that shows current spotlight
export function FeatureSpotlight() {
  const { currentSpotlight, markAsSeen } = useFeatureDiscovery();

  return (
    <AnimatePresence>
      {currentSpotlight && (
        <FeatureSpotlightOverlay
          feature={currentSpotlight}
          onDismiss={() => markAsSeen(currentSpotlight.id)}
          onAction={() => markAsSeen(currentSpotlight.id)}
        />
      )}
    </AnimatePresence>
  );
}

// Inline spotlight trigger for specific UI elements
interface SpotlightTriggerProps {
  featureId: string;
  children: React.ReactNode;
  className?: string;
}

export function SpotlightTrigger({ featureId, children, className }: SpotlightTriggerProps) {
  const { seenFeatures, showSpotlight } = useFeatureDiscovery();
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    // Show pulse indicator for unseen features
    if (!seenFeatures.has(featureId)) {
      const timer = setTimeout(() => setShowPulse(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [featureId, seenFeatures]);

  const handleClick = () => {
    if (!seenFeatures.has(featureId)) {
      showSpotlight(featureId);
    }
  };

  return (
    <div className={cn("relative", className)} onClick={handleClick}>
      {children}
      {showPulse && !seenFeatures.has(featureId) && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
        </span>
      )}
    </div>
  );
}

// Tooltip-style feature hint that appears inline
interface FeatureHintProps {
  featureId: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function FeatureHint({ featureId, position = "bottom", children }: FeatureHintProps) {
  const { seenFeatures, markAsSeen } = useFeatureDiscovery();
  const [isVisible, setIsVisible] = useState(false);

  const feature = AI_FEATURES.find((f) => f.id === featureId);

  useEffect(() => {
    if (!seenFeatures.has(featureId) && feature) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [featureId, seenFeatures, feature]);

  if (!feature) return <>{children}</>;

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {isVisible && !seenFeatures.has(featureId) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "absolute z-50 w-64",
              positionClasses[position]
            )}
          >
            <div className="relative rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 p-4 shadow-lg backdrop-blur-sm">
              <button
                onClick={() => markAsSeen(featureId)}
                className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
              </button>

              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <Lightbulb className="h-4 w-4 text-purple-500" />
                </div>
                <div className="pr-4">
                  <h4 className="text-sm font-semibold">{feature.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => markAsSeen(featureId)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
              >
                Got it
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export features for use elsewhere
export { AI_FEATURES };

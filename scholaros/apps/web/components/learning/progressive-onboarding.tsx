"use client";

/**
 * Progressive Onboarding - Step-by-step Feature Introduction
 *
 * Research Mapping:
 * - Issue #3: Onboarding Flow Not Integrated
 *   "New users see a raw dashboard with empty states but no guided tour or setup wizard"
 * - Persona: Dr. Sarah Chen (New PI) - "Will look for 'help' or 'tutorial' features"
 * - Persona: Dr. Lisa Anderson (Late Adopter) - "Needs extensive onboarding", "Will abandon if frustrated"
 *
 * This component provides progressive onboarding that introduces AI features
 * at appropriate moments, not all at once.
 */

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Mic,
  Wand2,
  ArrowRight,
  X,
  Check,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Onboarding milestones
interface OnboardingMilestone {
  id: string;
  title: string;
  description: string;
  trigger: "first-task" | "fifth-task" | "first-project" | "manual" | "time-based";
  feature?: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
  };
  actionLabel?: string;
  onAction?: () => void;
}

const ONBOARDING_MILESTONES: OnboardingMilestone[] = [
  {
    id: "welcome",
    title: "Welcome to ScholarOS!",
    description: "Your AI-native academic productivity dashboard. Let's get you started with a quick tour of the powerful features at your fingertips.",
    trigger: "manual",
    actionLabel: "Start Tour",
  },
  {
    id: "first-task-created",
    title: "Great job creating your first task!",
    description: "You're on your way. Did you know you can use voice input to add tasks even faster?",
    trigger: "first-task",
    feature: {
      id: "voice-input",
      name: "Voice Input",
      description: "Click the microphone icon in the quick-add bar to speak your tasks",
      icon: <Mic className="h-5 w-5" />,
    },
    actionLabel: "Try Voice Input",
  },
  {
    id: "growing-task-list",
    title: "You're getting organized!",
    description: "With multiple tasks, you might want to try our AI task breakdown feature for complex items.",
    trigger: "fifth-task",
    feature: {
      id: "task-breakdown",
      name: "AI Task Breakdown",
      description: "Right-click any task to break it into subtasks with AI",
      icon: <Wand2 className="h-5 w-5" />,
    },
    actionLabel: "Learn More",
  },
  {
    id: "first-project-created",
    title: "Project tracking unlocked!",
    description: "Projects help you organize related tasks. Try importing tasks from meeting notes using AI.",
    trigger: "first-project",
    feature: {
      id: "content-importer",
      name: "Content Importer",
      description: "Paste meeting notes or emails to automatically extract tasks",
      icon: <FileText className="h-5 w-5" />,
    },
    actionLabel: "Import Content",
  },
];

// Local storage keys
const ONBOARDING_STATE_KEY = "scholaros_onboarding_state";

interface OnboardingState {
  hasStarted: boolean;
  currentStep: number;
  completedMilestones: string[];
  taskCount: number;
  projectCount: number;
}

interface OnboardingContextType {
  state: OnboardingState;
  startOnboarding: () => void;
  completeCurrentStep: () => void;
  skipOnboarding: () => void;
  incrementTaskCount: () => void;
  incrementProjectCount: () => void;
  showMilestone: (milestoneId: string) => void;
  currentMilestone: OnboardingMilestone | null;
  dismissMilestone: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>({
    hasStarted: false,
    currentStep: 0,
    completedMilestones: [],
    taskCount: 0,
    projectCount: 0,
  });
  const [currentMilestone, setCurrentMilestone] = useState<OnboardingMilestone | null>(null);

  // Load state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_STATE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
  }, [state]);

  // Check for milestone triggers
  useEffect(() => {
    // First task milestone
    if (state.taskCount === 1 && !state.completedMilestones.includes("first-task-created")) {
      const milestone = ONBOARDING_MILESTONES.find((m) => m.id === "first-task-created");
      if (milestone) {
        setTimeout(() => setCurrentMilestone(milestone), 1000);
      }
    }

    // Fifth task milestone
    if (state.taskCount === 5 && !state.completedMilestones.includes("growing-task-list")) {
      const milestone = ONBOARDING_MILESTONES.find((m) => m.id === "growing-task-list");
      if (milestone) {
        setTimeout(() => setCurrentMilestone(milestone), 1000);
      }
    }

    // First project milestone
    if (state.projectCount === 1 && !state.completedMilestones.includes("first-project-created")) {
      const milestone = ONBOARDING_MILESTONES.find((m) => m.id === "first-project-created");
      if (milestone) {
        setTimeout(() => setCurrentMilestone(milestone), 1000);
      }
    }
  }, [state.taskCount, state.projectCount, state.completedMilestones]);

  const startOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, hasStarted: true }));
    const welcomeMilestone = ONBOARDING_MILESTONES.find((m) => m.id === "welcome");
    if (welcomeMilestone) {
      setCurrentMilestone(welcomeMilestone);
    }
  }, []);

  const completeCurrentStep = useCallback(() => {
    if (currentMilestone) {
      setState((prev) => ({
        ...prev,
        completedMilestones: [...prev.completedMilestones, currentMilestone.id],
      }));
      setCurrentMilestone(null);
    }
  }, [currentMilestone]);

  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasStarted: true,
      completedMilestones: ONBOARDING_MILESTONES.map((m) => m.id),
    }));
    setCurrentMilestone(null);
  }, []);

  const incrementTaskCount = useCallback(() => {
    setState((prev) => ({ ...prev, taskCount: prev.taskCount + 1 }));
  }, []);

  const incrementProjectCount = useCallback(() => {
    setState((prev) => ({ ...prev, projectCount: prev.projectCount + 1 }));
  }, []);

  const showMilestone = useCallback((milestoneId: string) => {
    const milestone = ONBOARDING_MILESTONES.find((m) => m.id === milestoneId);
    if (milestone && !state.completedMilestones.includes(milestoneId)) {
      setCurrentMilestone(milestone);
    }
  }, [state.completedMilestones]);

  const dismissMilestone = useCallback(() => {
    if (currentMilestone) {
      setState((prev) => ({
        ...prev,
        completedMilestones: [...prev.completedMilestones, currentMilestone.id],
      }));
    }
    setCurrentMilestone(null);
  }, [currentMilestone]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STATE_KEY);
    setState({
      hasStarted: false,
      currentStep: 0,
      completedMilestones: [],
      taskCount: 0,
      projectCount: 0,
    });
    setCurrentMilestone(null);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        state,
        startOnboarding,
        completeCurrentStep,
        skipOnboarding,
        incrementTaskCount,
        incrementProjectCount,
        showMilestone,
        currentMilestone,
        dismissMilestone,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// Milestone celebration modal
export function MilestoneModal() {
  const { currentMilestone, completeCurrentStep, dismissMilestone } = useOnboarding();

  if (!currentMilestone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={dismissMilestone}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={dismissMilestone}
            className="absolute right-4 top-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Celebration icon */}
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20"
            >
              <Rocket className="h-8 w-8 text-purple-500" />
            </motion.div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-center mb-2">
            {currentMilestone.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground text-center mb-6">
            {currentMilestone.description}
          </p>

          {/* Feature highlight */}
          {currentMilestone.feature && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  {currentMilestone.feature.icon}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    {currentMilestone.feature.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {currentMilestone.feature.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={completeCurrentStep}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              {currentMilestone.actionLabel || "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={dismissMilestone}
              className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              Later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Progress indicator for onboarding
interface OnboardingProgressProps {
  className?: string;
}

export function OnboardingProgress({ className }: OnboardingProgressProps) {
  const { state } = useOnboarding();

  const totalMilestones = ONBOARDING_MILESTONES.length;
  const completedCount = state.completedMilestones.length;
  const progress = (completedCount / totalMilestones) * 100;

  if (completedCount === totalMilestones) return null;

  return (
    <div className={cn("p-4 rounded-xl bg-muted/50 border", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Getting Started</span>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalMilestones} completed
        </span>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ONBOARDING_MILESTONES.slice(0, 4).map((milestone) => {
          const isCompleted = state.completedMilestones.includes(milestone.id);
          return (
            <div
              key={milestone.id}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                isCompleted ? "text-green-500" : "text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                <div className="h-3 w-3 rounded-full border border-current" />
              )}
              <span>{milestone.title.split("!")[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export the milestones for reference
export { ONBOARDING_MILESTONES };

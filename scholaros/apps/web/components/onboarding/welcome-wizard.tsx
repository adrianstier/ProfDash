"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Users,
  CheckSquare,
  Calendar,
  FolderKanban,
  DollarSign,
  Rocket,
  BookOpen,
  Zap,
  Check,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnboarding, useOnboardingInteraction } from "@/lib/hooks/use-onboarding";
import { useAnalyticsEvents } from "@/lib/hooks/use-analytics-events";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { parseQuickAdd } from "@scholaros/shared";
import type { OnboardingStep } from "@scholaros/shared/types";
import type { TaskCategory, TaskPriority } from "@scholaros/shared";

// ============================================================================
// Types
// ============================================================================

interface WelcomeWizardProps {
  onClose?: () => void;
  className?: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

// ============================================================================
// Animation Variants
// ============================================================================

const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

// ============================================================================
// Welcome Wizard Component
// ============================================================================

export function WelcomeWizard({ onClose, className }: WelcomeWizardProps) {
  const router = useRouter();
  const [direction, setDirection] = useState(0);
  const [localStep, setLocalStep] = useState<WizardStep>(1);

  const {
    progress,
    currentStep,
    isLoading,
    goToStep,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  const { trackOnboardingStepViewed } = useAnalyticsEvents();

  // Sync local step with server state on mount
  useEffect(() => {
    if (currentStep > 0 && currentStep <= 5) {
      setLocalStep(currentStep as WizardStep);
    }
  }, [currentStep]);

  // Track step views
  useEffect(() => {
    if (localStep > 0) {
      const stepNames = ["", "welcome", "workspace", "first_task", "features_tour", "completion"];
      trackOnboardingStepViewed(localStep, stepNames[localStep]);
    }
  }, [localStep, trackOnboardingStepViewed]);

  // Handle step navigation
  const handleNext = useCallback(async () => {
    if (localStep < 5) {
      setDirection(1);
      const nextStep = (localStep + 1) as WizardStep;
      setLocalStep(nextStep);
      await goToStep(nextStep as OnboardingStep);
    } else {
      await completeOnboarding();
      onClose?.();
      router.push("/today");
    }
  }, [localStep, goToStep, completeOnboarding, onClose, router]);

  const handleBack = useCallback(async () => {
    if (localStep > 1) {
      setDirection(-1);
      const prevStep = (localStep - 1) as WizardStep;
      setLocalStep(prevStep);
      await goToStep(prevStep as OnboardingStep);
    }
  }, [localStep, goToStep]);

  const handleSkip = useCallback(async () => {
    await skipOnboarding();
    onClose?.();
    router.push("/today");
  }, [skipOnboarding, onClose, router]);

  const handleComplete = useCallback(async () => {
    await completeOnboarding();
    onClose?.();
    router.push("/today");
  }, [completeOnboarding, onClose, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center min-h-screen", className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Already completed
  if (progress?.completed || progress?.skipped) {
    return null;
  }

  const progressPercent = ((localStep - 1) / 4) * 100;

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">ScholarOS</span>
        </div>
        <button
          onClick={handleSkip}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Skip onboarding"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Progress Bar */}
      <div className="px-6 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Step {localStep} of 5
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round(progressPercent)}% complete
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-6 py-12">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={localStep}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-2xl"
            >
              {localStep === 1 && (
                <StepWelcome onNext={handleNext} onSkip={handleSkip} />
              )}
              {localStep === 2 && (
                <StepWorkspaceSetup onNext={handleNext} onBack={handleBack} />
              )}
              {localStep === 3 && (
                <StepFirstTaskGuide onNext={handleNext} onBack={handleBack} />
              )}
              {localStep === 4 && (
                <StepFeaturesTour onNext={handleNext} onBack={handleBack} />
              )}
              {localStep === 5 && (
                <StepCompletion onComplete={handleComplete} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer with navigation dots */}
      <footer className="border-t px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                localStep === step
                  ? "w-6 bg-primary"
                  : step < localStep
                  ? "w-2 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// Step 1: Welcome Screen with Product Overview
// ============================================================================

interface StepWelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

function StepWelcome({ onNext, onSkip }: StepWelcomeProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center"
    >
      {/* Logo */}
      <motion.div
        variants={itemVariants}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20"
      >
        <Sparkles className="h-10 w-10 text-primary-foreground" />
      </motion.div>

      {/* Title */}
      <motion.h1
        variants={itemVariants}
        className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Welcome to ScholarOS
      </motion.h1>

      {/* Description */}
      <motion.p
        variants={itemVariants}
        className="mt-4 max-w-md text-lg text-muted-foreground"
      >
        Your AI-powered academic productivity platform. Manage research, teaching,
        and grants all in one place.
      </motion.p>

      {/* Feature highlights */}
      <motion.div
        variants={itemVariants}
        className="mt-10 grid gap-4 sm:grid-cols-3 w-full max-w-xl"
      >
        <FeatureHighlight
          icon={CheckSquare}
          title="Smart Tasks"
          description="Quick-add with natural language"
        />
        <FeatureHighlight
          icon={FolderKanban}
          title="Project Tracking"
          description="Manuscripts, grants, and more"
        />
        <FeatureHighlight
          icon={Sparkles}
          title="AI-Powered"
          description="Intelligent insights and summaries"
        />
      </motion.div>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="mt-10 flex flex-col gap-3 sm:flex-row"
      >
        <Button size="lg" onClick={onNext} className="gap-2 px-8">
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="lg" onClick={onSkip}>
          Skip Setup
        </Button>
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="mt-4 text-xs text-muted-foreground"
      >
        Takes about 2 minutes to complete
      </motion.p>
    </motion.div>
  );
}

function FeatureHighlight({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================================================
// Step 2: Workspace Setup
// ============================================================================

interface StepWorkspaceSetupProps {
  onNext: () => void;
  onBack: () => void;
}

function StepWorkspaceSetup({ onNext, onBack }: StepWorkspaceSetupProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const recordInteraction = useOnboardingInteraction();

  const canProceed = workspaceName.trim().length > 2;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight">
          Name Your Workspace
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your workspace organizes all your tasks, projects, and team members.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div variants={itemVariants} className="mt-8 space-y-6">
        <div className="space-y-2">
          <label htmlFor="workspaceName" className="text-sm font-medium">
            Workspace Name
          </label>
          <input
            id="workspaceName"
            type="text"
            value={workspaceName}
            onChange={(e) => {
              setWorkspaceName(e.target.value);
              recordInteraction();
            }}
            placeholder="e.g., Smith Lab, My Research, Department of Biology"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            This could be your lab name, research group, or personal workspace.
          </p>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {["My Lab", "Research Projects", "Personal Tasks", "Teaching"].map(
              (suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setWorkspaceName(suggestion);
                    recordInteraction();
                  }}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                >
                  {suggestion}
                </button>
              )
            )}
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="mt-10 flex justify-between"
      >
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Step 3: First Task Creation Guide with Quick-Add Tutorial
// ============================================================================

interface StepFirstTaskGuideProps {
  onNext: () => void;
  onBack: () => void;
}

const EXAMPLE_TASKS = [
  { text: "Review manuscript draft tomorrow p1 #research", parsed: "Tomorrow, Priority 1, Research" },
  { text: "Lab meeting friday 2pm #teaching", parsed: "Friday, Teaching" },
  { text: "NSF deadline next week p1 #grants", parsed: "Next week, Priority 1, Grants" },
];

function StepFirstTaskGuide({ onNext, onBack }: StepFirstTaskGuideProps) {
  const [taskInput, setTaskInput] = useState("");
  const [taskCreated, setTaskCreated] = useState(false);
  const [showParsed, setShowParsed] = useState(false);
  const recordInteraction = useOnboardingInteraction();
  const createTask = useCreateTask();

  const parsedTask = taskInput ? parseQuickAdd(taskInput) : null;

  const handleCreateTask = async () => {
    if (!taskInput.trim()) return;

    const parsed = parseQuickAdd(taskInput);
    try {
      await createTask.mutateAsync({
        title: parsed.title,
        category: (parsed.category as TaskCategory) || "misc",
        priority: (parsed.priority as TaskPriority) || "p3",
        status: "todo" as const,
        description: null,
        due: parsed.due ? parsed.due.toISOString().split("T")[0] : null,
        project_id: null,
        workspace_id: null,
        assignees: [],
        tags: [],
      });
      setTaskCreated(true);
      recordInteraction();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleExampleClick = (example: string) => {
    setTaskInput(example);
    setShowParsed(true);
    recordInteraction();
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight">
          Quick-Add Your First Task
        </h2>
        <p className="mt-2 text-muted-foreground">
          Use natural language to create tasks instantly. Try it out!
        </p>
      </motion.div>

      {taskCreated ? (
        <motion.div
          variants={itemVariants}
          className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-6 w-6 text-green-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Task Created!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You can find it in your Today view after setup.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Quick-Add Input */}
          <motion.div variants={itemVariants} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label htmlFor="quickAdd" className="text-sm font-medium">
                Quick-Add Input
              </label>
              <div className="relative">
                <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="quickAdd"
                  type="text"
                  value={taskInput}
                  onChange={(e) => {
                    setTaskInput(e.target.value);
                    setShowParsed(true);
                    recordInteraction();
                  }}
                  placeholder="Type a task..."
                  className="w-full rounded-xl border bg-background pl-11 pr-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Parsed Preview */}
            {showParsed && taskInput && parsedTask && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border bg-muted/50 p-3 space-y-2"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Parsed Task
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="font-medium">{parsedTask.title}</span>
                  {parsedTask.due && (
                    <span className="rounded-full bg-blue-500/10 text-blue-500 px-2 py-0.5 text-xs">
                      {parsedTask.due.toLocaleDateString()}
                    </span>
                  )}
                  {parsedTask.priority && (
                    <span className="rounded-full bg-orange-500/10 text-orange-500 px-2 py-0.5 text-xs">
                      {parsedTask.priority.toUpperCase()}
                    </span>
                  )}
                  {parsedTask.category && (
                    <span className="rounded-full bg-purple-500/10 text-purple-500 px-2 py-0.5 text-xs">
                      #{parsedTask.category}
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Create Button */}
            {taskInput.trim() && (
              <Button
                onClick={handleCreateTask}
                disabled={createTask.isPending}
                className="w-full gap-2"
              >
                {createTask.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>
            )}
          </motion.div>

          {/* Quick-Add Syntax Guide */}
          <motion.div variants={itemVariants} className="mt-6 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Try these examples
            </p>
            <div className="space-y-2">
              {EXAMPLE_TASKS.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleExampleClick(example.text)}
                  className="w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <code className="text-sm font-mono text-primary">
                    {example.text}
                  </code>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {example.parsed}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Syntax Reference */}
          <motion.div
            variants={itemVariants}
            className="mt-6 rounded-lg bg-muted/50 p-4"
          >
            <p className="text-sm font-medium mb-2">Quick-Add Syntax</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><code className="text-primary">tomorrow</code> - Due date</div>
              <div><code className="text-primary">p1-p4</code> - Priority</div>
              <div><code className="text-primary">#research</code> - Category</div>
              <div><code className="text-primary">@name</code> - Assignee</div>
            </div>
          </motion.div>
        </>
      )}

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="mt-8 flex justify-between"
      >
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          {taskCreated ? "Continue" : "Skip for Now"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Step 4: Key Features Tour
// ============================================================================

interface StepFeaturesTourProps {
  onNext: () => void;
  onBack: () => void;
}

const FEATURES = [
  {
    icon: Calendar,
    title: "Calendar Integration",
    description:
      "Connect your Google Calendar to see events alongside tasks. Never miss a meeting or deadline.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    description:
      "Track manuscripts from draft to publication. Manage grant applications with stage-based workflows.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: DollarSign,
    title: "Grant Discovery",
    description:
      "Search funding opportunities from NSF, NIH, and more. Get AI-powered fit scores for your research.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

function StepFeaturesTour({ onNext, onBack }: StepFeaturesTourProps) {
  const [activeFeature, setActiveFeature] = useState(0);
  const recordInteraction = useOnboardingInteraction();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight">
          Explore Key Features
        </h2>
        <p className="mt-2 text-muted-foreground">
          ScholarOS is packed with tools designed for academic productivity.
        </p>
      </motion.div>

      {/* Feature Cards */}
      <motion.div variants={itemVariants} className="mt-8 space-y-4">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const isActive = activeFeature === index;

          return (
            <motion.button
              key={index}
              onClick={() => {
                setActiveFeature(index);
                recordInteraction();
              }}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-all",
                isActive
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:bg-accent"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    feature.bgColor
                  )}
                >
                  <Icon className={cn("h-6 w-6", feature.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p
                    className={cn(
                      "mt-1 text-sm transition-all",
                      isActive
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70 line-clamp-1"
                    )}
                  >
                    {feature.description}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {isActive && <Check className="h-3.5 w-3.5" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Keyboard shortcuts hint */}
      <motion.div
        variants={itemVariants}
        className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">Q</kbd>
          <span>Quick add task</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">Cmd+K</kbd>
          <span>Search everything</span>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="mt-8 flex justify-between"
      >
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Step 5: Completion Screen
// ============================================================================

interface StepCompletionProps {
  onComplete: () => void;
}

function StepCompletion({ onComplete }: StepCompletionProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mx-auto text-center"
    >
      {/* Celebration Icon */}
      <motion.div
        variants={itemVariants}
        className="relative mx-auto h-24 w-24"
      >
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
          <PartyPopper className="h-12 w-12 text-primary-foreground" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h2
        variants={itemVariants}
        className="mt-8 text-3xl font-bold tracking-tight"
      >
        You&apos;re All Set!
      </motion.h2>

      {/* Description */}
      <motion.p
        variants={itemVariants}
        className="mt-4 text-lg text-muted-foreground"
      >
        Welcome to ScholarOS. Start managing your academic life like a pro.
      </motion.p>

      {/* Quick Tips */}
      <motion.div variants={itemVariants} className="mt-10 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Next Steps
        </h3>
        <div className="grid gap-3 text-left">
          <QuickTip
            icon={Zap}
            title="Press Q anywhere"
            description="to quickly add a new task"
          />
          <QuickTip
            icon={Sparkles}
            title="Connect your calendar"
            description="in Settings to sync your events"
          />
          <QuickTip
            icon={Rocket}
            title="Create your first project"
            description="to track a manuscript or grant"
          />
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div variants={itemVariants}>
        <Button size="lg" onClick={onComplete} className="mt-10 gap-2 px-8">
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

function QuickTip({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Modal Wrapper for Welcome Wizard
// ============================================================================

interface WelcomeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeWizardModal({ isOpen, onClose }: WelcomeWizardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative flex h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl"
        >
          <WelcomeWizard onClose={onClose} className="relative h-[90vh] max-h-[800px]" />
        </motion.div>
      </div>
    </div>
  );
}

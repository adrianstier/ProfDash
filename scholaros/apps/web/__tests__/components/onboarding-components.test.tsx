import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../utils/test-utils";

// ============================================================================
// Mocks
// ============================================================================

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockNextStep = vi.fn();
const mockGoToStep = vi.fn();
const mockCompleteOnboarding = vi.fn();
const mockSkipOnboarding = vi.fn();
const mockTrackOnboardingStepViewed = vi.fn();
const mockRecordInteraction = vi.fn();
const mockCreateTaskMutateAsync = vi.fn();

vi.mock("@/lib/hooks/use-onboarding", () => ({
  useOnboarding: vi.fn(() => ({
    progress: null,
    currentStep: 1,
    isLoading: false,
    isUpdating: false,
    nextStep: mockNextStep,
    goToStep: mockGoToStep,
    completeOnboarding: mockCompleteOnboarding,
    skipOnboarding: mockSkipOnboarding,
  })),
  useOnboardingInteraction: vi.fn(() => mockRecordInteraction),
  useShouldShowOnboarding: vi.fn(() => false),
}));

vi.mock("@/lib/hooks/use-analytics-events", () => ({
  useAnalyticsEvents: vi.fn(() => ({
    trackOnboardingStepViewed: mockTrackOnboardingStepViewed,
  })),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useCreateTask: vi.fn(() => ({
    mutateAsync: mockCreateTaskMutateAsync,
    isPending: false,
  })),
}));

vi.mock("@scholaros/shared", () => ({
  parseQuickAdd: vi.fn((input: string) => ({
    title: input,
    category: null,
    priority: null,
    due: null,
    projectId: null,
    assignees: [],
  })),
}));

vi.mock("@scholaros/shared/types", () => ({
  ONBOARDING_STEP_NAMES: ["", "welcome", "profile", "workspace", "first_task", "completion"],
}));

// Mock lucide-react icons as simple spans
vi.mock("lucide-react", () => ({
  Sparkles: ({ className }: { className?: string }) => <span data-testid="icon-sparkles" className={className} />,
  ArrowRight: ({ className }: { className?: string }) => <span data-testid="icon-arrow-right" className={className} />,
  ArrowLeft: ({ className }: { className?: string }) => <span data-testid="icon-arrow-left" className={className} />,
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
  Check: ({ className }: { className?: string }) => <span data-testid="icon-check" className={className} />,
  PartyPopper: ({ className }: { className?: string }) => <span data-testid="icon-party" className={className} />,
  User: ({ className }: { className?: string }) => <span data-testid="icon-user" className={className} />,
  Users: ({ className }: { className?: string }) => <span data-testid="icon-users" className={className} />,
  Building2: ({ className }: { className?: string }) => <span data-testid="icon-building" className={className} />,
  Lock: ({ className }: { className?: string }) => <span data-testid="icon-lock" className={className} />,
  Globe: ({ className }: { className?: string }) => <span data-testid="icon-globe" className={className} />,
  CheckSquare: ({ className }: { className?: string }) => <span data-testid="icon-checksquare" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="icon-loader" className={className} />,
  BookOpen: ({ className }: { className?: string }) => <span data-testid="icon-book" className={className} />,
  Zap: ({ className }: { className?: string }) => <span data-testid="icon-zap" className={className} />,
}));

// Mock Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
    size,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress-bar" data-value={value} className={className} />
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
    h1: ({ children, className }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className={className}>{children}</h1>
    ),
    h2: ({ children, className }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={className}>{children}</h2>
    ),
    p: ({ children, className }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={className}>{children}</p>
    ),
    button: ({
      children,
      className,
      onClick,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button className={className} onClick={onClick}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// OnboardingProgress Tests
// ============================================================================

import { OnboardingProgress, ProgressDots } from "@/components/onboarding/onboarding-progress";

describe("OnboardingProgress", () => {
  it("renders all step labels", () => {
    render(<OnboardingProgress currentStep={1} />);
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("First Task")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("highlights current step", () => {
    render(<OnboardingProgress currentStep={2} />);
    // Step 2 (Profile) should be current, Step 1 (Welcome) should be completed
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders compact variant", () => {
    render(<OnboardingProgress currentStep={3} variant="compact" />);
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
  });

  it("shows step number for incomplete steps", () => {
    render(<OnboardingProgress currentStep={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <OnboardingProgress currentStep={1} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});

describe("ProgressDots", () => {
  it("renders 5 dots by default", () => {
    const { container } = render(<ProgressDots currentStep={1} />);
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBe(5);
  });

  it("renders custom number of dots", () => {
    const { container } = render(<ProgressDots currentStep={1} totalSteps={3} />);
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBe(3);
  });

  it("applies wider width to current step dot", () => {
    const { container } = render(<ProgressDots currentStep={3} />);
    const dots = container.querySelectorAll(".rounded-full");
    // Current step (3rd) should have w-6 class
    expect(dots[2]).toHaveClass("w-6");
  });

  it("applies custom className", () => {
    const { container } = render(
      <ProgressDots currentStep={1} className="my-class" />
    );
    expect(container.firstChild).toHaveClass("my-class");
  });
});

// ============================================================================
// StepWelcome Tests
// ============================================================================

import { StepWelcome } from "@/components/onboarding/steps/step-welcome";

describe("StepWelcome", () => {
  it("renders welcome title", () => {
    render(<StepWelcome onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Welcome to ScholarOS")).toBeInTheDocument();
  });

  it("renders feature preview cards", () => {
    render(<StepWelcome onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Smart Task Management")).toBeInTheDocument();
    expect(screen.getByText("Project Tracking")).toBeInTheDocument();
    expect(screen.getByText("AI-Powered Insights")).toBeInTheDocument();
  });

  it("renders Get Started button", () => {
    render(<StepWelcome onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("calls onNext when Get Started is clicked", () => {
    const onNext = vi.fn();
    render(<StepWelcome onNext={onNext} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText("Get Started"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("renders Skip Setup button", () => {
    render(<StepWelcome onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Skip Setup")).toBeInTheDocument();
  });

  it("calls onSkip when Skip Setup is clicked", () => {
    const onSkip = vi.fn();
    render(<StepWelcome onNext={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByText("Skip Setup"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("shows time estimate", () => {
    render(<StepWelcome onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Takes about 2 minutes to complete")).toBeInTheDocument();
  });
});

// ============================================================================
// StepProfile Tests
// ============================================================================

import { StepProfile } from "@/components/onboarding/steps/step-profile";

describe("StepProfile", () => {
  it("renders profile step title", () => {
    render(<StepProfile onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
  });

  it("renders full name input", () => {
    render(<StepProfile onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByPlaceholderText("Dr. Jane Smith")).toBeInTheDocument();
  });

  it("renders institution input", () => {
    render(<StepProfile onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByPlaceholderText("University of Example")).toBeInTheDocument();
  });

  it("renders role selection buttons", () => {
    render(<StepProfile onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Faculty")).toBeInTheDocument();
    expect(screen.getByText("Postdoc")).toBeInTheDocument();
    expect(screen.getByText("Graduate Student")).toBeInTheDocument();
    expect(screen.getByText("Lab Manager")).toBeInTheDocument();
  });

  it("Continue button is disabled when name is empty", () => {
    render(<StepProfile onNext={vi.fn()} onBack={vi.fn()} />);
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();
  });

  it("Continue button is enabled when name is entered", () => {
    render(<StepProfile onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Dr. Jane Smith"), {
      target: { value: "Dr. Test User" },
    });
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).not.toBeDisabled();
  });

  it("calls onNext when Continue is clicked", () => {
    const onNext = vi.fn();
    render(<StepProfile onNext={onNext} onBack={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Dr. Jane Smith"), {
      target: { value: "Dr. Test User" },
    });
    fireEvent.click(screen.getByText("Continue"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = vi.fn();
    render(<StepProfile onNext={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("records interaction on field change", () => {
    render(<StepProfile onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Dr. Jane Smith"), {
      target: { value: "Test" },
    });
    expect(mockRecordInteraction).toHaveBeenCalled();
  });
});

// ============================================================================
// StepWorkspace Tests
// ============================================================================

import { StepWorkspace } from "@/components/onboarding/steps/step-workspace";

describe("StepWorkspace", () => {
  it("renders workspace step title", () => {
    render(<StepWorkspace onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Create Your Workspace")).toBeInTheDocument();
  });

  it("renders workspace name input", () => {
    render(<StepWorkspace onNext={vi.fn()} onBack={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("e.g., Smith Lab, My Research")
    ).toBeInTheDocument();
  });

  it("renders workspace type options", () => {
    render(<StepWorkspace onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
  });

  it("Continue button is disabled when name is empty", () => {
    render(<StepWorkspace onNext={vi.fn()} onBack={vi.fn()} />);
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();
  });

  it("Continue button is enabled when name is entered", () => {
    render(<StepWorkspace onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(
      screen.getByPlaceholderText("e.g., Smith Lab, My Research"),
      { target: { value: "My Lab" } }
    );
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).not.toBeDisabled();
  });

  it("shows team workspace info when team is selected", () => {
    render(<StepWorkspace onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Team"));
    expect(screen.getByText("Team Workspace")).toBeInTheDocument();
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = vi.fn();
    render(<StepWorkspace onNext={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// StepFirstTask Tests
// ============================================================================

import { StepFirstTask } from "@/components/onboarding/steps/step-first-task";

describe("StepFirstTask", () => {
  it("renders first task step title", () => {
    render(<StepFirstTask onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Create Your First Task")).toBeInTheDocument();
  });

  it("renders task template buttons", () => {
    render(<StepFirstTask onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Review manuscript draft")).toBeInTheDocument();
    expect(screen.getByText("Prepare for lab meeting")).toBeInTheDocument();
    expect(screen.getByText("Check grant deadlines")).toBeInTheDocument();
  });

  it("renders custom task input", () => {
    render(<StepFirstTask onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByLabelText("Write Your Own")).toBeInTheDocument();
  });

  it("shows Create Task button when template is selected", () => {
    render(<StepFirstTask onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Review manuscript draft"));
    expect(screen.getByText("Create Task")).toBeInTheDocument();
  });

  it("shows Create Task button when text is entered", () => {
    render(<StepFirstTask onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Write Your Own"), {
      target: { value: "My custom task" },
    });
    expect(screen.getByText("Create Task")).toBeInTheDocument();
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = vi.fn();
    render(<StepFirstTask onNext={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows Skip for Now when no task created", () => {
    render(<StepFirstTask onNext={vi.fn()} onBack={vi.fn()} />);
    // The continue/skip button shows "Skip for Now" when no task is created
    expect(screen.getByText("Skip for Now")).toBeInTheDocument();
  });
});

// ============================================================================
// StepCompletion Tests
// ============================================================================

import { StepCompletion } from "@/components/onboarding/steps/step-completion";

describe("StepCompletion", () => {
  it("renders completion title", () => {
    render(<StepCompletion onComplete={vi.fn()} />);
    expect(screen.getByText(/You're All Set/)).toBeInTheDocument();
  });

  it("renders quick tips", () => {
    render(<StepCompletion onComplete={vi.fn()} />);
    expect(screen.getByText("Press Q")).toBeInTheDocument();
    expect(screen.getByText(/⌘K/)).toBeInTheDocument();
    expect(screen.getByText("Explore Projects")).toBeInTheDocument();
  });

  it("renders Go to Dashboard button", () => {
    render(<StepCompletion onComplete={vi.fn()} />);
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
  });

  it("calls onComplete when Go to Dashboard is clicked", () => {
    const onComplete = vi.fn();
    render(<StepCompletion onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Go to Dashboard"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// OnboardingWizard Tests
// ============================================================================

import { OnboardingWizard, OnboardingModal } from "@/components/onboarding/onboarding-wizard";

vi.mock("@/components/onboarding/steps", () => ({
  StepWelcome: ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) => (
    <div data-testid="step-welcome">
      <button onClick={onNext}>Next</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
  StepProfile: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
    <div data-testid="step-profile">
      <button onClick={onNext}>Next</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
  StepWorkspace: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
    <div data-testid="step-workspace">
      <button onClick={onNext}>Next</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
  StepFirstTask: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
    <div data-testid="step-first-task">
      <button onClick={onNext}>Next</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
  StepCompletion: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="step-completion">
      <button onClick={onComplete}>Complete</button>
    </div>
  ),
}));

describe("OnboardingWizard", () => {
  it("renders the ScholarOS heading", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText("ScholarOS")).toBeInTheDocument();
  });

  it("renders skip onboarding button", () => {
    render(<OnboardingWizard />);
    expect(screen.getByLabelText("Skip onboarding")).toBeInTheDocument();
  });

  it("shows step counter for steps 1-4", () => {
    render(<OnboardingWizard />);
    const stepCounters = screen.getAllByText("Step 1 of 5");
    expect(stepCounters.length).toBeGreaterThan(0);
  });
});

describe("OnboardingModal", () => {
  it("returns null when not open", () => {
    const { container } = render(<OnboardingModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders wizard when open", () => {
    render(<OnboardingModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("ScholarOS")).toBeInTheDocument();
  });
});

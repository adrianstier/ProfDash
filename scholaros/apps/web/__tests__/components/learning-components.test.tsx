import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "../utils/test-utils";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("lucide-react", () => ({
  FileText: ({ className }: { className?: string }) => <span data-testid="icon-file" className={className} />,
  Mic: ({ className }: { className?: string }) => <span data-testid="icon-mic" className={className} />,
  Wand2: ({ className }: { className?: string }) => <span data-testid="icon-wand" className={className} />,
  ArrowRight: ({ className }: { className?: string }) => <span data-testid="icon-arrow" className={className} />,
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
  Check: ({ className }: { className?: string }) => <span data-testid="icon-check" className={className} />,
  Rocket: ({ className }: { className?: string }) => <span data-testid="icon-rocket" className={className} />,
  Sparkles: ({ className }: { className?: string }) => <span data-testid="icon-sparkles" className={className} />,
  Lightbulb: ({ className }: { className?: string }) => <span data-testid="icon-lightbulb" className={className} />,
  ListTree: ({ className }: { className?: string }) => <span data-testid="icon-listtree" className={className} />,
  Mail: ({ className }: { className?: string }) => <span data-testid="icon-mail" className={className} />,
  FileImage: ({ className }: { className?: string }) => <span data-testid="icon-fileimage" className={className} />,
  Flag: ({ className }: { className?: string }) => <span data-testid="icon-flag" className={className} />,
  Hash: ({ className }: { className?: string }) => <span data-testid="icon-hash" className={className} />,
  Calendar: ({ className }: { className?: string }) => <span data-testid="icon-calendar" className={className} />,
  User: ({ className }: { className?: string }) => <span data-testid="icon-user" className={className} />,
  Folder: ({ className }: { className?: string }) => <span data-testid="icon-folder" className={className} />,
  HelpCircle: ({ className }: { className?: string }) => <span data-testid="icon-help" className={className} />,
  ChevronDown: ({ className }: { className?: string }) => <span data-testid="icon-chevdown" className={className} />,
  ChevronUp: ({ className }: { className?: string }) => <span data-testid="icon-chevup" className={className} />,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const originalGetItem = Storage.prototype.getItem;
const originalSetItem = Storage.prototype.setItem;
const originalRemoveItem = Storage.prototype.removeItem;

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

  Storage.prototype.getItem = vi.fn((key: string) => mockLocalStorage[key] || null);
  Storage.prototype.setItem = vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  });
  Storage.prototype.removeItem = vi.fn((key: string) => {
    delete mockLocalStorage[key];
  });
});

afterEach(() => {
  Storage.prototype.getItem = originalGetItem;
  Storage.prototype.setItem = originalSetItem;
  Storage.prototype.removeItem = originalRemoveItem;
});

// ============================================================================
// Progressive Onboarding Tests
// ============================================================================

import {
  OnboardingProvider,
  useOnboarding,
  MilestoneModal,
  OnboardingProgress,
} from "@/components/learning/progressive-onboarding";

// Helper component to use the context
function OnboardingTestConsumer() {
  const {
    state,
    startOnboarding,
    completeCurrentStep,
    skipOnboarding,
    incrementTaskCount,
    incrementProjectCount,
    currentMilestone,
    dismissMilestone,
    resetOnboarding,
  } = useOnboarding();

  return (
    <div>
      <span data-testid="has-started">{state.hasStarted ? "yes" : "no"}</span>
      <span data-testid="task-count">{state.taskCount}</span>
      <span data-testid="project-count">{state.projectCount}</span>
      <span data-testid="completed-count">{state.completedMilestones.length}</span>
      <span data-testid="current-milestone">
        {currentMilestone?.id || "none"}
      </span>
      <button onClick={startOnboarding}>Start</button>
      <button onClick={completeCurrentStep}>Complete Step</button>
      <button onClick={skipOnboarding}>Skip</button>
      <button onClick={incrementTaskCount}>Add Task</button>
      <button onClick={incrementProjectCount}>Add Project</button>
      <button onClick={dismissMilestone}>Dismiss</button>
      <button onClick={resetOnboarding}>Reset</button>
    </div>
  );
}

describe("OnboardingProvider", () => {
  it("provides initial state", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    expect(screen.getByTestId("has-started")).toHaveTextContent("no");
    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
    expect(screen.getByTestId("project-count")).toHaveTextContent("0");
  });

  it("starts onboarding and shows welcome milestone", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    fireEvent.click(screen.getByText("Start"));
    expect(screen.getByTestId("has-started")).toHaveTextContent("yes");
    expect(screen.getByTestId("current-milestone")).toHaveTextContent("welcome");
  });

  it("completes current step", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    fireEvent.click(screen.getByText("Start"));
    fireEvent.click(screen.getByText("Complete Step"));
    expect(screen.getByTestId("completed-count")).toHaveTextContent("1");
    expect(screen.getByTestId("current-milestone")).toHaveTextContent("none");
  });

  it("skips onboarding and marks all milestones complete", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    fireEvent.click(screen.getByText("Skip"));
    expect(screen.getByTestId("has-started")).toHaveTextContent("yes");
    // All milestones should be completed
    const completedCount = parseInt(
      screen.getByTestId("completed-count").textContent || "0"
    );
    expect(completedCount).toBeGreaterThan(0);
  });

  it("increments task count", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    fireEvent.click(screen.getByText("Add Task"));
    expect(screen.getByTestId("task-count")).toHaveTextContent("1");
  });

  it("increments project count", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    fireEvent.click(screen.getByText("Add Project"));
    expect(screen.getByTestId("project-count")).toHaveTextContent("1");
  });

  it("dismisses milestone", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    fireEvent.click(screen.getByText("Start"));
    expect(screen.getByTestId("current-milestone")).toHaveTextContent("welcome");
    fireEvent.click(screen.getByText("Dismiss"));
    expect(screen.getByTestId("current-milestone")).toHaveTextContent("none");
  });

  it("resets onboarding", () => {
    render(
      <OnboardingProvider>
        <OnboardingTestConsumer />
      </OnboardingProvider>
    );
    fireEvent.click(screen.getByText("Start"));
    fireEvent.click(screen.getByText("Add Task"));
    fireEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("has-started")).toHaveTextContent("no");
    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
  });
});

describe("useOnboarding", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<OnboardingTestConsumer />)).toThrow(
      "useOnboarding must be used within OnboardingProvider"
    );
    spy.mockRestore();
  });
});

describe("MilestoneModal", () => {
  it("renders nothing when no milestone is active", () => {
    const { container } = render(
      <OnboardingProvider>
        <MilestoneModal />
      </OnboardingProvider>
    );
    // No milestone is active initially, so modal should be empty
    expect(container.querySelector("[data-testid='icon-rocket']")).toBeNull();
  });

  it("renders milestone when active", () => {
    function TriggerMilestone() {
      const { startOnboarding } = useOnboarding();
      return <button onClick={startOnboarding}>Trigger</button>;
    }

    render(
      <OnboardingProvider>
        <TriggerMilestone />
        <MilestoneModal />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));
    expect(screen.getByText("Welcome to ScholarOS!")).toBeInTheDocument();
  });
});

describe("OnboardingProgress (learning)", () => {
  it("renders progress bar with milestone checklist", () => {
    render(
      <OnboardingProvider>
        <OnboardingProgress />
      </OnboardingProvider>
    );
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("0/4 completed")).toBeInTheDocument();
  });

  it("returns null when all milestones are completed", () => {
    function SkipAll() {
      const { skipOnboarding } = useOnboarding();
      return <button onClick={skipOnboarding}>Skip All</button>;
    }

    const { container } = render(
      <OnboardingProvider>
        <SkipAll />
        <OnboardingProgress />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText("Skip All"));
    // After skipping, the progress component should return null
    expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
  });
});

// ============================================================================
// Feature Spotlight Tests
// ============================================================================

import {
  FeatureDiscoveryProvider,
  useFeatureDiscovery,
  FeatureSpotlight,
  SpotlightTrigger,
} from "@/components/learning/feature-spotlight";

function FeatureDiscoveryTestConsumer() {
  const {
    seenFeatures,
    markAsSeen,
    showSpotlight,
    hideSpotlight,
    currentSpotlight,
    resetAllSpotlights,
  } = useFeatureDiscovery();

  return (
    <div>
      <span data-testid="seen-count">{seenFeatures.size}</span>
      <span data-testid="current-spotlight">
        {currentSpotlight?.id || "none"}
      </span>
      <button onClick={() => showSpotlight("voice-input")}>Show Voice</button>
      <button onClick={() => markAsSeen("voice-input")}>Mark Seen</button>
      <button onClick={hideSpotlight}>Hide</button>
      <button onClick={resetAllSpotlights}>Reset</button>
    </div>
  );
}

describe("FeatureDiscoveryProvider", () => {
  it("provides initial state with no seen features", () => {
    render(
      <FeatureDiscoveryProvider>
        <FeatureDiscoveryTestConsumer />
      </FeatureDiscoveryProvider>
    );
    expect(screen.getByTestId("seen-count")).toHaveTextContent("0");
    expect(screen.getByTestId("current-spotlight")).toHaveTextContent("none");
  });

  it("shows spotlight for a feature", () => {
    render(
      <FeatureDiscoveryProvider>
        <FeatureDiscoveryTestConsumer />
      </FeatureDiscoveryProvider>
    );
    fireEvent.click(screen.getByText("Show Voice"));
    expect(screen.getByTestId("current-spotlight")).toHaveTextContent("voice-input");
  });

  it("marks feature as seen", () => {
    render(
      <FeatureDiscoveryProvider>
        <FeatureDiscoveryTestConsumer />
      </FeatureDiscoveryProvider>
    );
    fireEvent.click(screen.getByText("Mark Seen"));
    expect(screen.getByTestId("seen-count")).toHaveTextContent("1");
  });

  it("does not show spotlight for already seen feature", () => {
    render(
      <FeatureDiscoveryProvider>
        <FeatureDiscoveryTestConsumer />
      </FeatureDiscoveryProvider>
    );
    fireEvent.click(screen.getByText("Mark Seen"));
    fireEvent.click(screen.getByText("Show Voice"));
    expect(screen.getByTestId("current-spotlight")).toHaveTextContent("none");
  });

  it("hides spotlight after showing", () => {
    // Use content-importer which won't be affected by prior test state
    function HideSpotlightConsumer() {
      const { showSpotlight, hideSpotlight, currentSpotlight } = useFeatureDiscovery();
      return (
        <div>
          <span data-testid="spotlight">{currentSpotlight?.id || "none"}</span>
          <button onClick={() => showSpotlight("content-importer")}>Show</button>
          <button onClick={hideSpotlight}>Hide</button>
        </div>
      );
    }

    render(
      <FeatureDiscoveryProvider>
        <HideSpotlightConsumer />
      </FeatureDiscoveryProvider>
    );
    fireEvent.click(screen.getByText("Show"));
    expect(screen.getByTestId("spotlight")).toHaveTextContent("content-importer");
    fireEvent.click(screen.getByText("Hide"));
    expect(screen.getByTestId("spotlight")).toHaveTextContent("none");
  });

  it("resets all spotlights", () => {
    render(
      <FeatureDiscoveryProvider>
        <FeatureDiscoveryTestConsumer />
      </FeatureDiscoveryProvider>
    );
    fireEvent.click(screen.getByText("Mark Seen"));
    expect(screen.getByTestId("seen-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("seen-count")).toHaveTextContent("0");
  });
});

describe("useFeatureDiscovery", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<FeatureDiscoveryTestConsumer />)).toThrow(
      "useFeatureDiscovery must be used within FeatureDiscoveryProvider"
    );
    spy.mockRestore();
  });
});

describe("FeatureSpotlight", () => {
  it("renders nothing when no spotlight is active", () => {
    const { container } = render(
      <FeatureDiscoveryProvider>
        <FeatureSpotlight />
      </FeatureDiscoveryProvider>
    );
    // No content should be rendered
    expect(screen.queryByText("New AI Feature")).not.toBeInTheDocument();
  });

  it("renders spotlight when active", () => {
    function TriggerSpotlight() {
      const { showSpotlight } = useFeatureDiscovery();
      return (
        <button onClick={() => showSpotlight("voice-input")}>Trigger</button>
      );
    }

    render(
      <FeatureDiscoveryProvider>
        <TriggerSpotlight />
        <FeatureSpotlight />
      </FeatureDiscoveryProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));
    expect(screen.getByText("Voice Input")).toBeInTheDocument();
    expect(screen.getByText("New AI Feature")).toBeInTheDocument();
    expect(screen.getByText("Got it")).toBeInTheDocument();
  });

  it("marks feature as seen when Got it is clicked", () => {
    function SpotlightTest() {
      const { showSpotlight, seenFeatures } = useFeatureDiscovery();
      return (
        <>
          <button onClick={() => showSpotlight("voice-input")}>Trigger</button>
          <span data-testid="seen">{seenFeatures.size}</span>
        </>
      );
    }

    render(
      <FeatureDiscoveryProvider>
        <SpotlightTest />
        <FeatureSpotlight />
      </FeatureDiscoveryProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));
    fireEvent.click(screen.getByText("Got it"));
    expect(screen.getByTestId("seen")).toHaveTextContent("1");
  });
});

describe("SpotlightTrigger", () => {
  it("renders children", () => {
    render(
      <FeatureDiscoveryProvider>
        <SpotlightTrigger featureId="voice-input">
          <button>Test Button</button>
        </SpotlightTrigger>
      </FeatureDiscoveryProvider>
    );
    expect(screen.getByText("Test Button")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <FeatureDiscoveryProvider>
        <SpotlightTrigger featureId="voice-input" className="custom-cls">
          <span>Content</span>
        </SpotlightTrigger>
      </FeatureDiscoveryProvider>
    );
    expect(container.querySelector(".custom-cls")).toBeInTheDocument();
  });
});

// ============================================================================
// Quick Add Helper Tests
// ============================================================================

import {
  QuickAddHelper,
  QuickAddHelpButton,
} from "@/components/learning/quick-add-helper";

describe("QuickAddHelper", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <QuickAddHelper isVisible={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders syntax helper when visible", () => {
    render(<QuickAddHelper isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText("Quick Add Syntax")).toBeInTheDocument();
  });

  it("renders syntax categories", () => {
    render(<QuickAddHelper isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText("p1, p2, p3, p4")).toBeInTheDocument();
    expect(screen.getByText("#category")).toBeInTheDocument();
    expect(screen.getByText("@name")).toBeInTheDocument();
    expect(screen.getByText("+project")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<QuickAddHelper isVisible={true} onClose={onClose} />);
    // Find and click the X button
    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find(
      (btn) => btn.querySelector("[data-testid='icon-x']") !== null
    );
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows contextual suggestions based on input", () => {
    render(
      <QuickAddHelper
        isVisible={true}
        onClose={vi.fn()}
        inputValue="review paper"
      />
    );
    expect(screen.getByText("You could add:")).toBeInTheDocument();
    const priorityElements = screen.getAllByText(/priority/);
    expect(priorityElements.length).toBeGreaterThan(0);
  });

  it("does not show suggestions when input has priority and category", () => {
    render(
      <QuickAddHelper
        isVisible={true}
        onClose={vi.fn()}
        inputValue="review paper p1 #research tomorrow"
      />
    );
    expect(screen.queryByText("You could add:")).not.toBeInTheDocument();
  });

  it("shows full example when See full example is clicked", () => {
    render(<QuickAddHelper isVisible={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("See full example"));
    expect(screen.getByText("Urgent priority")).toBeInTheDocument();
    expect(screen.getByText("Grants category")).toBeInTheDocument();
  });

  it("expands category examples when clicked", () => {
    render(<QuickAddHelper isVisible={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Set priority level"));
    expect(screen.getByText("Examples:")).toBeInTheDocument();
    expect(screen.getByText(/Review paper p1/)).toBeInTheDocument();
  });
});

describe("QuickAddHelpButton", () => {
  it("renders syntax help button", () => {
    render(<QuickAddHelpButton onClick={vi.fn()} />);
    expect(screen.getByText("Syntax help")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<QuickAddHelpButton onClick={onClick} />);
    fireEvent.click(screen.getByText("Syntax help"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    const { container } = render(
      <QuickAddHelpButton onClick={vi.fn()} className="my-class" />
    );
    expect(container.querySelector("button")).toHaveClass("my-class");
  });
});

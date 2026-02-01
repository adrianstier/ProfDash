import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "../utils/test-utils";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("lucide-react", () => ({
  Bot: ({ className }: { className?: string }) => <span data-testid="icon-bot" className={className} />,
  Send: ({ className }: { className?: string }) => <span data-testid="icon-send" className={className} />,
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
  Minimize2: ({ className }: { className?: string }) => <span data-testid="icon-minimize" className={className} />,
  Maximize2: ({ className }: { className?: string }) => <span data-testid="icon-maximize" className={className} />,
  ChevronDown: ({ className }: { className?: string }) => <span data-testid="icon-chevdown" className={className} />,
  ChevronUp: ({ className }: { className?: string }) => <span data-testid="icon-chevup" className={className} />,
  Sparkles: ({ className }: { className?: string }) => <span data-testid="icon-sparkles" className={className} />,
  ThumbsUp: ({ className }: { className?: string }) => <span data-testid="icon-thumbsup" className={className} />,
  ThumbsDown: ({ className }: { className?: string }) => <span data-testid="icon-thumbsdown" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="icon-loader" className={className} />,
  FileText: ({ className }: { className?: string }) => <span data-testid="icon-file" className={className} />,
  ClipboardPaste: ({ className }: { className?: string }) => <span data-testid="icon-clipboard" className={className} />,
  ListChecks: ({ className }: { className?: string }) => <span data-testid="icon-listchecks" className={className} />,
  Target: ({ className }: { className?: string }) => <span data-testid="icon-target" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <span data-testid="icon-trendup" className={className} />,
  TrendingDown: ({ className }: { className?: string }) => <span data-testid="icon-trenddown" className={className} />,
  Minus: ({ className }: { className?: string }) => <span data-testid="icon-minus" className={className} />,
  RefreshCw: ({ className }: { className?: string }) => <span data-testid="icon-refresh" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <span data-testid="icon-alert" className={className} />,
  Lightbulb: ({ className }: { className?: string }) => <span data-testid="icon-lightbulb" className={className} />,
  CheckCircle2: ({ className }: { className?: string }) => <span data-testid="icon-check" className={className} />,
  AlertTriangle: ({ className }: { className?: string }) => <span data-testid="icon-warning" className={className} />,
  ArrowRight: ({ className }: { className?: string }) => <span data-testid="icon-arrow" className={className} />,
  ChevronRight: ({ className }: { className?: string }) => <span data-testid="icon-chevright" className={className} />,
}));

const mockOpenChat = vi.fn();
const mockCloseChat = vi.fn();
const mockSelectAgent = vi.fn();
const mockClearInitialMessage = vi.fn();
const mockSendMessage = vi.fn();
const mockFeedbackMutateAsync = vi.fn();

vi.mock("@/lib/hooks/use-agents", () => ({
  useAgentChat: vi.fn(() => ({
    messages: [],
    isLoading: false,
    sendMessage: mockSendMessage,
    suggestedActions: [],
  })),
  useAgentFeedback: vi.fn(() => ({
    mutateAsync: mockFeedbackMutateAsync,
  })),
  useAgents: vi.fn(() => ({
    data: [
      { type: "task", name: "Task Agent", description: "Helps with tasks" },
      { type: "project", name: "Project Agent", description: "Helps with projects" },
    ],
  })),
}));

vi.mock("@/lib/stores/agent-store", () => ({
  useAgentStore: vi.fn(() => ({
    isOpen: false,
    selectedAgent: null,
    currentSession: null,
    initialMessage: null,
    openChat: mockOpenChat,
    closeChat: mockCloseChat,
    selectAgent: mockSelectAgent,
    clearInitialMessage: mockClearInitialMessage,
  })),
}));

vi.mock("@/lib/hooks/use-ai", () => ({
  useGrantFitScore: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  })),
  useProjectSummary: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: vi.fn(() => ({
    data: [],
  })),
}));

vi.mock("@/components/ai/extract-tasks-modal", () => ({
  ExtractTasksModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="extract-tasks-modal">Extract Tasks Modal</div> : null,
}));

vi.mock("@/components/ai/extract-tasks-from-document", () => ({
  ExtractTasksFromDocumentModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="extract-document-modal">Extract Document Modal</div> : null,
}));

// Import mocked modules for dynamic overrides
import { useAgentStore } from "@/lib/stores/agent-store";
import { useAgentChat } from "@/lib/hooks/use-agents";
import { useGrantFitScore, useProjectSummary } from "@/lib/hooks/use-ai";
import { useTasks } from "@/lib/hooks/use-tasks";

const mockedUseAgentStore = useAgentStore as unknown as Mock;
const mockedUseAgentChat = useAgentChat as Mock;
const mockedUseGrantFitScore = useGrantFitScore as Mock;
const mockedUseProjectSummary = useProjectSummary as Mock;
const mockedUseTasks = useTasks as Mock;

// Mock scrollIntoView since jsdom doesn't support it
Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// AgentChat Tests
// ============================================================================

import { AgentChat } from "@/components/ai/agent-chat";

describe("AgentChat", () => {
  it("renders open chat button when chat is closed", () => {
    render(<AgentChat />);
    const openButton = screen.getByTitle("Open AI Assistant");
    expect(openButton).toBeInTheDocument();
  });

  it("calls openChat when open button is clicked", () => {
    render(<AgentChat />);
    fireEvent.click(screen.getByTitle("Open AI Assistant"));
    expect(mockOpenChat).toHaveBeenCalledTimes(1);
  });

  it("renders chat panel when isOpen is true", () => {
    mockedUseAgentStore.mockReturnValue({
      isOpen: true,
      selectedAgent: null,
      currentSession: null,
      initialMessage: null,
      openChat: mockOpenChat,
      closeChat: mockCloseChat,
      selectAgent: mockSelectAgent,
      clearInitialMessage: mockClearInitialMessage,
    });

    render(<AgentChat />);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("renders empty state when no messages", () => {
    mockedUseAgentStore.mockReturnValue({
      isOpen: true,
      selectedAgent: null,
      currentSession: null,
      initialMessage: null,
      openChat: mockOpenChat,
      closeChat: mockCloseChat,
      selectAgent: mockSelectAgent,
      clearInitialMessage: mockClearInitialMessage,
    });

    render(<AgentChat />);
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
  });

  it("renders message input when open", () => {
    mockedUseAgentStore.mockReturnValue({
      isOpen: true,
      selectedAgent: null,
      currentSession: null,
      initialMessage: null,
      openChat: mockOpenChat,
      closeChat: mockCloseChat,
      selectAgent: mockSelectAgent,
      clearInitialMessage: mockClearInitialMessage,
    });

    render(<AgentChat />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
  });

  it("renders messages when available", () => {
    mockedUseAgentStore.mockReturnValue({
      isOpen: true,
      selectedAgent: null,
      currentSession: null,
      initialMessage: null,
      openChat: mockOpenChat,
      closeChat: mockCloseChat,
      selectAgent: mockSelectAgent,
      clearInitialMessage: mockClearInitialMessage,
    });

    mockedUseAgentChat.mockReturnValueOnce({
      messages: [
        { id: "1", role: "user", content: "Hello" },
        { id: "2", role: "assistant", content: "Hi there!", agentType: "task" },
      ],
      isLoading: false,
      sendMessage: mockSendMessage,
      suggestedActions: [],
    });

    render(<AgentChat />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("shows agent type label on assistant messages", () => {
    mockedUseAgentStore.mockReturnValue({
      isOpen: true,
      selectedAgent: null,
      currentSession: null,
      initialMessage: null,
      openChat: mockOpenChat,
      closeChat: mockCloseChat,
      selectAgent: mockSelectAgent,
      clearInitialMessage: mockClearInitialMessage,
    });

    mockedUseAgentChat.mockReturnValueOnce({
      messages: [
        { id: "1", role: "assistant", content: "Help text", agentType: "task" },
      ],
      isLoading: false,
      sendMessage: mockSendMessage,
      suggestedActions: [],
    });

    render(<AgentChat />);
    expect(screen.getByText("task Agent")).toBeInTheDocument();
  });

  it("renders close button when open", () => {
    mockedUseAgentStore.mockReturnValue({
      isOpen: true,
      selectedAgent: null,
      currentSession: null,
      initialMessage: null,
      openChat: mockOpenChat,
      closeChat: mockCloseChat,
      selectAgent: mockSelectAgent,
      clearInitialMessage: mockClearInitialMessage,
    });

    render(<AgentChat />);
    expect(screen.getByTitle("Close")).toBeInTheDocument();
  });
});

// ============================================================================
// AIQuickActions Tests
// ============================================================================

import { AIQuickActions } from "@/components/ai/ai-quick-actions";

describe("AIQuickActions", () => {
  it("renders AI Actions button", () => {
    render(<AIQuickActions />);
    expect(screen.getByText("AI Actions")).toBeInTheDocument();
  });

  it("shows dropdown when button is clicked", () => {
    render(<AIQuickActions />);
    fireEvent.click(screen.getByText("AI Actions"));
    expect(screen.getByText("From Text")).toBeInTheDocument();
    expect(screen.getByText("From Document")).toBeInTheDocument();
  });

  it("shows AI agent options in dropdown", () => {
    render(<AIQuickActions />);
    fireEvent.click(screen.getByText("AI Actions"));
    expect(screen.getByText("Task Assistant")).toBeInTheDocument();
    expect(screen.getByText("Planning Assistant")).toBeInTheDocument();
    expect(screen.getByText("Ask Anything")).toBeInTheDocument();
  });

  it("opens chat with task agent when Task Assistant is clicked", () => {
    render(<AIQuickActions />);
    fireEvent.click(screen.getByText("AI Actions"));
    fireEvent.click(screen.getByText("Task Assistant"));
    expect(mockSelectAgent).toHaveBeenCalledWith("task");
    expect(mockOpenChat).toHaveBeenCalled();
  });

  it("opens chat without specific agent when Ask Anything is clicked", () => {
    render(<AIQuickActions />);
    fireEvent.click(screen.getByText("AI Actions"));
    fireEvent.click(screen.getByText("Ask Anything"));
    expect(mockOpenChat).toHaveBeenCalled();
  });
});

// ============================================================================
// GrantFitBadge Tests
// ============================================================================

import { GrantFitBadge, GrantFitBadgeInline } from "@/components/ai/grant-fit-badge";

describe("GrantFitBadge", () => {
  const defaultOpportunity = {
    id: "opp-1",
    title: "NSF Grant",
    agency: "NSF",
    description: "Research funding",
  };

  const defaultProfile = {
    keywords: ["machine learning"],
    recent_projects: ["AI project"],
  };

  it("renders AI Fit Score button initially", () => {
    render(
      <GrantFitBadge opportunity={defaultOpportunity} profile={defaultProfile} />
    );
    expect(screen.getByText("AI Fit Score")).toBeInTheDocument();
  });

  it("shows loading state when calculating", () => {
    mockedUseGrantFitScore.mockReturnValueOnce({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
    });

    render(
      <GrantFitBadge opportunity={defaultOpportunity} profile={defaultProfile} />
    );
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("calls mutate when AI Fit Score button is clicked", () => {
    const mockMutate = vi.fn();
    mockedUseGrantFitScore.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
    });

    render(
      <GrantFitBadge opportunity={defaultOpportunity} profile={defaultProfile} />
    );
    fireEvent.click(screen.getByText("AI Fit Score"));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("supports different sizes", () => {
    const { container: smContainer } = render(
      <GrantFitBadge
        opportunity={defaultOpportunity}
        profile={defaultProfile}
        size="sm"
      />
    );
    expect(smContainer.firstChild).toBeInTheDocument();

    const { container: lgContainer } = render(
      <GrantFitBadge
        opportunity={defaultOpportunity}
        profile={defaultProfile}
        size="lg"
      />
    );
    expect(lgContainer.firstChild).toBeInTheDocument();
  });
});

describe("GrantFitBadgeInline", () => {
  it("renders score percentage", () => {
    render(<GrantFitBadgeInline score={85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<GrantFitBadgeInline score={50} onClick={onClick} />);
    fireEvent.click(screen.getByText("50%"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// ProjectSummary Tests
// ============================================================================

import { ProjectSummary } from "@/components/ai/project-summary";

describe("ProjectSummary", () => {
  const defaultProject = {
    id: "proj-1",
    title: "My Research Project",
    type: "manuscript" as const,
    status: "active",
  };

  it("renders Generate AI Summary button initially", () => {
    render(<ProjectSummary project={defaultProject} />);
    expect(screen.getByText("Generate AI Summary")).toBeInTheDocument();
  });

  it("shows loading state when generating", () => {
    mockedUseProjectSummary.mockReturnValueOnce({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
    });

    render(<ProjectSummary project={defaultProject} />);
    expect(screen.getByText("Analyzing project...")).toBeInTheDocument();
  });

  it("calls mutate when Generate button is clicked", () => {
    const mockMutate = vi.fn();
    mockedUseProjectSummary.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    });

    render(<ProjectSummary project={defaultProject} />);
    fireEvent.click(screen.getByText("Generate AI Summary"));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// TodayAIInsights Tests
// ============================================================================

import TodayAIInsights from "@/components/ai/today-ai-insights";

describe("TodayAIInsights", () => {
  it("renders nothing when all insights are dismissed", () => {
    // With empty tasks, a "no tasks" insight appears. We test that dismissing removes it.
    render(<TodayAIInsights />);
    expect(screen.getByText("No tasks scheduled for today")).toBeInTheDocument();

    // Dismiss the insight
    const dismissBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissBtn);

    // After dismissing, the component returns null
    expect(screen.queryByText("No tasks scheduled for today")).not.toBeInTheDocument();
  });

  it("shows no-tasks insight when no tasks exist", () => {
    render(<TodayAIInsights />);
    expect(screen.getByText("No tasks scheduled for today")).toBeInTheDocument();
  });

  it("shows overdue tasks insight", () => {
    mockedUseTasks.mockReturnValueOnce({
      data: [
        { id: "1", title: "Overdue Task", status: "todo", priority: "p1", due: "2020-01-01" },
      ],
    });

    render(<TodayAIInsights />);
    expect(screen.getByText(/overdue task/)).toBeInTheDocument();
  });

  it("dismisses insight when X is clicked", () => {
    render(<TodayAIInsights />);

    // There should be a dismiss button
    const dismissBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissBtn);

    // After dismissing, the insight should be gone
    expect(screen.queryByText("No tasks scheduled for today")).not.toBeInTheDocument();
  });

  it("opens agent chat when action button is clicked", () => {
    render(<TodayAIInsights />);

    // Find the action button (e.g., "Plan today")
    const actionBtn = screen.getByText("Plan today");
    fireEvent.click(actionBtn);

    expect(mockOpenChat).toHaveBeenCalled();
  });
});

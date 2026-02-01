import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../utils/test-utils";
import {
  PresenceAvatar,
  PresenceAvatars,
} from "@/components/collaboration/presence-avatars";
import {
  TypingIndicator,
  MinimalTypingIndicator,
} from "@/components/collaboration/typing-indicator";
import type { PresenceStatus, UserPresenceWithProfile } from "@scholaros/shared";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/lib/stores/workspace-store", () => ({
  useWorkspaceStore: vi.fn(() => ({
    currentWorkspaceId: "workspace-1",
  })),
}));

vi.mock("@/lib/hooks/use-presence", () => ({
  usePresence: vi.fn(() => ({
    data: [
      {
        user_id: "user-1",
        status: "online" as PresenceStatus,
        user: { full_name: "Alice Johnson", avatar_url: null },
      },
      {
        user_id: "user-2",
        status: "away" as PresenceStatus,
        user: { full_name: "Bob Smith", avatar_url: null },
      },
    ],
    isLoading: false,
  })),
}));

vi.mock("@/lib/stores/chat-store", () => ({
  useChatStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      typingUsers: {},
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
  selectCurrentTypingUsers: vi.fn(() => []),
}));

// Mock Radix UI components to avoid portal issues
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ alt }: { alt?: string; src?: string }) => (
    <img data-testid="avatar-image" alt={alt} />
  ),
  AvatarFallback: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="avatar-fallback" className={className}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div>{children}</div>,
  TooltipContent: ({
    children,
  }: {
    children: React.ReactNode;
    side?: string;
  }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ============================================================================
// Test Data
// ============================================================================

function createPresenceUser(overrides: Partial<UserPresenceWithProfile> = {}): UserPresenceWithProfile {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    workspace_id: "workspace-1",
    status: "online" as PresenceStatus,
    custom_status: null,
    last_seen_at: new Date().toISOString(),
    current_page: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "user-1",
      full_name: "Alice Johnson",
      avatar_url: null,
      email: "alice@test.com",
    },
    ...overrides,
  } as UserPresenceWithProfile;
}

// ============================================================================
// PresenceAvatar Tests
// ============================================================================

describe("PresenceAvatar", () => {
  it("renders avatar with initials", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice Johnson"
        status="online"
      />
    );
    expect(screen.getByText("AJ")).toBeInTheDocument();
  });

  it("renders single initial for single name", () => {
    render(
      <PresenceAvatar userId="user-1" name="Alice" status="online" />
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders status dot when showStatus is true", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice"
        status="online"
        showStatus
      />
    );
    const statusDot = screen.getByLabelText("Online");
    expect(statusDot).toBeInTheDocument();
  });

  it("does not render status dot when showStatus is false", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice"
        status="online"
        showStatus={false}
      />
    );
    expect(screen.queryByLabelText("Online")).not.toBeInTheDocument();
  });

  it("renders tooltip with name", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice Johnson"
        status="online"
        showTooltip
      />
    );
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  it("does not render tooltip when showTooltip is false", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice Johnson"
        status="online"
        showTooltip={false}
      />
    );
    expect(
      screen.queryByTestId("tooltip-content")
    ).not.toBeInTheDocument();
  });

  it("renders correct status label for away", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice"
        status="away"
        showStatus
      />
    );
    expect(screen.getByLabelText("Away")).toBeInTheDocument();
  });

  it("renders correct status label for dnd", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice"
        status="dnd"
        showStatus
      />
    );
    expect(screen.getByLabelText("Do Not Disturb")).toBeInTheDocument();
  });

  it("renders correct status label for offline", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice"
        status="offline"
        showStatus
      />
    );
    expect(screen.getByLabelText("Offline")).toBeInTheDocument();
  });

  it("renders custom status text in tooltip", () => {
    render(
      <PresenceAvatar
        userId="user-1"
        name="Alice"
        status="online"
        customStatus="In a meeting"
        showTooltip
      />
    );
    expect(screen.getByText("In a meeting")).toBeInTheDocument();
  });
});

// ============================================================================
// PresenceAvatars (group) Tests
// ============================================================================

describe("PresenceAvatars", () => {
  const onlineUsers = [
    createPresenceUser({
      user_id: "user-1",
      status: "online",
      user: { id: "user-1", full_name: "Alice", avatar_url: null, email: "a@t.com" },
    }),
    createPresenceUser({
      user_id: "user-2",
      status: "online",
      user: { id: "user-2", full_name: "Bob", avatar_url: null, email: "b@t.com" },
    }),
    createPresenceUser({
      user_id: "user-3",
      status: "away",
      user: { id: "user-3", full_name: "Charlie", avatar_url: null, email: "c@t.com" },
    }),
  ];

  it("renders nothing when no users", () => {
    const { container } = render(
      <PresenceAvatars users={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders avatars for online/away users", () => {
    render(<PresenceAvatars users={onlineUsers} />);
    const avatars = screen.getAllByTestId("avatar");
    expect(avatars.length).toBeGreaterThanOrEqual(3);
  });

  it("shows online count text", () => {
    render(<PresenceAvatars users={onlineUsers} showCount />);
    expect(screen.getByText("3 online")).toBeInTheDocument();
  });

  it("hides count when showCount is false", () => {
    render(
      <PresenceAvatars users={onlineUsers} showCount={false} />
    );
    expect(screen.queryByText(/online/)).not.toBeInTheDocument();
  });

  it("limits visible avatars to maxVisible", () => {
    const manyUsers = Array.from({ length: 8 }, (_, i) =>
      createPresenceUser({
        user_id: `user-${i}`,
        status: "online",
        user: {
          id: `user-${i}`,
          full_name: `User ${i}`,
          avatar_url: null,
          email: `u${i}@t.com`,
        },
      })
    );
    render(<PresenceAvatars users={manyUsers} maxVisible={3} />);
    // Should show "+5" overflow indicator
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("filters out offline users when showOnlineOnly is true", () => {
    const mixedUsers = [
      ...onlineUsers,
      createPresenceUser({
        user_id: "user-4",
        status: "offline",
        user: { id: "user-4", full_name: "Dave", avatar_url: null, email: "d@t.com" },
      }),
    ];
    render(
      <PresenceAvatars users={mixedUsers} showOnlineOnly showCount />
    );
    // Only 3 online/away users, not 4
    expect(screen.getByText("3 online")).toBeInTheDocument();
  });
});

// ============================================================================
// TypingIndicator Tests
// ============================================================================

describe("TypingIndicator", () => {
  it("renders nothing when no users are typing", () => {
    const { container } = render(
      <TypingIndicator typingUserIds={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders single user typing message", () => {
    render(
      <TypingIndicator typingUserIds={["user-1"]} />
    );
    // User name comes from the usePresence mock via useUserNames
    expect(screen.getByText(/is typing/)).toBeInTheDocument();
  });

  it("renders two users typing message", () => {
    render(
      <TypingIndicator typingUserIds={["user-1", "user-2"]} />
    );
    expect(screen.getByText(/are typing/)).toBeInTheDocument();
  });

  it("has correct role and aria-live attributes", () => {
    render(
      <TypingIndicator typingUserIds={["user-1"]} />
    );
    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute("aria-live", "polite");
  });

  it("renders typing dots", () => {
    const { container } = render(
      <TypingIndicator typingUserIds={["user-1"]} />
    );
    // Three bounce dots
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(3);
  });
});

// ============================================================================
// MinimalTypingIndicator Tests
// ============================================================================

describe("MinimalTypingIndicator", () => {
  it("renders nothing when not typing", () => {
    const { container } = render(
      <MinimalTypingIndicator isTyping={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dots when typing", () => {
    const { container } = render(
      <MinimalTypingIndicator isTyping />
    );
    expect(container.firstChild).not.toBeNull();
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(3);
  });

  it("renders user name when provided", () => {
    render(
      <MinimalTypingIndicator isTyping userName="Alice" />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("does not render user name when absent", () => {
    render(<MinimalTypingIndicator isTyping />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("has correct accessibility attributes", () => {
    render(<MinimalTypingIndicator isTyping />);
    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute("aria-live", "polite");
  });
});

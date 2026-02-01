import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "../utils/test-utils";

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

vi.mock("lucide-react", () => ({
  Search: ({ className }: { className?: string }) => <span data-testid="icon-search" className={className} />,
  FileText: ({ className }: { className?: string }) => <span data-testid="icon-file" className={className} />,
  FolderKanban: ({ className }: { className?: string }) => <span data-testid="icon-folder" className={className} />,
  GraduationCap: ({ className }: { className?: string }) => <span data-testid="icon-grad" className={className} />,
  BookOpen: ({ className }: { className?: string }) => <span data-testid="icon-book" className={className} />,
  ArrowRight: ({ className }: { className?: string }) => <span data-testid="icon-arrow" className={className} />,
  Clock: ({ className }: { className?: string }) => <span data-testid="icon-clock" className={className} />,
  Trash2: ({ className }: { className?: string }) => <span data-testid="icon-trash" className={className} />,
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="icon-loader" className={className} />,
  Sparkles: ({ className }: { className?: string }) => <span data-testid="icon-sparkles" className={className} />,
}));

const mockClearHistoryMutate = vi.fn();

vi.mock("@/lib/hooks/use-search", () => ({
  useSearch: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useSearchHistory: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
  useRecordSearchHistory: vi.fn(() => ({
    mutate: vi.fn(),
  })),
  useClearSearchHistory: vi.fn(() => ({
    mutate: mockClearHistoryMutate,
    isPending: false,
  })),
}));

vi.mock("@/lib/stores/analytics-store", () => ({
  useAnalyticsStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      openSearchSession: vi.fn(),
      closeSearchSession: vi.fn(() => ({
        openedAt: Date.now(),
        queriesEntered: 0,
        resultsSelected: 0,
      })),
      recordSearchQuery: vi.fn(),
      recordSearchSelection: vi.fn(),
      searchSession: {
        openedAt: Date.now(),
        queriesEntered: 0,
        resultsSelected: 0,
      },
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

vi.mock("@/lib/hooks/use-analytics-events", () => ({
  useAnalyticsEvents: vi.fn(() => ({
    trackSearchOpened: vi.fn(),
    trackSearchQueryEntered: vi.fn(),
    trackSearchResultSelected: vi.fn(),
    trackSearchClosed: vi.fn(),
    trackSearchNoResults: vi.fn(),
  })),
}));

vi.mock("@/lib/hooks/use-debounce", () => ({
  useDebounce: vi.fn((value: string) => value),
}));

// Import mocked modules for dynamic overrides
import { useSearchHistory } from "@/lib/hooks/use-search";
const mockedUseSearchHistory = useSearchHistory as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// CommandPaletteTrigger Tests
// ============================================================================

import { CommandPaletteTrigger } from "@/components/search/command-palette";

describe("CommandPaletteTrigger", () => {
  it("renders search button", () => {
    render(<CommandPaletteTrigger />);
    expect(screen.getByText("Search...")).toBeInTheDocument();
  });

  it("shows keyboard shortcut", () => {
    render(<CommandPaletteTrigger />);
    expect(screen.getByText(/K/)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<CommandPaletteTrigger className="my-class" />);
    expect(container.querySelector("button")).toHaveClass("my-class");
  });
});

// ============================================================================
// CommandPalette Tests
// ============================================================================

import { CommandPalette } from "@/components/search/command-palette";

describe("CommandPalette", () => {
  // The CommandPalette has internal isOpen state that starts as false.
  // We need to test it in the context where it's already rendered (isOpen in parent).
  // Since it renders null when not open internally, we test what we can.

  it("renders null initially (internal isOpen is false)", () => {
    const { container } = render(<CommandPalette />);
    expect(container.firstChild).toBeNull();
  });
});

// ============================================================================
// CommandPaletteProvider Tests
// ============================================================================

import { CommandPaletteProvider } from "@/components/search/command-palette";

describe("CommandPaletteProvider", () => {
  it("renders children", () => {
    render(
      <CommandPaletteProvider>
        <div data-testid="child">Child content</div>
      </CommandPaletteProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

// ============================================================================
// RecentSearches Tests
// ============================================================================

import { RecentSearches, SearchSuggestions } from "@/components/search/recent-searches";

describe("RecentSearches", () => {
  it("shows loading spinner when loading", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
    });

    const { container } = render(
      <RecentSearches onSelectSearch={vi.fn()} />
    );
    expect(container.querySelector("[data-testid='icon-loader']")).toBeInTheDocument();
  });

  it("shows empty state when no searches", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: { searches: [] },
      isLoading: false,
      isError: false,
    });

    render(<RecentSearches onSelectSearch={vi.fn()} />);
    expect(screen.getByText("No recent searches")).toBeInTheDocument();
  });

  it("shows empty state on error", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
    });

    render(<RecentSearches onSelectSearch={vi.fn()} />);
    expect(screen.getByText("No recent searches")).toBeInTheDocument();
  });

  it("renders recent search items", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: {
        searches: [
          { query: "machine learning", result_type: "task", result_title: "ML Task" },
          { query: "grant deadline", result_type: "grant", result_title: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<RecentSearches onSelectSearch={vi.fn()} />);
    expect(screen.getByText("machine learning")).toBeInTheDocument();
    expect(screen.getByText("grant deadline")).toBeInTheDocument();
    expect(screen.getByText("ML Task")).toBeInTheDocument();
  });

  it("calls onSelectSearch when a recent search is clicked", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: {
        searches: [
          { query: "test query", result_type: "task", result_title: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    const onSelectSearch = vi.fn();
    render(<RecentSearches onSelectSearch={onSelectSearch} />);
    fireEvent.click(screen.getByText("test query"));
    expect(onSelectSearch).toHaveBeenCalledWith("test query");
  });

  it("renders Clear button", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: {
        searches: [
          { query: "test", result_type: "task", result_title: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<RecentSearches onSelectSearch={vi.fn()} />);
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("calls clearHistory when Clear is clicked", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: {
        searches: [
          { query: "test", result_type: "task", result_title: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<RecentSearches onSelectSearch={vi.fn()} />);
    fireEvent.click(screen.getByText("Clear"));
    expect(mockClearHistoryMutate).toHaveBeenCalled();
  });

  it("renders result type labels", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: {
        searches: [
          { query: "paper", result_type: "publication", result_title: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<RecentSearches onSelectSearch={vi.fn()} />);
    expect(screen.getByText("Publication")).toBeInTheDocument();
  });

  it("highlights selected index", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: {
        searches: [
          { query: "first", result_type: "task", result_title: null },
          { query: "second", result_type: "task", result_title: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    const { container } = render(
      <RecentSearches onSelectSearch={vi.fn()} selectedIndex={1} />
    );
    // The second item should have the selected class
    const buttons = container.querySelectorAll("button");
    // First button is Clear, then the search items
    expect(buttons[2]).toHaveClass("bg-accent");
  });

  it("applies custom className", () => {
    mockedUseSearchHistory.mockReturnValueOnce({
      data: { searches: [] },
      isLoading: false,
      isError: false,
    });

    const { container } = render(
      <RecentSearches onSelectSearch={vi.fn()} className="custom-cls" />
    );
    expect(container.firstChild).toHaveClass("custom-cls");
  });
});

// ============================================================================
// SearchSuggestions Tests
// ============================================================================

describe("SearchSuggestions", () => {
  it("returns null when query is empty", () => {
    const { container } = render(
      <SearchSuggestions query="" onSelectSuggestion={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders matching suggestions", () => {
    render(
      <SearchSuggestions query="over" onSelectSuggestion={vi.fn()} />
    );
    expect(screen.getByText("overdue")).toBeInTheDocument();
    expect(screen.getByText("Find overdue tasks")).toBeInTheDocument();
  });

  it("returns null when no matches", () => {
    const { container } = render(
      <SearchSuggestions query="zzzzzzz" onSelectSuggestion={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onSelectSuggestion when suggestion is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SearchSuggestions query="gra" onSelectSuggestion={onSelect} />
    );
    fireEvent.click(screen.getByText("grant"));
    expect(onSelect).toHaveBeenCalledWith("grant");
  });

  it("does not show suggestion that exactly matches query", () => {
    const { container } = render(
      <SearchSuggestions query="overdue" onSelectSuggestion={vi.fn()} />
    );
    // "overdue" exactly matches the pattern, so it should be filtered out
    expect(container.firstChild).toBeNull();
  });
});

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  FolderKanban,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Clock,
  Trash2,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSearch,
  useSearchHistory,
  useRecordSearchHistory,
  useClearSearchHistory,
  type SearchResult,
} from "@/lib/hooks/use-search";
import { useAnalyticsStore } from "@/lib/stores/analytics-store";
import { useAnalyticsEvents } from "@/lib/hooks/use-analytics-events";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { SearchResultType } from "@scholaros/shared/types";

// ============================================================================
// Navigation Items (Quick Actions)
// ============================================================================

interface NavigationItem {
  id: string;
  title: string;
  type: "navigation" | "action";
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "nav-today",
    title: "Today",
    type: "navigation",
    href: "/today",
    icon: FileText,
    keywords: ["today", "daily", "tasks"],
  },
  {
    id: "nav-upcoming",
    title: "Upcoming",
    type: "navigation",
    href: "/upcoming",
    icon: FileText,
    keywords: ["upcoming", "future", "schedule"],
  },
  {
    id: "nav-board",
    title: "Kanban Board",
    type: "navigation",
    href: "/board",
    icon: FolderKanban,
    keywords: ["board", "kanban", "drag"],
  },
  {
    id: "nav-projects",
    title: "Projects",
    type: "navigation",
    href: "/projects",
    icon: FolderKanban,
    keywords: ["projects", "manuscripts", "papers"],
  },
  {
    id: "nav-grants",
    title: "Grants",
    type: "navigation",
    href: "/grants",
    icon: GraduationCap,
    keywords: ["grants", "funding", "opportunities"],
  },
  {
    id: "nav-publications",
    title: "Publications",
    type: "navigation",
    href: "/publications",
    icon: BookOpen,
    keywords: ["publications", "papers", "articles"],
  },
];

// ============================================================================
// Result Type Icons & Labels
// ============================================================================

const TYPE_CONFIG: Record<
  SearchResultType | "navigation" | "action",
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  task: { icon: FileText, label: "Task", color: "text-blue-500" },
  project: { icon: FolderKanban, label: "Project", color: "text-purple-500" },
  grant: { icon: GraduationCap, label: "Grant", color: "text-green-500" },
  publication: { icon: BookOpen, label: "Publication", color: "text-amber-500" },
  navigation: { icon: ArrowRight, label: "Navigate", color: "text-muted-foreground" },
  action: { icon: Sparkles, label: "Action", color: "text-pink-500" },
};

// ============================================================================
// Command Palette Component
// ============================================================================

interface CommandPaletteProps {
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ onOpenChange }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce search query
  const debouncedQuery = useDebounce(query, 200);

  // Analytics
  const {
    openSearchSession,
    closeSearchSession,
    recordSearchQuery,
    recordSearchSelection,
  } = useAnalyticsStore();
  const {
    trackSearchOpened,
    trackSearchQueryEntered,
    trackSearchResultSelected,
    trackSearchClosed,
    trackSearchNoResults,
  } = useAnalyticsEvents();
  const searchSession = useAnalyticsStore((s) => s.searchSession);

  // Search hooks
  const {
    data: searchResults,
    isLoading: isSearching,
  } = useSearch(debouncedQuery, {
    enabled: isOpen && debouncedQuery.length >= 1,
    context: typeof window !== "undefined" ? window.location.pathname : "/today",
  });

  const { data: historyData } = useSearchHistory({
    enabled: isOpen && debouncedQuery.length === 0,
    limit: 5,
  });

  const recordHistory = useRecordSearchHistory();
  const clearHistory = useClearSearchHistory();

  // Filter navigation items by query
  const filteredNavigation = useMemo(() =>
    query
      ? NAVIGATION_ITEMS.filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.keywords.some((kw) => kw.toLowerCase().includes(query.toLowerCase()))
        )
      : [],
    [query]
  );

  // Combine all results
  const allResults = useMemo<(SearchResult | NavigationItem)[]>(() => [
    ...(searchResults?.results || []),
    ...filteredNavigation,
  ], [searchResults?.results, filteredNavigation]);

  // Show recent searches when no query
  const recentSearches = historyData?.searches || [];

  // Handle open/close
  const handleOpen = useCallback((trigger: "keyboard_shortcut" | "click" | "programmatic") => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
    openSearchSession(trigger);
    trackSearchOpened(trigger);
    onOpenChange?.(true);
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [openSearchSession, trackSearchOpened, onOpenChange]);

  const handleClose = useCallback((trigger: "escape" | "click_outside" | "selection" | "navigation") => {
    const session = closeSearchSession();
    const duration = session.openedAt ? Date.now() - session.openedAt : 0;
    trackSearchClosed(
      trigger,
      session.queriesEntered,
      session.resultsSelected,
      duration
    );
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
    onOpenChange?.(false);
  }, [closeSearchSession, trackSearchClosed, onOpenChange]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          handleClose("escape");
        } else {
          handleOpen("keyboard_shortcut");
        }
      }

      // Escape to close
      if (e.key === "Escape" && isOpen) {
        handleClose("escape");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleOpen, handleClose]);

  // Track query changes
  useEffect(() => {
    if (debouncedQuery && isOpen && searchSession.openedAt) {
      const isModification = searchSession.queriesEntered > 0;
      const timeSinceOpen = Date.now() - searchSession.openedAt;
      recordSearchQuery(debouncedQuery);
      trackSearchQueryEntered(debouncedQuery, isModification, timeSinceOpen);
    }
  }, [debouncedQuery, isOpen, searchSession.openedAt, searchSession.queriesEntered, recordSearchQuery, trackSearchQueryEntered]);

  // Track no results
  useEffect(() => {
    if (
      debouncedQuery &&
      !isSearching &&
      searchResults &&
      searchResults.results.length === 0 &&
      filteredNavigation.length === 0
    ) {
      trackSearchNoResults(debouncedQuery);
    }
  }, [debouncedQuery, isSearching, searchResults, filteredNavigation.length, trackSearchNoResults]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query ? allResults : recentSearches;
    const maxIndex = items.length - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case "Enter":
        e.preventDefault();
        if (query && allResults[selectedIndex]) {
          handleSelectResult(allResults[selectedIndex]);
        } else if (!query && recentSearches[selectedIndex]) {
          setQuery(recentSearches[selectedIndex].query);
        }
        break;
    }
  };

  // Handle result selection
  const handleSelectResult = useCallback(
    (result: SearchResult | NavigationItem) => {
      const isNav = "href" in result;
      const resultType = isNav ? "navigation" : (result as SearchResult).type;
      const resultPosition = allResults.indexOf(result) + 1;
      const timeToSelect = searchSession.openedAt
        ? Date.now() - searchSession.openedAt
        : 0;

      // Track selection
      recordSearchSelection(resultType as SearchResultType);
      trackSearchResultSelected(
        resultType as SearchResultType,
        resultPosition,
        allResults.length,
        timeToSelect
      );

      // Record to history
      if (query) {
        recordHistory.mutate({
          query,
          result_type: resultType as SearchResultType,
          result_id: result.id,
          result_title: result.title,
          source: "command_palette",
          selected: true,
        });
      }

      // Navigate
      if (isNav && (result as NavigationItem).href) {
        router.push((result as NavigationItem).href!);
      } else if (!isNav) {
        // Navigate to entity detail page
        const entityRoutes: Record<SearchResultType, string> = {
          task: "/today",
          project: "/projects",
          grant: "/grants",
          publication: "/publications",
          navigation: "/",
          action: "/",
        };
        const route = entityRoutes[(result as SearchResult).type];
        if (route) {
          // Encode the ID to prevent URL parameter injection
          router.push(`${route}?highlight=${encodeURIComponent(result.id)}`);
        }
      }

      handleClose("selection");
    },
    [allResults, searchSession.openedAt, query, recordHistory, router, handleClose, recordSearchSelection, trackSearchResultSelected]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={() => handleClose("click_outside")}
        aria-hidden="true"
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 animate-in fade-in-0 slide-in-from-top-4 duration-200">
        <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, projects, grants, or navigate..."
              className="flex-1 bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground"
              aria-label="Search"
              aria-autocomplete="list"
              aria-controls="command-list"
              aria-activedescendant={
                query
                  ? `result-${selectedIndex}`
                  : recentSearches.length > 0
                  ? `recent-${selectedIndex}`
                  : undefined
              }
            />
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <button
              onClick={() => handleClose("escape")}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            id="command-list"
            role="listbox"
            className="max-h-[400px] overflow-y-auto p-2"
          >
            {/* Recent Searches (when no query) */}
            {!query && recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Recent Searches
                  </span>
                  <button
                    onClick={() => clearHistory.mutate()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    disabled={clearHistory.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={`recent-${search.query}-${index}`}
                    id={`recent-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={selectedIndex === index}
                    onClick={() => setQuery(search.query)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      selectedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{search.query}</span>
                    {search.result_type && (
                      <span className="text-xs text-muted-foreground">
                        {TYPE_CONFIG[search.result_type]?.label}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No query and no recent searches */}
            {!query && recentSearches.length === 0 && (
              <div className="px-3 py-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Start typing to search...
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Search tasks, projects, grants, publications, or navigate
                </p>
              </div>
            )}

            {/* Search Results */}
            {query && allResults.length > 0 && (
              <div>
                {/* Group results by type */}
                {(() => {
                  const groups: Record<string, (SearchResult | NavigationItem)[]> = {};
                  allResults.forEach((result) => {
                    const type = "href" in result ? "navigation" : result.type;
                    if (!groups[type]) groups[type] = [];
                    groups[type].push(result);
                  });

                  return Object.entries(groups).map(([type, items]) => (
                    <div key={type}>
                      <div className="px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {TYPE_CONFIG[type as SearchResultType]?.label || type}
                        </span>
                      </div>
                      {items.map((result) => {
                        const globalIndex = allResults.indexOf(result);
                        const config = TYPE_CONFIG[type as SearchResultType] || TYPE_CONFIG.navigation;
                        const Icon = config.icon;

                        return (
                          <button
                            key={result.id}
                            id={`result-${globalIndex}`}
                            data-index={globalIndex}
                            role="option"
                            aria-selected={selectedIndex === globalIndex}
                            onClick={() => handleSelectResult(result)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              selectedIndex === globalIndex
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted",
                                config.color
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium">
                                {result.title}
                              </p>
                              {"description" in result && result.description && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {result.description}
                                </p>
                              )}
                            </div>
                            {!("href" in result) && (result as SearchResult)._score !== undefined && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Sparkles className="h-3 w-3" />
                                {((result as SearchResult)._score! * 10).toFixed(1)}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* No Results */}
            {query && !isSearching && allResults.length === 0 && (
              <div className="px-3 py-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No results found for &ldquo;{query}&rdquo;
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Try a different search term
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  esc
                </kbd>
                Close
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
              Toggle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Command Palette Trigger
// ============================================================================

interface CommandPaletteTriggerProps {
  className?: string;
}

export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { openSearchSession } = useAnalyticsStore();
  const { trackSearchOpened } = useAnalyticsEvents();

  const handleClick = () => {
    openSearchSession("click");
    trackSearchOpened("click");
    // Dispatch a custom event to open the command palette
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="ml-auto hidden rounded bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

// ============================================================================
// Command Palette Provider
// ============================================================================

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { openSearchSession } = useAnalyticsStore();
  const { trackSearchOpened } = useAnalyticsEvents();

  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
    };

    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => window.removeEventListener("open-command-palette", handleOpenEvent);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          openSearchSession("keyboard_shortcut");
          trackSearchOpened("keyboard_shortcut");
        }
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openSearchSession, trackSearchOpened]);

  return (
    <>
      {children}
      {isOpen && <CommandPalette onOpenChange={setIsOpen} />}
    </>
  );
}

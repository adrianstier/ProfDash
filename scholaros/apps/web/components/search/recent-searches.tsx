"use client";

import { Clock, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchHistory, useClearSearchHistory } from "@/lib/hooks/use-search";
import type { SearchResultType, RecentSearch } from "@scholaros/shared/types";

// ============================================================================
// Recent Search Item
// ============================================================================

interface RecentSearchItemProps {
  search: RecentSearch;
  onSelect: (query: string) => void;
  isSelected?: boolean;
}

function RecentSearchItem({ search, onSelect, isSelected }: RecentSearchItemProps) {
  const typeLabels: Record<SearchResultType, string> = {
    task: "Task",
    project: "Project",
    grant: "Grant",
    publication: "Publication",
    navigation: "Page",
    action: "Action",
  };

  return (
    <button
      onClick={() => onSelect(search.query)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors group",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
    >
      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm">{search.query}</p>
        {search.result_title && (
          <p className="truncate text-xs text-muted-foreground">
            {search.result_title}
          </p>
        )}
      </div>
      {search.result_type && (
        <span className="text-xs text-muted-foreground">
          {typeLabels[search.result_type]}
        </span>
      )}
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ============================================================================
// Recent Searches List
// ============================================================================

interface RecentSearchesProps {
  onSelectSearch: (query: string) => void;
  selectedIndex?: number;
  limit?: number;
  className?: string;
}

export function RecentSearches({
  onSelectSearch,
  selectedIndex,
  limit = 5,
  className,
}: RecentSearchesProps) {
  const { data, isLoading, isError } = useSearchHistory({ limit });
  const clearHistory = useClearSearchHistory();

  if (isLoading) {
    return (
      <div className={cn("px-3 py-8 text-center", className)}>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data || data.searches.length === 0) {
    return (
      <div className={cn("px-3 py-8 text-center", className)}>
        <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No recent searches</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Your search history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Recent Searches
        </span>
        <button
          onClick={() => clearHistory.mutate()}
          disabled={clearHistory.isPending}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {clearHistory.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          Clear
        </button>
      </div>
      <div className="space-y-1">
        {data.searches.map((search, index) => (
          <RecentSearchItem
            key={`${search.query}-${index}`}
            search={search}
            onSelect={onSelectSearch}
            isSelected={selectedIndex === index}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Search Suggestions
// ============================================================================

interface SearchSuggestionsProps {
  query: string;
  onSelectSuggestion: (suggestion: string) => void;
  className?: string;
}

const COMMON_SEARCH_PATTERNS = [
  { pattern: "overdue", description: "Find overdue tasks" },
  { pattern: "this week", description: "Tasks due this week" },
  { pattern: "high priority", description: "P1 and P2 tasks" },
  { pattern: "grant", description: "Grant opportunities" },
  { pattern: "manuscript", description: "Active manuscripts" },
];

export function SearchSuggestions({
  query,
  onSelectSuggestion,
  className,
}: SearchSuggestionsProps) {
  // Filter suggestions based on query
  const suggestions = COMMON_SEARCH_PATTERNS.filter(
    (s) =>
      s.pattern.toLowerCase().includes(query.toLowerCase()) &&
      s.pattern.toLowerCase() !== query.toLowerCase()
  ).slice(0, 3);

  if (query.length === 0 || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Suggestions
        </span>
      </div>
      <div className="space-y-1">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.pattern}
            onClick={() => onSelectSuggestion(suggestion.pattern)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted"
          >
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{suggestion.pattern}</p>
              <p className="text-xs text-muted-foreground">
                {suggestion.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

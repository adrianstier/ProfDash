"use client";

import { useState } from "react";
import {
  Search,
  Wallet,
  ExternalLink,
  DollarSign,
  Calendar,
  Loader2,
  Star,
  BookmarkPlus,
  Filter,
  X,
  Eye,
  Bell,
  Trash2,
  Upload,
  Sparkles,
  Bot,
  FileText,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import {
  useGrantSearch,
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useSavedSearches,
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useCreateOpportunity,
  type FundingOpportunityFromAPI,
  type GrantSearchFilters,
} from "@/lib/hooks/use-grants";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useAgentStore } from "@/lib/stores/agent-store";
import { GrantFitBadge } from "@/components/ai";
import { GrantDocumentModal } from "@/components/grants/grant-document-modal";
import { cn } from "@/lib/utils";

type TabType = "discover" | "watchlist" | "saved";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "No deadline";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const deadline = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Opportunity Card Component
function OpportunityCard({
  opportunity,
  onAddToWatchlist,
  isInWatchlist,
  isAdding,
}: {
  opportunity: FundingOpportunityFromAPI;
  onAddToWatchlist: () => void;
  isInWatchlist: boolean;
  isAdding: boolean;
}) {
  const daysUntil = getDaysUntil(opportunity.deadline);
  const isUrgent = daysUntil !== null && daysUntil < 14;
  const isSoon = daysUntil !== null && daysUntil < 30;

  return (
    <div className="group rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{opportunity.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                {opportunity.agency && (
                  <span className="font-medium">{opportunity.agency}</span>
                )}
                {opportunity.opportunity_number && (
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                    #{opportunity.opportunity_number}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isInWatchlist ? (
                <button
                  onClick={onAddToWatchlist}
                  disabled={isAdding}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                  title="Add to watchlist"
                >
                  {isAdding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-3.5 w-3.5" />
                  )}
                  Watch
                </button>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Watching
                </span>
              )}
              {opportunity.url && (
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  title="View on Grants.gov"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
          {opportunity.description && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {opportunity.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {(opportunity.award_ceiling || opportunity.amount_max) && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                <DollarSign className="h-3.5 w-3.5" />
                Up to {formatCurrency(opportunity.award_ceiling || opportunity.amount_max || 0)}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                isUrgent
                  ? "bg-priority-p1-light text-priority-p1"
                  : isSoon
                  ? "bg-priority-p2-light text-priority-p2"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(opportunity.deadline)}
              {daysUntil !== null && daysUntil >= 0 && (
                <span>({daysUntil}d)</span>
              )}
            </span>
            {opportunity.funding_instrument_type && (
              <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {opportunity.funding_instrument_type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GrantsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<GrantSearchFilters>({});
  const [saveSearchName, setSaveSearchName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { currentWorkspaceId } = useWorkspaceStore();

  // Combine search query with filters
  const searchFilters: GrantSearchFilters = {
    ...filters,
    keywords: searchQuery || undefined,
  };

  const hasActiveSearch = Boolean(searchQuery || Object.keys(filters).length > 0);

  // Queries
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useGrantSearch(searchFilters, hasActiveSearch);

  const { data: watchlist, isLoading: watchlistLoading } = useWatchlist(currentWorkspaceId);
  const { data: savedSearches, isLoading: savedSearchesLoading } = useSavedSearches(currentWorkspaceId);

  // Mutations
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const createSavedSearch = useCreateSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();
  const createOpportunity = useCreateOpportunity();

  const watchlistOpportunityIds = new Set(watchlist?.map((w) => w.opportunity_id) || []);

  const handleAddToWatchlist = (opportunityId: string) => {
    if (!currentWorkspaceId) return;
    addToWatchlist.mutate({
      workspace_id: currentWorkspaceId,
      opportunity_id: opportunityId,
    });
  };

  const handleSaveSearch = () => {
    if (!currentWorkspaceId || !saveSearchName.trim()) return;
    createSavedSearch.mutate(
      {
        workspace_id: currentWorkspaceId,
        name: saveSearchName.trim(),
        query: searchFilters,
        alert_frequency: "weekly",
      },
      {
        onSuccess: () => {
          setSaveSearchName("");
          setShowSaveModal(false);
        },
      }
    );
  };

  const handleLoadSavedSearch = (query: GrantSearchFilters) => {
    setSearchQuery(query.keywords || "");
    setFilters({
      agency: query.agency,
      funding_type: query.funding_type,
      amount_min: query.amount_min,
      amount_max: query.amount_max,
      deadline_from: query.deadline_from,
      deadline_to: query.deadline_to,
    });
    setActiveTab("discover");
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/5 via-primary/5 to-green-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 shadow-sm">
              <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Grant Discovery
              </h1>
              <p className="text-muted-foreground">
                Search funding opportunities and track applications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GrantAgentButton />
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex items-center gap-2 animate-fade-in stagger-1">
        <button
          onClick={() => setActiveTab("discover")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
            activeTab === "discover"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Search className="h-4 w-4" />
          Discover
        </button>
        <button
          onClick={() => setActiveTab("watchlist")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
            activeTab === "watchlist"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Eye className="h-4 w-4" />
          Watchlist
          {watchlist && watchlist.length > 0 && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              activeTab === "watchlist"
                ? "bg-white/20"
                : "bg-primary/10 text-primary"
            )}>
              {watchlist.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
            activeTab === "saved"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Bell className="h-4 w-4" />
          Saved Searches
        </button>
      </nav>

      {/* Discover Tab */}
      {activeTab === "discover" && (
        <section className="space-y-5 animate-fade-in stagger-2">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search grants by keyword, agency, topic..."
                className="input-base pl-11"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                showFilters
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "hover:bg-muted hover:border-border"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                showFilters && "rotate-180"
              )} />
            </button>
            {hasActiveSearch && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <BookmarkPlus className="h-4 w-4" />
                Save Search
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="rounded-2xl border bg-card p-5 animate-slide-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                {Object.keys(filters).length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agency</label>
                  <input
                    type="text"
                    value={filters.agency || ""}
                    onChange={(e) => setFilters({ ...filters, agency: e.target.value || undefined })}
                    placeholder="e.g., NSF, NIH, DOE"
                    className="input-base py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Amount</label>
                  <input
                    type="number"
                    value={filters.amount_min || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, amount_min: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="$0"
                    className="input-base py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Amount</label>
                  <input
                    type="number"
                    value={filters.amount_max || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, amount_max: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="No limit"
                    className="input-base py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deadline After</label>
                  <input
                    type="date"
                    value={filters.deadline_from || ""}
                    onChange={(e) => setFilters({ ...filters, deadline_from: e.target.value || undefined })}
                    className="input-base py-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Searching opportunities...</p>
            </div>
          )}

          {searchError && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Failed to search opportunities. Please try again.
              </div>
            </div>
          )}

          {!isSearching && !hasActiveSearch && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">Search for funding opportunities</p>
              <p className="text-sm text-muted-foreground mt-1">Enter keywords or apply filters to find grants</p>
            </div>
          )}

          {!isSearching && hasActiveSearch && searchResults && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Found <span className="text-foreground font-semibold">{searchResults.total}</span> opportunities
                </span>
              </div>
              <div className="space-y-4">
                {searchResults.opportunities.map((opportunity, i) => (
                  <div
                    key={opportunity.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <OpportunityCard
                      opportunity={opportunity}
                      onAddToWatchlist={() => handleAddToWatchlist(opportunity.id)}
                      isInWatchlist={watchlistOpportunityIds.has(opportunity.id)}
                      isAdding={addToWatchlist.isPending}
                    />
                  </div>
                ))}
                {searchResults.opportunities.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
                    <p className="text-muted-foreground">No opportunities found matching your criteria</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* Watchlist Tab */}
      {activeTab === "watchlist" && (
        <section className="space-y-5 animate-fade-in stagger-2">
          {watchlistLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Loading watchlist...</p>
            </div>
          )}

          {!watchlistLoading && (!watchlist || watchlist.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">No opportunities in your watchlist</p>
              <p className="text-sm text-muted-foreground mt-1">Search and add opportunities to track them here</p>
            </div>
          )}

          {!watchlistLoading && watchlist && watchlist.length > 0 && (
            <div className="space-y-4">
              {watchlist.map((item, i) => {
                const daysUntil = getDaysUntil(item.opportunity?.deadline);
                const isUrgent = daysUntil !== null && daysUntil < 14;
                const isSoon = daysUntil !== null && daysUntil < 30;

                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Star className="h-6 w-6 text-primary fill-primary/20" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base truncate">
                              {item.opportunity?.title || "Unknown"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {item.opportunity?.agency && (
                                <span className="text-sm font-medium text-muted-foreground">
                                  {item.opportunity.agency}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "rounded-lg px-2.5 py-1 text-xs font-medium",
                                  item.status === "watching"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : item.status === "applying"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : item.status === "submitted"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                              <span
                                className={cn(
                                  "rounded-lg px-2.5 py-1 text-xs font-medium",
                                  item.priority === "high"
                                    ? "bg-priority-p1-light text-priority-p1"
                                    : item.priority === "medium"
                                    ? "bg-priority-p2-light text-priority-p2"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.opportunity?.url && (
                              <a
                                href={item.opportunity.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted transition-colors"
                                title="View on Grants.gov"
                              >
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </a>
                            )}
                            <button
                              onClick={() => removeFromWatchlist.mutate(item.id)}
                              disabled={removeFromWatchlist.isPending}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title="Remove from watchlist"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {item.opportunity?.award_ceiling && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                              <DollarSign className="h-3.5 w-3.5" />
                              Up to {formatCurrency(item.opportunity.award_ceiling)}
                            </span>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                              isUrgent
                                ? "bg-priority-p1-light text-priority-p1"
                                : isSoon
                                ? "bg-priority-p2-light text-priority-p2"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(item.opportunity?.deadline)}
                            {daysUntil !== null && daysUntil >= 0 && (
                              <span>({daysUntil}d)</span>
                            )}
                          </span>
                        </div>
                        {/* AI Fit Score */}
                        {item.opportunity && (
                          <div className="mt-4 pt-4 border-t">
                            <GrantFitBadge
                              opportunity={{
                                id: item.opportunity.id,
                                title: item.opportunity.title,
                                agency: item.opportunity.agency ?? undefined,
                                description: item.opportunity.description ?? undefined,
                                funding_amount: item.opportunity.award_ceiling
                                  ? formatCurrency(item.opportunity.award_ceiling)
                                  : undefined,
                                deadline: item.opportunity.deadline ?? undefined,
                              }}
                              profile={{
                                keywords: [],
                                recent_projects: [],
                                funding_history: [],
                              }}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Saved Searches Tab */}
      {activeTab === "saved" && (
        <section className="space-y-5 animate-fade-in stagger-2">
          {savedSearchesLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Loading saved searches...</p>
            </div>
          )}

          {!savedSearchesLoading && (!savedSearches || savedSearches.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">No saved searches</p>
              <p className="text-sm text-muted-foreground mt-1">Save your searches to get alerts for new opportunities</p>
            </div>
          )}

          {!savedSearchesLoading && savedSearches && savedSearches.length > 0 && (
            <div className="space-y-4">
              {savedSearches.map((search, i) => (
                <div
                  key={search.id}
                  className="group rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                      <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base">{search.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {search.query.keywords && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                <Search className="h-3 w-3" />
                                {search.query.keywords}
                              </span>
                            )}
                            {search.query.agency && (
                              <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                {search.query.agency}
                              </span>
                            )}
                            {search.query.amount_min && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                                <DollarSign className="h-3 w-3" />
                                Min: {formatCurrency(search.query.amount_min)}
                              </span>
                            )}
                            {search.query.amount_max && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                                <DollarSign className="h-3 w-3" />
                                Max: {formatCurrency(search.query.amount_max)}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              <Bell className="h-3 w-3" />
                              {search.alert_frequency.charAt(0).toUpperCase() + search.alert_frequency.slice(1)} alerts
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleLoadSavedSearch(search.query)}
                            className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                          >
                            <Search className="h-4 w-4" />
                            Run
                          </button>
                          <button
                            onClick={() => deleteSavedSearch.mutate(search.id)}
                            disabled={deleteSavedSearch.isPending}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete saved search"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <BookmarkPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Save Search</h2>
                <p className="text-sm text-muted-foreground">
                  Get notified when new opportunities match
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Name</label>
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g., NSF AI Research Grants"
                  className="input-base"
                  autoFocus
                />
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Current filters:</p>
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1 text-xs font-medium">
                      <Search className="h-3 w-3" />
                      {searchQuery}
                    </span>
                  )}
                  {filters.agency && (
                    <span className="inline-flex items-center rounded-lg bg-background px-2.5 py-1 text-xs font-medium">
                      {filters.agency}
                    </span>
                  )}
                  {filters.amount_min && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-background px-2.5 py-1 text-xs font-medium">
                      <DollarSign className="h-3 w-3" />
                      Min: {formatCurrency(filters.amount_min)}
                    </span>
                  )}
                  {filters.amount_max && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-background px-2.5 py-1 text-xs font-medium">
                      <DollarSign className="h-3 w-3" />
                      Max: {formatCurrency(filters.amount_max)}
                    </span>
                  )}
                  {!searchQuery && !filters.agency && !filters.amount_min && !filters.amount_max && (
                    <span className="text-sm text-muted-foreground">No filters applied</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim() || createSavedSearch.isPending}
                className="btn-primary inline-flex items-center gap-2"
              >
                {createSavedSearch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Document Modal */}
      <GrantDocumentModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        workspaceId={currentWorkspaceId ?? undefined}
        onGrantDataExtracted={async (data) => {
          // Create custom opportunity and add to watchlist
          if (!currentWorkspaceId) {
            console.error("No workspace selected");
            return;
          }

          try {
            await createOpportunity.mutateAsync({
              title: data.title,
              agency: data.agency,
              description: data.description,
              deadline: data.deadline,
              amount_min: data.amount_min,
              amount_max: data.amount_max,
              eligibility: data.eligibility,
              url: data.url,
              workspace_id: currentWorkspaceId,
              add_to_watchlist: true,
              priority: "medium",
            });
            setShowImportModal(false);
            setActiveTab("watchlist"); // Switch to watchlist to show the new item
          } catch (error) {
            console.error("Failed to create opportunity:", error);
          }
        }}
      />
    </div>
  );
}

// Grant Agent Button Component
function GrantAgentButton() {
  const { openChat, selectAgent, setContext } = useAgentStore();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleOpenGrantAgent = (initialMessage?: string) => {
    setContext({
      page: "grants",
    });
    selectAgent("grant");
    openChat(initialMessage);
    setShowQuickActions(false);
  };

  const quickActions = [
    {
      label: "Find matching grants",
      icon: Search,
      message: "Help me find grants that match my research profile and interests.",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Analyze fit score",
      icon: TrendingUp,
      message: "Analyze my fit for grants in my watchlist and suggest which ones I should prioritize.",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Prepare application",
      icon: FileText,
      message: "Help me prepare a grant application. What documents and materials do I need?",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "Deadline planning",
      icon: Calendar,
      message: "Help me plan my grant application timeline based on upcoming deadlines.",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowQuickActions(!showQuickActions)}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-all duration-200"
      >
        <Sparkles className="h-4 w-4" />
        AI Assistant
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          showQuickActions && "rotate-180"
        )} />
      </button>

      {showQuickActions && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowQuickActions(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-2xl border bg-card p-3 shadow-xl animate-slide-down">
            <div className="mb-3 px-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
            </div>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleOpenGrantAgent(action.message)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors group"
                >
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", action.bgColor)}>
                    <action.icon className={cn("h-4 w-4", action.color)} />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>
            <hr className="my-3" />
            <button
              onClick={() => handleOpenGrantAgent()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Open AI Chat
            </button>
          </div>
        </>
      )}
    </div>
  );
}

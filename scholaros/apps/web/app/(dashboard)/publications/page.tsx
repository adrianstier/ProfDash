"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Link2,
  LayoutGrid,
  List,
  FileText,
  BookOpen,
  Layers,
  ChevronDown,
  Edit3,
  Clock,
  Send,
  CheckCircle2,
  Users,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PublicationPipeline,
  PublicationCard,
  AddPublicationModal,
  ImportDOIModal,
} from "@/components/publications";
import {
  usePublications,
  useDeletePublication,
  type PublicationWithAuthors,
} from "@/lib/hooks/use-publications";
import {
  PUBLICATION_STATUS_LABELS,
  PUBLICATION_TYPE_LABELS,
  type PublicationStatus,
  type PublicationType,
} from "@scholaros/shared";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

type ViewMode = "pipeline" | "grid" | "list";

const statusConfig: Record<PublicationStatus, { icon: typeof FileText; color: string; bgColor: string }> = {
  idea: { icon: Edit3, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
  draft: { icon: FileText, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  "in-review": { icon: Clock, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  revision: { icon: Edit3, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  accepted: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  published: { icon: BookMarked, color: "text-primary", bgColor: "bg-primary/10" },
};

export default function PublicationsPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [_selectedPublication, setSelectedPublication] =
    useState<PublicationWithAuthors | null>(null);
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | "all">(
    "all"
  );
  const [typeFilter, setTypeFilter] = useState<PublicationType | "all">("all");

  const { data, isLoading, error } = usePublications({
    workspace_id: currentWorkspaceId ?? undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const deletePublication = useDeletePublication();

  const publications = data?.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const total = publications.length;
    const inProgress = publications.filter((p) => ["draft", "in-review", "revision"].includes(p.status)).length;
    const published = publications.filter((p) => p.status === "published").length;
    const accepted = publications.filter((p) => p.status === "accepted").length;
    return { total, inProgress, published, accepted };
  }, [publications]);

  const handleEdit = (publication: PublicationWithAuthors) => {
    setSelectedPublication(publication);
  };

  const handleDelete = async (publication: PublicationWithAuthors) => {
    if (confirm("Are you sure you want to delete this publication?")) {
      try {
        await deletePublication.mutateAsync(publication.id);
      } catch (error) {
        console.error("Failed to delete publication:", error);
      }
    }
  };

  const handleView = (publication: PublicationWithAuthors) => {
    setSelectedPublication(publication);
  };

  const statCards = [
    {
      key: "total",
      label: "Total Papers",
      value: stats.total,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "progress",
      label: "In Progress",
      value: stats.inProgress,
      icon: Edit3,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      key: "accepted",
      label: "Accepted",
      value: stats.accepted,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      key: "published",
      label: "Published",
      value: stats.published,
      icon: BookMarked,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/5 via-primary/5 to-purple-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Publications
              </h1>
              <p className="text-muted-foreground">
                Track your research papers from idea to publication
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Link2 className="h-4 w-4" />
              Import DOI
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Publication
            </button>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fade-in stagger-1">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  stat.bgColor
                )}
                style={{ opacity: 0.3 }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-display font-semibold tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={cn("rounded-xl p-2.5", stat.bgColor)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Toolbar */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in stagger-2">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PublicationStatus | "all")}
            className="input-base py-2 pr-10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
          >
            <option value="all">All Stages</option>
            {Object.entries(PUBLICATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PublicationType | "all")}
            className="input-base py-2 pr-10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
          >
            <option value="all">All Types</option>
            {Object.entries(PUBLICATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border">
          <button
            onClick={() => setViewMode("pipeline")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
              viewMode === "pipeline"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4" />
            Pipeline
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
              viewMode === "grid"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
              viewMode === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </section>

      {/* Content */}
      <section className="animate-fade-in stagger-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Loading publications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-lg font-semibold text-destructive">Failed to load publications</p>
            <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
          </div>
        ) : publications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">No publications yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Start tracking your research papers by adding a publication or importing from a DOI
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-ghost inline-flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" />
                Import DOI
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Publication
              </button>
            </div>
          </div>
        ) : viewMode === "pipeline" ? (
          <PublicationPipeline
            publications={publications}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {publications.map((pub, i) => (
              <div
                key={pub.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <PublicationCard
                  publication={pub}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {publications.map((pub, i) => {
              const config = statusConfig[pub.status];
              const StatusIcon = config.icon;
              return (
                <div
                  key={pub.id}
                  className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.bgColor)}>
                    <StatusIcon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{pub.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {pub.publication_authors
                          ?.slice(0, 3)
                          .map((a) => a.name)
                          .join(", ")}
                        {pub.publication_authors && pub.publication_authors.length > 3
                          ? " et al."
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {pub.journal || "No venue"}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {pub.year || "—"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                        config.bgColor,
                        config.color
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {PUBLICATION_STATUS_LABELS[pub.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <AddPublicationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <ImportDOIModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  BookOpen,
  Wallet,
  Activity,
  FolderOpen,
  Filter,
  X,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProjectType, ProjectStatus } from "@scholaros/shared";
import { PROJECT_TYPE_CONFIG } from "@scholaros/shared";
import {
  useProjects,
  useDeleteProject,
  type ProjectFromAPI,
} from "@/lib/hooks/use-projects";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { ProjectCard } from "@/components/projects/project-card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToastActions } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const statCards = [
  {
    key: "all",
    label: "Total Projects",
    icon: FolderOpen,
    color: "text-primary",
    bgColor: "bg-primary/10",
    filter: { type: "all", status: "all" },
  },
  {
    key: "manuscript",
    label: "Manuscripts",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    filter: { type: "manuscript", status: "all" },
  },
  {
    key: "grant",
    label: "Grants",
    icon: Wallet,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    filter: { type: "grant", status: "all" },
  },
  {
    key: "research",
    label: "Research",
    icon: FlaskConical,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    filter: { type: "research", status: "all" },
  },
  {
    key: "active",
    label: "Active",
    icon: Activity,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    filter: { type: "all", status: "active" },
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: projects = [], isLoading } = useProjects({
    workspace_id: currentWorkspaceId ?? "",
  });
  const deleteProject = useDeleteProject();
  const toast = useToastActions();

  const [filterType, setFilterType] = useState<ProjectType | "all">(
    (searchParams.get("type") as ProjectType | "all") || "all"
  );
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">(
    (searchParams.get("status") as ProjectStatus | "all") || "all"
  );
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectFromAPI | null>(
    null
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType !== "all") params.set("type", filterType);
    if (filterStatus !== "all") params.set("status", filterStatus);

    const newUrl = params.toString() ? `?${params.toString()}` : "/projects";
    router.replace(newUrl, { scroll: false });
  }, [filterType, filterStatus, router]);

  const filteredProjects = projects.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const getStatCount = (key: string) => {
    switch (key) {
      case "all":
        return projects.length;
      case "manuscript":
        return projects.filter((p) => p.type === "manuscript").length;
      case "grant":
        return projects.filter((p) => p.type === "grant").length;
      case "research":
        return projects.filter((p) => p.type === "research").length;
      case "active":
        return projects.filter((p) => p.status === "active").length;
      default:
        return 0;
    }
  };

  const handleDeleteClick = (project: ProjectFromAPI) => {
    setDeleteConfirm(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteProject.mutateAsync(deleteConfirm.id);
      toast.success("Project deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleStatClick = (type: string, status: string) => {
    setFilterType(type as ProjectType | "all");
    setFilterStatus(status as ProjectStatus | "all");
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
  };

  const hasActiveFilters = filterType !== "all" || filterStatus !== "all";

  if (!currentWorkspaceId) {
    return (
      <EmptyState
        icon={FileText}
        title="No Workspace Selected"
        description="Please select a workspace to view your projects."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/5 via-primary/5 to-amber-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Projects
            </h1>
            <p className="text-muted-foreground">
              Track manuscripts, grants, and research projects
            </p>
          </div>
          <Link
            href="/projects/new"
            className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 w-fit"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 animate-fade-in stagger-1">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const count = getStatCount(stat.key);
          const isActive =
            (stat.key === "all" &&
              filterType === "all" &&
              filterStatus === "all") ||
            (stat.key === filterType && filterStatus === "all") ||
            (stat.key === filterStatus && filterType === "all");

          return (
            <button
              key={stat.key}
              onClick={() =>
                handleStatClick(stat.filter.type, stat.filter.status)
              }
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-border",
                isActive && "ring-2 ring-primary ring-offset-2"
              )}
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
                    {count}
                  </p>
                </div>
                <div className={cn("rounded-xl p-2.5", stat.bgColor)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3 animate-fade-in stagger-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Type:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "manuscript", "grant", "research", "general"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                filterType === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {type === "all" ? "All Types" : PROJECT_TYPE_CONFIG[type].label}
            </button>
          ))}
        </div>

        <div className="hidden sm:block h-6 w-px bg-border mx-2" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Status:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "completed", "archived"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  filterStatus === status
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {status === "all"
                  ? "All Status"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </section>

      {/* Project List */}
      <section className="animate-fade-in stagger-3">
        {filteredProjects.length === 0 ? (
          projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12">
              <EmptyState
                icon={FileText}
                title="No projects yet"
                description="Create your first project to track manuscripts, grants, and research work."
                action={{
                  label: "Create Project",
                  onClick: () => router.push("/projects/new"),
                  icon: Plus,
                }}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12">
              <EmptyState
                icon={FileText}
                title="No projects match filters"
                description="Try adjusting your filters to find what you're looking for."
                action={{
                  label: "Clear Filters",
                  onClick: clearFilters,
                }}
                variant="muted"
              />
            </div>
          )
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project, i) => (
              <div
                key={project.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <ProjectCard project={project} onDelete={handleDeleteClick} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteConfirm?.title}"? This will also unlink all associated tasks. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteProject.isPending}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, FileText, DollarSign, Folder, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ProjectType, ProjectStatus } from "@scholaros/shared";
import { PROJECT_TYPE_CONFIG } from "@scholaros/shared";
import { useProjects, useCreateProject, useDeleteProject, type ProjectFromAPI } from "@/lib/hooks/use-projects";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { ProjectCard } from "@/components/projects/project-card";

const typeIcons = {
  manuscript: FileText,
  grant: DollarSign,
  general: Folder,
};

export default function ProjectsPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: projects = [], isLoading, error } = useProjects({
    workspace_id: currentWorkspaceId ?? "",
  });
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [filterType, setFilterType] = useState<ProjectType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">("all");
  const [isCreating, setIsCreating] = useState(false);

  const filteredProjects = projects.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  // Stats
  const manuscriptCount = projects.filter((p) => p.type === "manuscript").length;
  const grantCount = projects.filter((p) => p.type === "grant").length;
  const activeCount = projects.filter((p) => p.status === "active").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  const handleDelete = async (project: ProjectFromAPI) => {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    try {
      await deleteProject.mutateAsync(project.id);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  if (!currentWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Please select a workspace first.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Track manuscripts, grants, and research projects
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Projects</p>
          <p className="text-2xl font-bold">{projects.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Manuscripts</p>
          <p className="text-2xl font-bold">{manuscriptCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Grants</p>
          <p className="text-2xl font-bold">{grantCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold">{activeCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground self-center">Type:</span>
          {(["all", "manuscript", "grant", "general"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                filterType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {type === "all" ? "All" : PROJECT_TYPE_CONFIG[type].label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground self-center">Status:</span>
          {(["all", "active", "completed", "archived"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                filterStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm">Create your first project to get started</p>
          <Link
            href="/projects/new"
            className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

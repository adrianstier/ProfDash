"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, DollarSign, Folder, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ProjectType } from "@scholaros/shared";
import { PROJECT_TYPE_CONFIG, PROJECT_STAGES } from "@scholaros/shared";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

const typeIcons = {
  manuscript: FileText,
  grant: DollarSign,
  general: Folder,
};

export default function NewProjectPage() {
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspaceStore();
  const createProject = useCreateProject();

  const [type, setType] = useState<ProjectType>("manuscript");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [stage, setStage] = useState("");
  const [dueDate, setDueDate] = useState("");

  const stages = PROJECT_STAGES[type];
  const typeConfig = PROJECT_TYPE_CONFIG[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentWorkspaceId || !title.trim()) return;

    try {
      const project = await createProject.mutateAsync({
        workspace_id: currentWorkspaceId,
        type,
        title: title.trim(),
        summary: summary.trim() || null,
        stage: stage || typeConfig.defaultStage,
        due_date: dueDate || null,
        status: "active",
      });

      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  if (!currentWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Please select a workspace first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="rounded p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Project</h1>
          <p className="text-muted-foreground">
            Create a new project to track your work
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Project Type</label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(PROJECT_TYPE_CONFIG) as ProjectType[]).map((projectType) => {
              const config = PROJECT_TYPE_CONFIG[projectType];
              const Icon = typeIcons[projectType];
              const isSelected = type === projectType;

              return (
                <button
                  key={projectType}
                  type="button"
                  onClick={() => {
                    setType(projectType);
                    setStage("");
                  }}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className={`rounded-lg p-2 ${config.color} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${config.color.replace("bg-", "text-")}`} />
                  </div>
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {config.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Enter ${typeConfig.label.toLowerCase()} title...`}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-medium">
            Summary
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief description of the project..."
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Stage */}
        <div className="space-y-2">
          <label htmlFor="stage" className="text-sm font-medium">
            Initial Stage
          </label>
          <select
            id="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select stage...</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label htmlFor="dueDate" className="text-sm font-medium">
            Due Date
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/projects"
            className="rounded-md px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!title.trim() || createProject.isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}

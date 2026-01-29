"use client";

import Link from "next/link";
import { Calendar, CheckCircle2, FileText, DollarSign, Folder, FlaskConical, Trash2, Edit } from "lucide-react";
import { PROJECT_TYPE_CONFIG, getStageLabel, getStageColor, PROJECT_STATUS_CONFIG } from "@scholaros/shared";
import type { ProjectFromAPI } from "@/lib/hooks/use-projects";
import { ARIA_LABELS } from "@/lib/constants";

interface ProjectCardProps {
  project: ProjectFromAPI;
  onEdit?: (project: ProjectFromAPI) => void;
  onDelete?: (project: ProjectFromAPI) => void;
}

const typeIcons = {
  manuscript: FileText,
  grant: DollarSign,
  general: Folder,
  research: FlaskConical,
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const TypeIcon = typeIcons[project.type];
  const typeConfig = PROJECT_TYPE_CONFIG[project.type];
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];
  const stageColor = project.stage ? getStageColor(project.type, project.stage) : "bg-gray-500";
  const stageLabel = project.stage ? getStageLabel(project.type, project.stage) : "No Stage";

  const completedTasks = project.completed_task_count ?? 0;
  const totalTasks = project.task_count ?? 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <article
      className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
      aria-label={`Project: ${project.title}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${typeConfig.color} bg-opacity-10`} aria-hidden="true">
            <TypeIcon className={`h-5 w-5 ${typeConfig.color.replace("bg-", "text-")}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/projects/${project.id}`}
              className="font-medium hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
              aria-label={ARIA_LABELS.viewProject(project.title)}
            >
              {project.title}
            </Link>
            {project.summary && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {project.summary}
              </p>
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {onEdit && (
              <button
                onClick={() => onEdit(project)}
                className="rounded p-1.5 hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={ARIA_LABELS.editProject(project.title)}
              >
                <Edit className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(project)}
                className="rounded p-1.5 hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={ARIA_LABELS.deleteProject(project.title)}
              >
                <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stage and Status Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {project.stage && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${stageColor}`}
          >
            {stageLabel}
          </span>
        )}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Footer: Due date and Task progress */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          {project.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <time dateTime={project.due_date}>
                {new Date(project.due_date).toLocaleDateString()}
              </time>
            </div>
          )}
        </div>

        {totalTasks > 0 && (
          <div className="flex items-center gap-2" aria-label={`${completedTasks} of ${totalTasks} tasks completed`}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span aria-hidden="true">
              {completedTasks}/{totalTasks} tasks
            </span>
            <div
              className="h-1.5 w-16 rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Task progress: ${progress}%`}
            >
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

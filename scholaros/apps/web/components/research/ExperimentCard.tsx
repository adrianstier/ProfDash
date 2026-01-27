"use client";

import Link from "next/link";
import {
  MapPin,
  User,
  Calendar,
  Users,
  Plane,
  ClipboardList,
  MoreHorizontal,
  Edit2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getExperimentStatusConfig } from "@/lib/hooks/use-experiments";
import type { ExperimentWithDetails } from "@scholaros/shared";
import { useState } from "react";

interface ExperimentCardProps {
  experiment: ExperimentWithDetails;
  projectId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ExperimentCard({
  experiment,
  projectId,
  onEdit,
  onDelete,
  className,
}: ExperimentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = getExperimentStatusConfig(experiment.status);

  const formatDateRange = () => {
    if (!experiment.fieldwork_start && !experiment.fieldwork_end) return null;

    const start = experiment.fieldwork_start
      ? new Date(experiment.fieldwork_start).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "TBD";
    const end = experiment.fieldwork_end
      ? new Date(experiment.fieldwork_end).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "TBD";

    return `${start} - ${end}`;
  };

  const fieldworkDates = formatDateRange();

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card transition-shadow hover:shadow-md",
        className
      )}
    >
      {/* Color bar */}
      <div
        className={cn("absolute left-0 top-0 h-full w-1 rounded-l-lg", experiment.color)}
      />

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {experiment.code && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {experiment.code}
                </span>
              )}
              <Link
                href={`/projects/${projectId}/experiments/${experiment.id}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {experiment.title}
              </Link>
            </div>

            {experiment.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {experiment.description}
              </p>
            )}
          </div>

          {/* Status badge */}
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusConfig.bgColor,
              statusConfig.textColor
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {/* Site */}
          {experiment.site && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{experiment.site.name}</span>
              {experiment.site.code && (
                <span className="text-xs">({experiment.site.code})</span>
              )}
            </div>
          )}

          {/* Lead */}
          {experiment.lead && (
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span>{experiment.lead.full_name}</span>
            </div>
          )}

          {/* Fieldwork dates */}
          {fieldworkDates && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{fieldworkDates}</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{experiment.team_count ?? 0} team</span>
          </div>
          <div className="flex items-center gap-1">
            <Plane className="h-3.5 w-3.5" />
            <span>{experiment.fieldwork_count ?? 0} trips</span>
          </div>
          <div className="flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>{experiment.task_count ?? 0} tasks</span>
          </div>
        </div>
      </div>

      {/* Actions menu */}
      {(onEdit || onDelete) && (
        <div className="absolute right-2 top-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1.5 opacity-0 hover:bg-muted group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover py-1 shadow-md">
                {onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

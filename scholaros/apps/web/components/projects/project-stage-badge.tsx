"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PROJECT_STAGES,
  getStageConfig,
  getNextStage,
  getPreviousStage,
  type ProjectType,
} from "@scholaros/shared";

interface ProjectStageBadgeProps {
  projectType: ProjectType;
  stage: string | null | undefined;
  onStageChange?: (newStage: string) => void;
  showNavigation?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProjectStageBadge({
  projectType,
  stage,
  onStageChange,
  showNavigation = false,
  size = "md",
}: ProjectStageBadgeProps) {
  if (!stage) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        No Stage
      </span>
    );
  }

  const stageConfig = getStageConfig(projectType, stage);
  const nextStage = getNextStage(projectType, stage);
  const prevStage = getPreviousStage(projectType, stage);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <div className="inline-flex items-center gap-1">
      {showNavigation && onStageChange && prevStage && (
        <button
          onClick={() => onStageChange(prevStage.id)}
          className="rounded p-1 hover:bg-muted"
          title={`Move to ${prevStage.label}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <span
        className={`inline-flex items-center rounded-full font-medium text-white ${stageConfig?.color ?? "bg-gray-500"} ${sizeClasses[size]}`}
      >
        {stageConfig?.label ?? stage}
      </span>

      {showNavigation && onStageChange && nextStage && (
        <button
          onClick={() => onStageChange(nextStage.id)}
          className="rounded p-1 hover:bg-muted"
          title={`Move to ${nextStage.label}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface ProjectStageSelectProps {
  projectType: ProjectType;
  value: string | null | undefined;
  onChange: (stage: string) => void;
}

export function ProjectStageSelect({
  projectType,
  value,
  onChange,
}: ProjectStageSelectProps) {
  const stages = PROJECT_STAGES[projectType];

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">Select stage...</option>
      {stages.map((stage) => (
        <option key={stage.id} value={stage.id}>
          {stage.label}
        </option>
      ))}
    </select>
  );
}

interface ProjectStageProgressProps {
  projectType: ProjectType;
  currentStage: string | null | undefined;
  onStageClick?: (stage: string) => void;
}

export function ProjectStageProgress({
  projectType,
  currentStage,
  onStageClick,
}: ProjectStageProgressProps) {
  const stages = PROJECT_STAGES[projectType];
  const currentIndex = currentStage
    ? stages.findIndex((s) => s.id === currentStage)
    : -1;

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = currentIndex === index;

        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => onStageClick?.(stage.id)}
              disabled={!onStageClick}
              className={`
                relative flex items-center justify-center rounded-full
                transition-all
                ${onStageClick ? "cursor-pointer hover:scale-110" : "cursor-default"}
                ${isCurrent ? "h-8 w-8 ring-2 ring-primary ring-offset-2" : "h-6 w-6"}
                ${isCompleted || isCurrent ? stage.color : "bg-muted"}
              `}
              title={stage.label}
            >
              {isCompleted && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
            {index < stages.length - 1 && (
              <div
                className={`h-0.5 w-4 ${
                  isCompleted ? stage.color : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

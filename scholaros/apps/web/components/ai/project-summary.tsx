"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useProjectSummary, type ProjectSummaryResponse } from "@/lib/hooks/use-ai";

interface ProjectSummaryProps {
  project: {
    id: string;
    title: string;
    type: "manuscript" | "grant" | "general";
    status: string;
    stage?: string;
    summary?: string;
  };
  tasks?: {
    title: string;
    status: "todo" | "progress" | "done";
    priority: "p1" | "p2" | "p3" | "p4";
    due_date?: string;
  }[];
  milestones?: {
    title: string;
    due_date?: string;
    completed?: boolean;
  }[];
  recentNotes?: {
    content: string;
    created_at: string;
  }[];
  compact?: boolean;
}

const healthColors: Record<string, string> = {
  high: "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300",
  medium: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300",
  low: "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300",
};

function getHealthLevel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function ProjectSummary({
  project,
  tasks,
  milestones,
  recentNotes,
  compact = false,
}: ProjectSummaryProps) {
  const [summary, setSummary] = useState<ProjectSummaryResponse | null>(null);
  const projectSummary = useProjectSummary();

  const handleGenerate = () => {
    projectSummary.mutate(
      {
        project: {
          title: project.title,
          type: project.type,
          status: project.status,
          stage: project.stage,
          summary: project.summary,
        },
        tasks,
        milestones,
        recent_notes: recentNotes,
      },
      {
        onSuccess: (response) => {
          setSummary(response);
        },
      }
    );
  };

  if (!summary && !projectSummary.isPending) {
    return (
      <button
        onClick={handleGenerate}
        className="flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900"
      >
        <Sparkles className="h-4 w-4" />
        Generate AI Summary
      </button>
    );
  }

  if (projectSummary.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-md border p-4">
        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
        <span className="text-sm text-muted-foreground">
          Analyzing project...
        </span>
      </div>
    );
  }

  if (projectSummary.isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {projectSummary.error?.message || "Failed to generate summary"}
          </span>
        </div>
        <button
          onClick={handleGenerate}
          className="mt-2 text-sm text-red-600 hover:underline dark:text-red-400"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const healthLevel = getHealthLevel(summary.health_score);

  if (compact) {
    return (
      <div className="rounded-md border bg-gradient-to-r from-purple-50/50 to-blue-50/50 p-3 dark:from-purple-950/30 dark:to-blue-950/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                AI Summary
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${healthColors[healthLevel]}`}
              >
                {summary.health_score}% healthy
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {summary.status_summary}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="shrink-0 rounded p-1 hover:bg-muted"
            title="Refresh summary"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50 dark:from-purple-950/30 dark:via-background dark:to-blue-950/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold">AI Project Summary</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${healthColors[healthLevel]}`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {summary.health_score}% Health Score
          </span>
          <button
            onClick={handleGenerate}
            className="rounded-md p-1.5 hover:bg-muted"
            title="Refresh summary"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Summary */}
        <p className="text-sm leading-relaxed">{summary.status_summary}</p>

        {/* Accomplishments */}
        {summary.accomplishments.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Recent Accomplishments
            </h4>
            <ul className="space-y-1">
              {summary.accomplishments.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blockers */}
        {summary.blockers.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Potential Blockers
            </h4>
            <ul className="space-y-1">
              {summary.blockers.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Actions */}
        {summary.next_actions.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
              <ArrowRight className="h-4 w-4" />
              Suggested Next Actions
            </h4>
            <ul className="space-y-1">
              {summary.next_actions.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

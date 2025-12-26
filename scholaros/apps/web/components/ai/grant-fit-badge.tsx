"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Target,
  AlertCircle,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { useGrantFitScore, type FitScoreResponse } from "@/lib/hooks/use-ai";

interface GrantFitBadgeProps {
  opportunity: {
    id: string;
    title: string;
    agency?: string;
    description?: string;
    eligibility?: string;
    funding_amount?: string;
    deadline?: string;
  };
  profile: {
    keywords?: string[];
    recent_projects?: string[];
    funding_history?: string[];
    institution_type?: string;
  };
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

const scoreColors: Record<string, string> = {
  high: "text-green-700 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-900/50 dark:border-green-800",
  medium: "text-yellow-700 bg-yellow-100 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-800",
  low: "text-red-700 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-900/50 dark:border-red-800",
};

function getScoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function getScoreIcon(level: "high" | "medium" | "low") {
  switch (level) {
    case "high":
      return <TrendingUp className="h-3.5 w-3.5" />;
    case "medium":
      return <Minus className="h-3.5 w-3.5" />;
    case "low":
      return <TrendingDown className="h-3.5 w-3.5" />;
  }
}

export function GrantFitBadge({
  opportunity,
  profile,
  showDetails = false,
  size = "md",
}: GrantFitBadgeProps) {
  const [fitScore, setFitScore] = useState<FitScoreResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const scoreMutation = useGrantFitScore();

  const handleCalculate = () => {
    scoreMutation.mutate(
      {
        opportunity: {
          title: opportunity.title,
          agency: opportunity.agency,
          description: opportunity.description,
          eligibility: opportunity.eligibility,
          funding_amount: opportunity.funding_amount,
          deadline: opportunity.deadline,
        },
        profile,
      },
      {
        onSuccess: (response) => {
          setFitScore(response);
        },
      }
    );
  };

  // Initial state - show calculate button
  if (!fitScore && !scoreMutation.isPending) {
    const sizeClasses = {
      sm: "px-2 py-1 text-xs gap-1",
      md: "px-2.5 py-1.5 text-sm gap-1.5",
      lg: "px-3 py-2 text-sm gap-2",
    };

    return (
      <button
        onClick={handleCalculate}
        className={`flex items-center rounded-md border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900 ${sizeClasses[size]}`}
      >
        <Sparkles className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        <span>AI Fit Score</span>
      </button>
    );
  }

  // Loading state
  if (scoreMutation.isPending) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
        <span className="text-muted-foreground">Analyzing...</span>
      </div>
    );
  }

  // Error state
  if (scoreMutation.isError) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm dark:border-red-800 dark:bg-red-950">
        <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        <span className="text-red-700 dark:text-red-300">Error</span>
        <button
          onClick={handleCalculate}
          className="ml-1 text-red-600 hover:underline dark:text-red-400"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!fitScore) return null;

  const scoreLevel = getScoreLevel(fitScore.score);

  // Compact badge view
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${scoreColors[scoreLevel]}`}
      >
        {getScoreIcon(scoreLevel)}
        <span>{fitScore.score}% Fit</span>
        <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
      </button>
    );
  }

  // Expanded details view
  return (
    <div className={`rounded-lg border ${scoreColors[scoreLevel]}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="font-semibold">AI Fit Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-bold">
            {getScoreIcon(scoreLevel)}
            {fitScore.score}%
          </span>
          <button
            onClick={handleCalculate}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
            title="Refresh score"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 bg-background/50 rounded-b-lg">
        {/* Summary */}
        <p className="text-sm">{fitScore.summary}</p>

        {/* Reasons for good fit */}
        {fitScore.reasons.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">
              <Target className="h-3.5 w-3.5" />
              Why It&apos;s a Good Fit
            </h4>
            <ul className="space-y-1">
              {fitScore.reasons.map((reason, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="mt-1 h-1 w-1 rounded-full bg-green-500 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gaps */}
        {fitScore.gaps.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Potential Gaps
            </h4>
            <ul className="space-y-1">
              {fitScore.gaps.map((gap, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="mt-1 h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {fitScore.suggestions.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Suggestions
            </h4>
            <ul className="space-y-1">
              {fitScore.suggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="mt-1 h-1 w-1 rounded-full bg-blue-500 shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple inline badge for list views
export function GrantFitBadgeInline({
  score,
  onClick,
}: {
  score: number;
  onClick?: () => void;
}) {
  const level = getScoreLevel(score);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${scoreColors[level]}`}
    >
      {getScoreIcon(level)}
      {score}%
    </button>
  );
}

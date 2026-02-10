"use client";

import { useCallback } from "react";
import { Sparkles, X, Check, ChevronRight, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { PatternMatch } from "@/lib/utils/academic-patterns";
import type { TaskCategory } from "@scholaros/shared";

interface CategorySuggestionProps {
  patternMatch: PatternMatch | null;
  onApplyCategory: (category: TaskCategory) => void;
  onApplySubtask?: (subtask: string) => void;
  onDismiss: () => void;
}

/**
 * Confidence level display properties
 *
 * | Score Range | Level  | Style        |
 * |-------------|--------|--------------|
 * | >= 0.3      | High   | Green/solid  |
 * | >= 0.15     | Medium | Amber/muted  |
 * | < 0.15      | Low    | Gray/outline |
 */
function getConfidenceDisplay(confidence: number) {
  if (confidence >= 0.3) {
    return {
      label: "High",
      variant: "default" as const,
      badgeClass: "bg-emerald-600 text-white",
      borderClass: "border-emerald-200 dark:border-emerald-800",
      bgClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
    };
  }
  if (confidence >= 0.15) {
    return {
      label: "Medium",
      variant: "secondary" as const,
      badgeClass: "bg-amber-500 text-white",
      borderClass: "border-amber-200 dark:border-amber-800",
      bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
    };
  }
  return {
    label: "Low",
    variant: "outline" as const,
    badgeClass: "",
    borderClass: "border-border",
    bgClass: "bg-muted/30",
  };
}

export function CategorySuggestion({
  patternMatch,
  onApplyCategory,
  onApplySubtask,
  onDismiss,
}: CategorySuggestionProps) {
  const handleApply = useCallback(() => {
    if (patternMatch) onApplyCategory(patternMatch.category);
  }, [onApplyCategory, patternMatch]);

  if (!patternMatch) return null;

  const display = getConfidenceDisplay(patternMatch.confidence);
  const categoryLabel =
    CATEGORY_LABELS[patternMatch.category as keyof typeof CATEGORY_LABELS] ??
    patternMatch.category;

  const showSubtasks = patternMatch.suggestedSubtasks.length > 0 && onApplySubtask;
  const previewSubtasks = patternMatch.suggestedSubtasks.slice(0, 3);

  return (
    <div
      className={cn(
        "mt-3 rounded-xl border p-3 animate-in fade-in slide-in-from-top-2 duration-200",
        display.borderClass,
        display.bgClass
      )}
      role="region"
      aria-label="AI category suggestion"
    >
      {/* Header: category + confidence + dismiss */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-500" aria-hidden="true" />
          <span className="text-sm font-medium truncate">
            Detected:{" "}
            <span className="text-foreground">{categoryLabel}</span>
          </span>
          <Badge className={cn("text-[10px] px-1.5 py-0", display.badgeClass)}>
            {display.label}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dismiss suggestion"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tip */}
      {patternMatch.tip && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
          <span>{patternMatch.tip}</span>
        </div>
      )}

      {/* Subtask preview */}
      {showSubtasks && (
        <div className="mt-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span>
              Suggested subtasks ({patternMatch.suggestedSubtasks.length})
            </span>
          </div>
          <ul className="space-y-0.5 pl-4">
            {previewSubtasks.map((subtask, idx) => (
              <li key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                <button
                  type="button"
                  onClick={() => onApplySubtask?.(subtask)}
                  className="truncate text-left hover:text-foreground hover:underline transition-colors"
                  title={`Add subtask: ${subtask}`}
                >
                  {subtask}
                </button>
              </li>
            ))}
            {patternMatch.suggestedSubtasks.length > 3 && (
              <li className="text-[11px] text-muted-foreground/60 italic pl-2.5">
                +{patternMatch.suggestedSubtasks.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2.5 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-7 text-xs gap-1"
          onClick={handleApply}
        >
          <Check className="h-3 w-3" />
          Apply #{patternMatch.category}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={onDismiss}
        >
          Ignore
        </Button>
        {/* Matched keywords for transparency */}
        {patternMatch.keywords.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground/50 hidden sm:inline truncate max-w-[150px]">
            matched: {patternMatch.keywords.slice(0, 3).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

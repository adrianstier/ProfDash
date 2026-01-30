"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findPotentialDuplicates, type DuplicateMatch } from "@/lib/utils/duplicate-detection";
import type { TaskFromAPI } from "@scholaros/shared";

interface DuplicateWarningProps {
  /** Current input value to check for duplicates */
  inputValue: string;
  /** Existing tasks to compare against */
  existingTasks: TaskFromAPI[];
  /** Called when user clicks "Create anyway" */
  onCreateAnyway: () => void;
  /** Called when user wants to navigate to an existing task */
  onGoToTask: (taskId: string) => void;
  /** Debounce delay in milliseconds. Default: 300 */
  debounceMs?: number;
  /** Minimum confidence threshold (0-100). Default: 40 */
  threshold?: number;
}

export function DuplicateWarning({
  inputValue,
  existingTasks,
  onCreateAnyway,
  onGoToTask,
  debounceMs = 300,
  threshold = 40,
}: DuplicateWarningProps) {
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDetection = useCallback(
    (value: string) => {
      if (value.trim().length < 3) {
        setMatches([]);
        setIsVisible(false);
        return;
      }

      const results = findPotentialDuplicates(value, existingTasks, threshold);
      setMatches(results);
      setIsVisible(results.length > 0);
    },
    [existingTasks, threshold]
  );

  // Debounced detection
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      runDetection(inputValue);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [inputValue, debounceMs, runDetection]);

  if (!isVisible || matches.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 animate-fade-in"
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Similar task{matches.length !== 1 ? "s" : ""} found
          </p>
          <p className="text-xs text-muted-foreground">
            {matches.length} existing task{matches.length !== 1 ? "s" : ""} look similar
          </p>
        </div>
      </div>

      {/* Matching tasks */}
      <div className="space-y-2 mb-3">
        {matches.map((match) => (
          <button
            key={match.task.id}
            type="button"
            onClick={() => onGoToTask(match.task.id)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all",
              "bg-card hover:bg-muted/50 hover:border-primary/30"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{match.task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    match.matchType === "exact" && "bg-red-500/10 text-red-500",
                    match.matchType === "similar" && "bg-amber-500/10 text-amber-600",
                    match.matchType === "partial" && "bg-blue-500/10 text-blue-500"
                  )}
                >
                  {match.confidence}% match
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {match.task.priority} priority
                </span>
                {match.task.due && (
                  <span className="text-[10px] text-muted-foreground">
                    Due {match.task.due}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Click a task to view it, or create a new one
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCreateAnyway}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Create anyway
        </Button>
      </div>
    </div>
  );
}

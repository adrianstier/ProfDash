"use client";

import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTaskStore } from "@/lib/stores/task-store";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface FocusModeToggleProps {
  /** Additional CSS classes */
  className?: string;
  /** Show label text next to icon */
  showLabel?: boolean;
}

/**
 * FocusModeToggle - Toggles focus mode on/off.
 *
 * Focus mode hides non-essential sidebar navigation and filters task
 * views to show only high-priority and due/overdue incomplete tasks.
 *
 * Keyboard shortcut: Ctrl+Shift+F (or Cmd+Shift+F on Mac)
 */
export function FocusModeToggle({ className, showLabel = false }: FocusModeToggleProps) {
  const focusMode = useTaskStore((state) => state.focusMode);
  const toggleFocusMode = useTaskStore((state) => state.toggleFocusMode);

  // Keyboard shortcut: Ctrl/Cmd + Shift + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFocusMode]);

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant={focusMode ? "default" : "ghost"}
          size={showLabel ? "sm" : "icon"}
          onClick={toggleFocusMode}
          className={cn(
            "transition-all duration-200",
            focusMode && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
            !focusMode && "text-muted-foreground hover:text-foreground",
            showLabel && "gap-2",
            className
          )}
          aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
          aria-pressed={focusMode}
        >
          <Target className={cn("h-4 w-4", focusMode && "animate-pulse")} />
          {showLabel && (
            <span className="text-xs font-medium">
              {focusMode ? "Focus On" : "Focus"}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>
          {focusMode ? "Exit Focus Mode" : "Focus Mode"}{" "}
          <kbd className="ml-1 rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px]">
            {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "Cmd" : "Ctrl"}+Shift+F
          </kbd>
        </p>
        {!focusMode && (
          <p className="mt-0.5 text-primary-foreground/70">
            Show only high-priority and due tasks
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Loader2, Sparkles, HelpCircle, FileText } from "lucide-react";
import { parseQuickAdd } from "@scholaros/shared";
import { useCreateTask, useTasks } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useTaskStore } from "@/lib/stores/task-store";
import type { TaskCategory, TaskPriority } from "@scholaros/shared";
import { PLACEHOLDERS, KEYBOARD_SHORTCUTS } from "@/lib/constants";
import { VoiceInputInline } from "@/components/voice";
import { cn } from "@/lib/utils";
import { QuickAddHelper } from "@/components/learning/quick-add-helper";
import { SpotlightTrigger } from "@/components/learning/feature-spotlight";
import { DuplicateWarning } from "@/components/tasks/duplicate-warning";
import { detectAcademicPattern } from "@/lib/utils/academic-patterns";
import { CategorySuggestion } from "@/components/tasks/category-suggestion";
import type { PatternMatch } from "@/lib/utils/academic-patterns";

interface QuickAddProps {
  onAdd?: (task: ReturnType<typeof parseQuickAdd>) => void;
  workspaceId?: string | null;
}

export function QuickAdd({ onAdd, workspaceId: propWorkspaceId }: QuickAddProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [showPasteSuggestion, setShowPasteSuggestion] = useState(false);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const [patternMatch, setPatternMatch] = useState<PatternMatch | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentWorkspaceId } = useWorkspaceStore();
  const { openTaskDetail } = useTaskStore();
  const createTask = useCreateTask();

  // Fetch existing tasks for duplicate detection
  const wsId = propWorkspaceId !== undefined ? propWorkspaceId : currentWorkspaceId;
  const { data: existingTasks = [] } = useTasks({ workspace_id: wsId });

  // Reset dismissed state when input changes
  useEffect(() => {
    setDismissedDuplicates(false);
  }, [value]);

  // Debounced academic pattern detection (300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset if input is too short or suggestion was dismissed for this input
    if (value.trim().length < 8) {
      setPatternMatch(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      if (!suggestionDismissed) {
        const match = detectAcademicPattern(value);
        setPatternMatch(match);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, suggestionDismissed]);

  // Reset suggestion dismissed state when input changes significantly
  useEffect(() => {
    setSuggestionDismissed(false);
  }, [value]);

  // Detect multi-line paste to suggest AI content importer
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    const lineCount = text.split("\n").filter((line) => line.trim()).length;
    if (lineCount >= 3 || text.length > 200) {
      setShowPasteSuggestion(true);
      setTimeout(() => setShowPasteSuggestion(false), 8000);
    }
  }, []);

  // Use prop if provided, otherwise use store value
  const workspaceId = propWorkspaceId !== undefined ? propWorkspaceId : currentWorkspaceId;

  // Keyboard shortcut: 'q' to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "q" &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || createTask.isPending) return;

    const parsed = parseQuickAdd(value);

    // Call the callback if provided (for parent component updates)
    onAdd?.(parsed);

    // Map category to valid TaskCategory type
    const mapCategory = (cat: string | undefined): TaskCategory => {
      const validCategories: TaskCategory[] = [
        "research", "teaching", "grants", "admin",
        "grad-mentorship", "undergrad-mentorship", "misc"
      ];
      if (cat && validCategories.includes(cat as TaskCategory)) {
        return cat as TaskCategory;
      }
      return "misc";
    };

    // Map priority to valid TaskPriority type
    const mapPriority = (pri: string | undefined): TaskPriority => {
      const validPriorities: TaskPriority[] = ["p1", "p2", "p3", "p4"];
      if (pri && validPriorities.includes(pri as TaskPriority)) {
        return pri as TaskPriority;
      }
      return "p3";
    };

    try {
      await createTask.mutateAsync({
        title: parsed.title,
        description: null,
        category: mapCategory(parsed.category),
        priority: mapPriority(parsed.priority),
        status: "todo",
        due: parsed.due ? parsed.due.toISOString().split("T")[0] : null,
        project_id: parsed.projectId || null,
        workspace_id: workspaceId || null,
        assignees: parsed.assignees || [],
        tags: [],
      });
      setValue("");
    } catch (error) {
      console.error("Failed to create task:", error);
      // Keep the value in case of error so user can retry
    }
  };

  return (
    <form onSubmit={handleSubmit} role="search" aria-label="Quick add task">
      <div
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 transition-all duration-200",
          isFocused
            ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
            : "hover:border-border hover:shadow-md",
          createTask.isPending && "opacity-70"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
          isFocused ? "bg-primary/10" : "bg-muted"
        )}>
          {createTask.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <Plus className={cn(
              "h-4 w-4 transition-colors",
              isFocused ? "text-primary" : "text-muted-foreground"
            )} aria-hidden="true" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            // Delay hiding helper to allow clicking on it
            setTimeout(() => setShowHelper(false), 200);
          }}
          onPaste={handlePaste}
          placeholder={PLACEHOLDERS.quickAdd}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          disabled={createTask.isPending}
          aria-label="Quick add task input. Press Q to focus."
          aria-describedby="quick-add-hint"
          aria-busy={createTask.isPending}
        />

        {/* Help button */}
        <button
          type="button"
          onClick={() => setShowHelper(!showHelper)}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            showHelper
              ? "bg-purple-500/10 text-purple-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-label="Show syntax help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Voice Input with spotlight trigger */}
        <SpotlightTrigger featureId="voice-input">
          <VoiceInputInline
            onTranscription={(text) => setValue((prev) => prev ? `${prev} ${text}` : text)}
            disabled={createTask.isPending}
          />
        </SpotlightTrigger>

        {/* Keyboard Shortcut */}
        <kbd className="hidden items-center gap-0.5 rounded-lg border bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex" aria-hidden="true">
          {KEYBOARD_SHORTCUTS.quickAdd}
        </kbd>
      </div>

      {/* Quick Add Helper - Interactive syntax guide */}
      <QuickAddHelper
        isVisible={showHelper}
        onClose={() => setShowHelper(false)}
        inputValue={value}
        onInsertSyntax={(syntax) => {
          setValue((prev) => prev ? `${prev} ${syntax}` : syntax);
          inputRef.current?.focus();
        }}
      />

      {/* Duplicate detection warning */}
      {!dismissedDuplicates && (
        <DuplicateWarning
          inputValue={value}
          existingTasks={existingTasks}
          onCreateAnyway={() => setDismissedDuplicates(true)}
          onGoToTask={(taskId) => {
            openTaskDetail(taskId);
            setValue("");
          }}
        />
      )}

      {/* Academic pattern category suggestion */}
      {!suggestionDismissed && patternMatch && (
        <CategorySuggestion
          patternMatch={patternMatch}
          onApplyCategory={(category) => {
            // Append #category to the input if not already present
            const categoryTag = `#${category}`;
            if (!value.includes(categoryTag)) {
              setValue((prev) => `${prev.trimEnd()} ${categoryTag}`);
            }
            setPatternMatch(null);
            setSuggestionDismissed(true);
            inputRef.current?.focus();
          }}
          onDismiss={() => {
            setPatternMatch(null);
            setSuggestionDismissed(true);
          }}
        />
      )}

      {/* Paste suggestion for AI content importer */}
      {showPasteSuggestion && (
        <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 animate-fade-in">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
            <FileText className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Looks like multiple tasks?</p>
            <p className="text-xs text-muted-foreground">Try the AI Content Importer to extract tasks automatically</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasteSuggestion(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message */}
      {createTask.isError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Failed to create task. Please try again.
        </div>
      )}

      {/* Hint */}
      <div id="quick-add-hint" className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          <span>Smart parsing:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5">
            <code className="font-mono text-[10px]">p1-p4</code>
            <span className="text-muted-foreground/70">priority</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5">
            <code className="font-mono text-[10px]">#category</code>
            <span className="text-muted-foreground/70">tag</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5">
            <code className="font-mono text-[10px]">tomorrow</code>
            <span className="text-muted-foreground/70">due date</span>
          </span>
        </div>
      </div>
    </form>
  );
}

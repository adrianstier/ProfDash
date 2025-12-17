"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { parseQuickAdd } from "@scholaros/shared";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import type { TaskCategory, TaskPriority } from "@scholaros/shared";

interface QuickAddProps {
  onAdd?: (task: ReturnType<typeof parseQuickAdd>) => void;
  workspaceId?: string | null;
}

export function QuickAdd({ onAdd, workspaceId: propWorkspaceId }: QuickAddProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentWorkspaceId } = useWorkspaceStore();
  const createTask = useCreateTask();

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
    console.log("Parsed task:", parsed);

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
    <form onSubmit={handleSubmit}>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2 transition-shadow ${
          isFocused ? "ring-2 ring-primary ring-offset-2" : ""
        } ${createTask.isPending ? "opacity-70" : ""}`}
      >
        {createTask.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Plus className="h-5 w-5 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Add task... (e.g., 'NSF report fri #grants p1')"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          disabled={createTask.isPending}
        />
        <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
          Q
        </kbd>
      </div>
      {createTask.isError && (
        <p className="mt-2 text-xs text-red-500">
          Failed to create task. Please try again.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Tip: Use <code className="rounded bg-muted px-1">p1-p4</code> for
        priority, <code className="rounded bg-muted px-1">#category</code> for
        category, and day names for due dates.
      </p>
    </form>
  );
}

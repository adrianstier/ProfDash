"use client";

import { useState } from "react";
import {
  FileText,
  Loader2,
  Share2,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateTaskTemplate } from "@/lib/hooks/use-task-templates";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { CATEGORY_CONFIG, PRIORITY_LABELS } from "@/lib/constants";
import type { TaskFromAPI, TaskTemplateSubtask } from "@scholaros/shared";

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskFromAPI;
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  task,
}: SaveTemplateModalProps) {
  const [name, setName] = useState(task.title.slice(0, 50));
  const [isShared, setIsShared] = useState(true);
  const [error, setError] = useState("");

  const { currentWorkspaceId } = useWorkspaceStore();
  const createTemplate = useCreateTaskTemplate();

  const categoryConfig = task.category
    ? CATEGORY_CONFIG[task.category]
    : null;
  const priorityLabel = task.priority
    ? PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]
    : null;

  // Convert task subtasks to template subtask format
  const subtasks: TaskTemplateSubtask[] = (task.subtasks ?? []).map((st) => ({
    text: typeof st === "string" ? st : st.text,
    priority: (typeof st === "object" && st.priority) || task.priority || "p3",
    estimated_minutes:
      typeof st === "object" && st.estimatedMinutes
        ? st.estimatedMinutes
        : undefined,
  }));

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a template name");
      return;
    }

    if (!currentWorkspaceId) {
      setError("No workspace selected");
      return;
    }

    setError("");

    try {
      await createTemplate.mutateAsync({
        workspace_id: currentWorkspaceId,
        name: name.trim(),
        description: task.title,
        default_category: task.category ?? undefined,
        default_priority: task.priority ?? "p3",
        default_assigned_to:
          task.assignees && task.assignees.length > 0
            ? task.assignees[0]
            : undefined,
        subtasks,
        is_shared: isShared,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save template"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Create a reusable template from this task.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Template Name */}
          <div>
            <label
              htmlFor="template-name"
              className="block text-sm font-medium mb-1.5"
            >
              Template Name
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
              className={cn(
                "w-full px-3 py-2 rounded-md border border-input bg-background text-sm",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
              autoFocus
            />
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Template Preview
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">{task.title}</p>

              <div className="flex flex-wrap gap-1.5">
                {categoryConfig && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: categoryConfig.bgColor,
                      color: categoryConfig.color,
                    }}
                  >
                    {categoryConfig.label}
                  </span>
                )}
                {priorityLabel && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                    {priorityLabel} priority
                  </span>
                )}
                {subtasks.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-600">
                    {subtasks.length} subtask
                    {subtasks.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Subtasks preview */}
              {subtasks.length > 0 && (
                <div className="mt-2 pl-3 border-l-2 border-border">
                  {subtasks.slice(0, 3).map((st, i) => (
                    <p
                      key={i}
                      className="text-xs text-muted-foreground"
                    >
                      - {st.text}
                    </p>
                  ))}
                  {subtasks.length > 3 && (
                    <p className="text-xs text-muted-foreground/60">
                      +{subtasks.length - 3} more...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Share toggle */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="share-template"
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <input
                id="share-template"
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span>Share with workspace</span>
            </label>
            {isShared ? (
              <Share2 className="h-4 w-4 text-blue-500" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Info */}
          <p className="text-xs text-muted-foreground">
            Templates save the task description, category, priority, and
            subtasks.
            {isShared
              ? " Workspace members will be able to use this template."
              : " Only you will see this template."}
          </p>
        </div>

        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2",
              "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
              "transition-colors"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={createTemplate.isPending || !name.trim()}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:pointer-events-none disabled:opacity-50",
              "transition-colors gap-2"
            )}
          >
            {createTemplate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Save Template
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

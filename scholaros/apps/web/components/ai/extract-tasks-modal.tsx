"use client";

import { useState } from "react";
import {
  X,
  Loader2,
  Sparkles,
  CheckSquare,
  AlertCircle,
  Plus,
  Flag,
  Calendar,
} from "lucide-react";
import { useExtractTasks } from "@/lib/hooks/use-ai";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { PRIORITY_LABELS, CATEGORY_LABELS } from "@scholaros/shared";

interface ExtractTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const priorityColors: Record<string, string> = {
  p1: "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300",
  p2: "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300",
  p3: "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
  p4: "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
};

export function ExtractTasksModal({ isOpen, onClose }: ExtractTasksModalProps) {
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [importedCount, setImportedCount] = useState(0);

  const { currentWorkspaceId } = useWorkspaceStore();
  const extractTasks = useExtractTasks();
  const createTask = useCreateTask();

  const handleExtract = () => {
    if (!text.trim()) return;

    extractTasks.mutate(
      { text: text.trim(), context: context.trim() || undefined },
      {
        onSuccess: (response) => {
          // Select all tasks by default
          setSelectedTasks(new Set(response.tasks.map((_, i) => i)));
        },
      }
    );
  };

  const toggleTask = (index: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  const handleImport = async () => {
    if (!extractTasks.data) return;

    const tasksToImport = extractTasks.data.tasks.filter((_, i) =>
      selectedTasks.has(i)
    );

    let imported = 0;
    for (const task of tasksToImport) {
      try {
        await createTask.mutateAsync({
          title: task.title,
          description: task.description || undefined,
          priority: task.priority,
          category: task.category,
          due: task.due_date || undefined,
          status: "todo",
          workspace_id: currentWorkspaceId || undefined,
        });
        imported++;
      } catch {
        // Continue with other tasks
      }
    }

    setImportedCount(imported);

    // Close after brief delay to show success
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setText("");
    setContext("");
    setSelectedTasks(new Set());
    setImportedCount(0);
    extractTasks.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-background shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Extract Tasks with AI</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!extractTasks.data ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Paste your text (meeting notes, emails, etc.)
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste meeting notes, email threads, or any text containing tasks you want to extract..."
                  className="mt-1 w-full h-48 rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={extractTasks.isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {text.length}/10000 characters
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Context (optional)
                </label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., Lab meeting with PhD students, Grant proposal feedback"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={extractTasks.isPending}
                />
              </div>

              {extractTasks.isError && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {extractTasks.error?.message || "Failed to extract tasks"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Source summary */}
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Source:</strong> {extractTasks.data.source_summary}
                </p>
              </div>

              {/* Extracted tasks */}
              {extractTasks.data.tasks.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Found {extractTasks.data.tasks.length} tasks
                    </p>
                    <button
                      onClick={() => {
                        if (selectedTasks.size === extractTasks.data!.tasks.length) {
                          setSelectedTasks(new Set());
                        } else {
                          setSelectedTasks(
                            new Set(extractTasks.data!.tasks.map((_, i) => i))
                          );
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedTasks.size === extractTasks.data.tasks.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>

                  {extractTasks.data.tasks.map((task, index) => (
                    <label
                      key={index}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                        selectedTasks.has(index)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(index)}
                        onChange={() => toggleTask(index)}
                        className="mt-1 h-4 w-4 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                              priorityColors[task.priority]
                            }`}
                          >
                            <Flag className="h-3 w-3" />
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {CATEGORY_LABELS[task.category]}
                          </span>
                          {task.due_date && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(task.confidence * 100)}% confident
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckSquare className="mx-auto mb-2 h-8 w-8" />
                  <p>No tasks found in the text</p>
                  <p className="text-sm">
                    Try providing more specific action items
                  </p>
                </div>
              )}

              {importedCount > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                  <CheckSquare className="h-4 w-4" />
                  <span>
                    Successfully imported {importedCount} task
                    {importedCount !== 1 ? "s" : ""}!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t p-4">
          {!extractTasks.data ? (
            <>
              <button
                onClick={handleClose}
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleExtract}
                disabled={!text.trim() || extractTasks.isPending}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {extractTasks.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Extract Tasks
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  extractTasks.reset();
                  setSelectedTasks(new Set());
                }}
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
              >
                Start Over
              </button>
              <button
                onClick={handleImport}
                disabled={selectedTasks.size === 0 || createTask.isPending || importedCount > 0}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  importedCount > 0
                    ? "bg-green-600 text-white cursor-default"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                }`}
              >
                {importedCount > 0 ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    {importedCount} Task{importedCount !== 1 ? "s" : ""} Imported!
                  </>
                ) : createTask.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Import {selectedTasks.size} Task{selectedTasks.size !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

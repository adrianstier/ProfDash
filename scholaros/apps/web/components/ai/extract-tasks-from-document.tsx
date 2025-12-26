"use client";

import { useState } from "react";
import {
  X,
  Loader2,
  FileText,
  CheckSquare,
  AlertCircle,
  Plus,
  Flag,
  Calendar,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { DocumentUpload } from "@/components/documents/document-upload";
import { useProcessDocument } from "@/lib/hooks/use-documents";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { PRIORITY_LABELS, CATEGORY_LABELS } from "@scholaros/shared";
import type { TaskPriority, TaskCategory } from "@scholaros/shared";

interface ExtractTasksFromDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtractedTask {
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  due_date?: string;
  assignee?: string;
  context?: string;
}

const priorityColors: Record<string, string> = {
  p1: "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300",
  p2: "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300",
  p3: "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
  p4: "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
};

type Step = "upload" | "processing" | "review" | "importing" | "complete";

export function ExtractTasksFromDocumentModal({
  isOpen,
  onClose,
}: ExtractTasksFromDocumentModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [_documentId, setDocumentId] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [importedCount, setImportedCount] = useState(0);

  const { currentWorkspaceId } = useWorkspaceStore();
  const processDocument = useProcessDocument();
  const createTask = useCreateTask();

  const handleUploadComplete = async (docId: string) => {
    setDocumentId(docId);
    setStep("processing");

    try {
      const result = await processDocument.mutateAsync({
        id: docId,
        extraction_type: "tasks",
        context: "Extract all actionable tasks from this document",
      });

      const data = result.data as {
        tasks?: ExtractedTask[];
        total_tasks?: number;
      };

      if (data.tasks && data.tasks.length > 0) {
        setExtractedTasks(data.tasks);
        setSelectedTasks(new Set(data.tasks.map((_, i) => i)));
        setStep("review");
      } else {
        setExtractedTasks([]);
        setStep("review");
      }
    } catch (error) {
      console.error("Processing failed:", error);
    }
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
    if (extractedTasks.length === 0) return;

    setStep("importing");

    const tasksToImport = extractedTasks.filter((_, i) => selectedTasks.has(i));

    let imported = 0;
    for (const task of tasksToImport) {
      try {
        await createTask.mutateAsync({
          title: task.title,
          description: task.description || undefined,
          priority: task.priority || "p3",
          category: task.category || "misc",
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
    setStep("complete");
  };

  const handleClose = () => {
    setStep("upload");
    setDocumentId(null);
    setExtractedTasks([]);
    setSelectedTasks(new Set());
    setImportedCount(0);
    processDocument.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border bg-card shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Extract Tasks from Document
            </h2>
          </div>
          <button onClick={handleClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-4 border-b px-6 py-4">
          {(["upload", "processing", "review"] as const).map((s, i) => {
            const isActive = step === s || (s === "review" && (step === "importing" || step === "complete"));
            const isCompleted =
              step === "complete" ||
              (s === "upload" && step !== "upload") ||
              (s === "processing" && ["review", "importing", "complete"].includes(step));

            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-green-100 text-green-600 dark:bg-green-900"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <span className="text-sm capitalize">{s}</span>
                {i < 2 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Upload a document (meeting notes, project plan, email, etc.) and
                our AI will automatically extract actionable tasks.
              </p>
              <DocumentUpload
                workspaceId={currentWorkspaceId ?? undefined}
                onUploadComplete={handleUploadComplete}
                onCancel={handleClose}
              />
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12">
              {processDocument.isPending ? (
                <>
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Analyzing document...</p>
                  <p className="text-sm text-muted-foreground">
                    Extracting tasks and action items
                  </p>
                </>
              ) : processDocument.isError ? (
                <>
                  <div className="mb-4 rounded-full bg-red-100 p-3 dark:bg-red-900">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-lg font-medium">Processing Failed</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {processDocument.error instanceof Error
                      ? processDocument.error.message
                      : "An error occurred"}
                  </p>
                  <button
                    onClick={() => setStep("upload")}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Try Again
                  </button>
                </>
              ) : null}
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              {extractedTasks.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Found {extractedTasks.length} tasks
                    </p>
                    <button
                      onClick={() => {
                        if (selectedTasks.size === extractedTasks.length) {
                          setSelectedTasks(new Set());
                        } else {
                          setSelectedTasks(
                            new Set(extractedTasks.map((_, i) => i))
                          );
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedTasks.size === extractedTasks.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {extractedTasks.map((task, index) => (
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
                                priorityColors[task.priority] ||
                                priorityColors.p3
                              }`}
                            >
                              <Flag className="h-3 w-3" />
                              {PRIORITY_LABELS[task.priority] || "Medium"}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              {CATEGORY_LABELS[task.category] || "Misc"}
                            </span>
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="text-xs text-muted-foreground">
                                Assigned: {task.assignee}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckSquare className="mx-auto mb-2 h-8 w-8" />
                  <p>No tasks found in the document</p>
                  <p className="text-sm">
                    The document may not contain actionable items
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Importing tasks...</p>
            </div>
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium">
                {importedCount} Task{importedCount !== 1 ? "s" : ""} Imported!
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Tasks have been added to your list
              </p>
              <button
                onClick={handleClose}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && extractedTasks.length > 0 && (
          <div className="flex justify-end gap-2 border-t p-4">
            <button
              onClick={() => setStep("upload")}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Start Over
            </button>
            <button
              onClick={handleImport}
              disabled={selectedTasks.size === 0}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Import {selectedTasks.size} Task{selectedTasks.size !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

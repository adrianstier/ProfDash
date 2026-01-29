"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileImage,
  FileText,
  Loader2,
  Check,
  X,
  Plus,
  Flag,
  Calendar,
  User,
  Upload,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LegacyDialog as Dialog } from "@/components/ui/dialog";
import { useFileParsing, type ParseFileResult } from "@/lib/hooks/use-ai";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";
import type { TaskCategory } from "@scholaros/shared";

const SUPPORTED_TYPES = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/gif": "GIF",
  "image/webp": "WebP",
  "application/pdf": "PDF",
};

const PRIORITY_CONFIG = {
  p1: { label: "Urgent", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  p2: { label: "High", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  p3: { label: "Normal", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  p4: { label: "Low", color: "text-gray-500 bg-gray-500/10 border-gray-500/30" },
};

interface FileParserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export function FileParserModal({
  open,
  onOpenChange,
  projectId,
}: FileParserModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ParseFileResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parse = useFileParsing();
  const createTask = useCreateTask();

  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);

    // Check file type
    if (!Object.keys(SUPPORTED_TYPES).includes(selectedFile.type)) {
      setError(`Unsupported file type. Supported: ${Object.values(SUPPORTED_TYPES).join(", ")}`);
      return;
    }

    // Check file size (20MB limit)
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("File too large. Maximum size is 20MB.");
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleParse = async () => {
    if (!currentWorkspaceId || !file) return;

    try {
      const parseResult = await parse.mutateAsync({
        file,
        workspace_id: currentWorkspaceId,
      });
      setResult(parseResult);
      setSelectedTasks(new Set(parseResult.tasks.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const handleImport = async () => {
    if (!result || !currentWorkspaceId) return;

    const tasksToImport = result.tasks.filter((_, i) => selectedTasks.has(i));
    let imported = 0;

    for (const task of tasksToImport) {
      try {
        await createTask.mutateAsync({
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: (task.category || "misc") as TaskCategory,
          due: task.due_date,
          status: "todo",
          workspace_id: currentWorkspaceId,
          project_id: projectId,
        });
        imported++;
      } catch {
        // Continue with other tasks
      }
    }

    setImportedCount(imported);
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setSelectedTasks(new Set());
    setImportedCount(0);
    setError(null);
    onOpenChange(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      title="File Parser"
      description="Upload a PDF or image to extract tasks using AI vision."
      size="lg"
      icon={<FileImage className="h-5 w-5 text-purple-500" />}
    >
      <div className="space-y-4">
        {/* Upload section */}
        {!result && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {file ? (
                <div className="flex items-center justify-center gap-4">
                  {preview ? (
                    // Using img for dynamic data URL preview from FileReader
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-32 rounded-lg border"
                    />
                  ) : (
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]} · {formatFileSize(file.size)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreview(null);
                      }}
                      className="text-sm text-red-500 hover:underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">
                    Drop a file here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports: JPEG, PNG, GIF, WebP, PDF (max 20MB)
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Result section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Document summary */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Document Analysis</h4>
                <Badge variant="outline">{result.document_type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.summary}</p>

              {/* Key info */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {result.page_count && (
                  <span>{result.page_count} page{result.page_count !== 1 ? "s" : ""}</span>
                )}
                {result.key_people.length > 0 && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {result.key_people.slice(0, 3).join(", ")}
                    {result.key_people.length > 3 && ` +${result.key_people.length - 3}`}
                  </span>
                )}
                {result.key_dates.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {result.key_dates.slice(0, 2).join(", ")}
                    {result.key_dates.length > 2 && ` +${result.key_dates.length - 2}`}
                  </span>
                )}
              </div>
            </div>

            {/* Extracted text snippet */}
            {result.extracted_text && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <h4 className="text-sm font-medium mb-2">Extracted Text</h4>
                <p className="text-xs text-muted-foreground line-clamp-4">
                  {result.extracted_text}
                </p>
              </div>
            )}

            {/* Extracted tasks */}
            {result.tasks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Extracted Tasks ({result.tasks.length})</h4>
                  <button
                    onClick={() => {
                      if (selectedTasks.size === result.tasks.length) {
                        setSelectedTasks(new Set());
                      } else {
                        setSelectedTasks(new Set(result.tasks.map((_, i) => i)));
                      }
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedTasks.size === result.tasks.length ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <div className="max-h-[250px] overflow-y-auto space-y-2">
                  {result.tasks.map((task, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedTasks.has(index)
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                      )}
                      onClick={() => toggleTask(index)}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors mt-0.5",
                          selectedTasks.has(index)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedTasks.has(index) && <Check className="h-3 w-3" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", PRIORITY_CONFIG[task.priority].color)}
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            {PRIORITY_CONFIG[task.priority].label}
                          </Badge>
                          {task.category && (
                            <Badge variant="outline" className="text-xs">
                              {task.category}
                            </Badge>
                          )}
                          {task.due_date && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {task.due_date}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(task.confidence * 100)}% confident
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 h-8 w-8" />
                <p>No tasks found in the document</p>
                <p className="text-sm">
                  Try uploading a document with clear action items
                </p>
              </div>
            )}

            {/* Import success */}
            {importedCount > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>
                  Successfully imported {importedCount} task{importedCount !== 1 ? "s" : ""}!
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        {result ? (
          <>
            <Button variant="outline" onClick={() => setResult(null)}>
              <X className="h-4 w-4 mr-2" />
              Upload Different File
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedTasks.size === 0 || createTask.isPending || importedCount > 0}
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Import {selectedTasks.size} Task{selectedTasks.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleParse} disabled={!file || parse.isPending}>
              {parse.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileImage className="h-4 w-4 mr-2" />
                  Parse File
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

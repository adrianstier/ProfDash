"use client";

import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/app/providers";
import { cn } from "@/lib/utils";

interface ImportResult {
  success: boolean;
  imported?: number;
  failed?: number;
  total?: number;
  errors?: string[];
}

export function ImportExportModal() {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspaceId } = useWorkspaceStore();
  const queryClient = useQueryClient();

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (currentWorkspaceId) {
        params.set("workspace_id", currentWorkspaceId);
      }
      params.set("format", format);

      const response = await fetch(`/api/tasks/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      if (format === "json") {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        downloadBlob(blob, `tasks-export-${new Date().toISOString().split("T")[0]}.json`);
      } else {
        const blob = await response.blob();
        downloadBlob(blob, `tasks-export-${new Date().toISOString().split("T")[0]}.csv`);
      }
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (currentWorkspaceId) {
        formData.append("workspace_id", currentWorkspaceId);
      }

      const response = await fetch("/api/tasks/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setImportResult({
          success: false,
          errors: [result.error || "Import failed"],
        });
        return;
      }

      setImportResult({
        success: true,
        imported: result.imported,
        failed: result.failed,
        total: result.total,
        errors: result.errors,
      });

      // Refresh tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        errors: ["Failed to import tasks"],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      handleImport(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import/Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import & Export Tasks</DialogTitle>
          <DialogDescription>
            Import tasks from CSV or export your tasks for backup
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Download all your tasks in CSV or JSON format.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={isExporting}
                className="h-auto py-4 flex-col gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                )}
                <span>Export as CSV</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={isExporting}
                className="h-auto py-4 flex-col gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <FileJson className="h-8 w-8 text-blue-600" />
                )}
                <span>Export as JSON</span>
              </Button>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">Exported fields:</p>
              <p className="text-muted-foreground">
                Title, Description, Status, Priority, Category, Due Date
              </p>
            </div>
          </TabsContent>

          <TabsContent value="import" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Import tasks from a CSV file. Required column: <strong>Title</strong>.
              Optional: Description, Status, Priority, Category, Due Date.
            </p>

            {/* Drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                isImporting && "opacity-50 pointer-events-none"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {isImporting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-medium">Importing tasks...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground">
                    or{" "}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline"
                    >
                      browse files
                    </button>
                  </p>
                </div>
              )}
            </div>

            {/* Import result */}
            <AnimatePresence>
              {importResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "rounded-lg p-4",
                    importResult.success
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {importResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {importResult.success ? (
                        <>
                          <p className="font-medium text-green-900 dark:text-green-100">
                            Import complete
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Successfully imported {importResult.imported} of{" "}
                            {importResult.total} tasks
                            {importResult.failed
                              ? ` (${importResult.failed} failed)`
                              : ""}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-red-900 dark:text-red-100">
                            Import failed
                          </p>
                          {importResult.errors?.map((error, i) => (
                            <p
                              key={i}
                              className="text-sm text-red-700 dark:text-red-300"
                            >
                              {error}
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setImportResult(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CSV format help */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-2">CSV Format Example:</p>
              <code className="block bg-background rounded p-2 text-xs overflow-x-auto">
                Title,Description,Status,Priority,Category,Due Date
                <br />
                &quot;Write paper&quot;,&quot;First draft&quot;,todo,p1,research,2024-12-31
                <br />
                &quot;Grade exams&quot;,,progress,p2,teaching,
              </code>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  FileJson,
  Database,
} from "lucide-react";
import {
  extractV1Data,
  validateV1Data,
  convertProject,
  convertTask,
  exportV1DataAsJson,
  parseImportData,
  hasV1Data,
  clearV1Data,
} from "@/lib/migration/import-v1-data";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = "source" | "preview" | "importing" | "complete";

export function ImportDataModal({ isOpen, onClose }: ImportDataModalProps) {
  const [step, setStep] = useState<ImportStep>("source");
  const [source, setSource] = useState<"localStorage" | "file" | null>(null);
  const [importData, setImportData] = useState<{
    tasks: unknown[];
    projects: unknown[];
  } | null>(null);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [importProgress, setImportProgress] = useState({
    projectsImported: 0,
    tasksImported: 0,
    errors: [] as string[],
  });

  const { currentWorkspaceId } = useWorkspaceStore();

  const hasLocalData = hasV1Data();

  const handleExtractLocalStorage = () => {
    const data = extractV1Data();
    const validationResult = validateV1Data(data);
    setImportData(data);
    setValidation(validationResult);
    setSource("localStorage");
    setStep("preview");
  };

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsed = parseImportData(content);
        if (parsed) {
          const validationResult = validateV1Data(parsed);
          setImportData(parsed);
          setValidation(validationResult);
          setSource("file");
          setStep("preview");
        } else {
          setValidation({
            valid: false,
            errors: ["Failed to parse JSON file. Please check the format."],
            warnings: [],
          });
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const handleExportBackup = () => {
    const jsonData = exportV1DataAsJson();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profdash-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartImport = async () => {
    if (!importData || !currentWorkspaceId) return;

    setStep("importing");

    const projectIdMap = new Map<string, string>();
    const errors: string[] = [];

    try {
      // Import projects first
      for (const v1Project of importData.projects as Parameters<typeof convertProject>[0][]) {
        try {
          const v2Project = convertProject(v1Project, currentWorkspaceId);
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(v2Project),
          });

          if (response.ok) {
            const created = await response.json();
            projectIdMap.set(v1Project.id, created.id);
            setImportProgress((prev) => ({
              ...prev,
              projectsImported: prev.projectsImported + 1,
            }));
          } else {
            errors.push(`Failed to import project: ${v1Project.title}`);
          }
        } catch {
          errors.push(`Error importing project: ${v1Project.title}`);
        }
      }

      // Import tasks
      for (const v1Task of importData.tasks as { id: string; title: string }[]) {
        try {
          const v2Task = convertTask(v1Task as Parameters<typeof convertTask>[0], projectIdMap);
          v2Task.workspace_id = currentWorkspaceId;

          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(v2Task),
          });

          if (response.ok) {
            setImportProgress((prev) => ({
              ...prev,
              tasksImported: prev.tasksImported + 1,
            }));
          } else {
            errors.push(`Failed to import task: ${v1Task.title}`);
          }
        } catch {
          errors.push(`Error importing task: ${v1Task.title}`);
        }
      }

      setImportProgress((prev) => ({ ...prev, errors }));
      setStep("complete");

      // Clear localStorage data if imported from there
      if (source === "localStorage" && errors.length === 0) {
        clearV1Data();
      }
    } catch {
      errors.push("An unexpected error occurred during import");
      setImportProgress((prev) => ({ ...prev, errors }));
      setStep("complete");
    }
  };

  const handleClose = () => {
    setStep("source");
    setSource(null);
    setImportData(null);
    setValidation(null);
    setImportProgress({ projectsImported: 0, tasksImported: 0, errors: [] });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Import Data</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === "source" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Import your tasks and projects from ProfDash v1 or a backup file.
              </p>

              {/* Import from localStorage */}
              <button
                onClick={handleExtractLocalStorage}
                disabled={!hasLocalData}
                className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Import from Browser</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasLocalData
                      ? "Found existing ProfDash v1 data in this browser"
                      : "No ProfDash v1 data found in this browser"}
                  </p>
                </div>
              </button>

              {/* Import from file */}
              <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border p-4 text-left hover:bg-muted">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <FileJson className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Import from File</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a JSON backup file
                  </p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </label>

              {/* Export backup */}
              {hasLocalData && (
                <div className="border-t pt-4">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    Download backup of current browser data
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "preview" && importData && validation && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-2 font-medium">Data to Import</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-2xl font-bold">
                      {importData.projects.length}
                    </span>
                    <span className="ml-1 text-muted-foreground">projects</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {importData.tasks.length}
                    </span>
                    <span className="ml-1 text-muted-foreground">tasks</span>
                  </div>
                </div>
              </div>

              {/* Validation results */}
              {validation.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Errors</span>
                  </div>
                  <ul className="mt-2 list-inside list-disc text-sm text-red-600 dark:text-red-300">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Warnings</span>
                  </div>
                  <ul className="mt-2 list-inside list-disc text-sm text-yellow-600 dark:text-yellow-300">
                    {validation.warnings.slice(0, 5).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                    {validation.warnings.length > 5 && (
                      <li>...and {validation.warnings.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {validation.valid && validation.warnings.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Data validated successfully</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setStep("source")}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleStartImport}
                  disabled={!validation.valid}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Start Import
                </button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h3 className="font-medium">Importing your data...</h3>
              <div className="text-sm text-muted-foreground">
                <p>Projects: {importProgress.projectsImported}</p>
                <p>Tasks: {importProgress.tasksImported}</p>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-4">
              {importProgress.errors.length === 0 ? (
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
                  <h3 className="font-medium">Import Complete!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Successfully imported {importProgress.projectsImported}{" "}
                    projects and {importProgress.tasksImported} tasks.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
                  <h3 className="font-medium">Import Completed with Errors</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Imported {importProgress.projectsImported} projects and{" "}
                    {importProgress.tasksImported} tasks.
                  </p>
                  <div className="mt-4 max-h-32 overflow-auto rounded-lg border p-2 text-left text-sm">
                    {importProgress.errors.map((error, i) => (
                      <p key={i} className="text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

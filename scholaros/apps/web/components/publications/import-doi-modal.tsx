"use client";

import { useState } from "react";
import { X, Link2, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useImportFromDOI } from "@/lib/hooks/use-publications";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

interface ImportDOIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportDOIModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportDOIModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const importFromDOI = useImportFromDOI();

  const [doi, setDoi] = useState("");
  const [importedPublication, setImportedPublication] = useState<{
    title: string;
    authors: string;
    journal?: string;
    year?: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!doi.trim()) return;

    try {
      const result = await importFromDOI.mutateAsync({
        doi: doi.trim(),
        workspace_id: currentWorkspaceId || undefined,
      });

      // Show success state with imported publication info
      setImportedPublication({
        title: result.title,
        authors:
          result.publication_authors
            ?.map((a) => a.name)
            .slice(0, 3)
            .join(", ") +
          (result.publication_authors && result.publication_authors.length > 3
            ? " et al."
            : ""),
        journal: result.journal || undefined,
        year: result.year || undefined,
      });

      // Close after a delay and trigger success callback
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 2000);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Import failed:", error);
    }
  };

  const handleClose = () => {
    setDoi("");
    setImportedPublication(null);
    importFromDOI.reset();
    onClose();
  };

  // Parse error message for "already exists" case
  const getErrorInfo = () => {
    if (!importFromDOI.error) return null;
    const message = importFromDOI.error.message;

    if (message.includes("|")) {
      const [msg, existingId] = message.split("|");
      return { message: msg, existingId };
    }

    return { message };
  };

  const errorInfo = getErrorInfo();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Import from DOI</h2>
          </div>
          <button onClick={handleClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {importedPublication ? (
            // Success state
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="mb-2 text-lg font-medium">Publication Imported!</p>
              <p className="mb-1 text-sm font-medium">
                {importedPublication.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {importedPublication.authors}
              </p>
              {importedPublication.journal && (
                <p className="text-sm italic text-muted-foreground">
                  {importedPublication.journal}
                  {importedPublication.year && ` (${importedPublication.year})`}
                </p>
              )}
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  DOI or URL
                </label>
                <input
                  type="text"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="10.1000/xyz123 or https://doi.org/..."
                  disabled={importFromDOI.isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter a DOI or a DOI URL to automatically import publication
                  metadata from CrossRef.
                </p>
              </div>

              {importFromDOI.isError && errorInfo && (
                <div className="rounded-md bg-red-50 p-3 dark:bg-red-950/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm text-red-600">{errorInfo.message}</p>
                      {errorInfo.existingId && (
                        <a
                          href={`/publications/${errorInfo.existingId}`}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                        >
                          View existing publication
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  disabled={importFromDOI.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!doi.trim() || importFromDOI.isPending}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {importFromDOI.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Import
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

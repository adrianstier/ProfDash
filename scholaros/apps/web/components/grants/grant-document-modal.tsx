"use client";

import { useState } from "react";
import {
  X,
  Brain,
  CheckCircle,
  ArrowRight,
  FileText,
  Loader2,
} from "lucide-react";
import { DocumentUpload } from "@/components/documents/document-upload";
import { useProcessDocument } from "@/lib/hooks/use-documents";

type Step = "upload" | "processing" | "review" | "complete";

interface GrantDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onGrantDataExtracted?: (data: GrantEntryData) => void;
}

interface GrantEntryData {
  title: string;
  agency?: string | null;
  description?: string | null;
  deadline?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  eligibility?: Record<string, unknown> | null;
  url?: string | null;
  focus_areas?: string[] | null;
}

export function GrantDocumentModal({
  isOpen,
  onClose,
  workspaceId,
  onGrantDataExtracted,
}: GrantDocumentModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<GrantEntryData | null>(
    null
  );
  // Used for future feature: re-processing document or showing raw vs edited
  void documentId;
  void extractedData;
  const [editedData, setEditedData] = useState<GrantEntryData | null>(null);

  const processDocument = useProcessDocument();

  const handleUploadComplete = async (docId: string) => {
    setDocumentId(docId);
    setStep("processing");

    // Automatically start processing
    try {
      const result = await processDocument.mutateAsync({
        id: docId,
        extraction_type: "grant_opportunity",
        context: "This is a grant opportunity or RFP document",
      });

      const rawData = result.data as Record<string, unknown>;
      const data: GrantEntryData = {
        title: (rawData.title as string) || "Untitled Grant",
        agency: rawData.agency as string | null,
        description: rawData.description as string | null,
        deadline: rawData.deadline as string | null,
        amount_min: rawData.amount_min as number | null,
        amount_max: rawData.amount_max as number | null,
        eligibility: rawData.eligibility as Record<string, unknown> | null,
        url: rawData.url as string | null,
        focus_areas: rawData.focus_areas as string[] | null,
      };
      setExtractedData(data);
      setEditedData(data);
      setStep("review");
    } catch (error) {
      console.error("Processing failed:", error);
      // Stay on processing step to show error
    }
  };

  const handleFieldChange = (field: keyof GrantEntryData, value: string) => {
    if (!editedData) return;

    let parsedValue: unknown = value;

    // Handle numeric fields
    if (field === "amount_min" || field === "amount_max") {
      parsedValue = value ? parseFloat(value) : null;
    }

    // Handle array fields
    if (field === "focus_areas") {
      parsedValue = value
        ? value.split(",").map((s) => s.trim())
        : null;
    }

    setEditedData({ ...editedData, [field]: parsedValue });
  };

  const handleConfirm = () => {
    if (editedData) {
      onGrantDataExtracted?.(editedData);
      setStep("complete");
    }
  };

  const handleClose = () => {
    setStep("upload");
    setDocumentId(null);
    setExtractedData(null);
    setEditedData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Import Grant from Document</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-4 border-b px-6 py-4">
          {(["upload", "processing", "review"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step === "complete" ||
                        (s === "upload" && step !== "upload") ||
                        (s === "processing" && step === "review")
                      ? "bg-green-100 text-green-600 dark:bg-green-900"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {(step === "complete" ||
                  (s === "upload" && step !== "upload") ||
                  (s === "processing" && step === "review")) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span className="text-sm capitalize">{s}</span>
              {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Upload a grant announcement, RFP, or funding opportunity
                document. Our AI will extract the key details automatically.
              </p>
              <DocumentUpload
                workspaceId={workspaceId}
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
                    Our AI is extracting grant information
                  </p>
                </>
              ) : processDocument.isError ? (
                <>
                  <div className="mb-4 rounded-full bg-red-100 p-3 dark:bg-red-900">
                    <X className="h-8 w-8 text-red-600" />
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

          {step === "review" && editedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700 dark:bg-green-950/20 dark:text-green-400">
                <Brain className="h-5 w-5" />
                <span>AI extracted the following information. Review and edit as needed.</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editedData.title || ""}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Agency
                    </label>
                    <input
                      type="text"
                      value={editedData.agency || ""}
                      onChange={(e) =>
                        handleFieldChange("agency", e.target.value)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={editedData.deadline?.split("T")[0] || ""}
                      onChange={(e) =>
                        handleFieldChange("deadline", e.target.value)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Min Amount ($)
                    </label>
                    <input
                      type="number"
                      value={editedData.amount_min || ""}
                      onChange={(e) =>
                        handleFieldChange("amount_min", e.target.value)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Max Amount ($)
                    </label>
                    <input
                      type="number"
                      value={editedData.amount_max || ""}
                      onChange={(e) =>
                        handleFieldChange("amount_max", e.target.value)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    value={editedData.description || ""}
                    onChange={(e) =>
                      handleFieldChange("description", e.target.value)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Focus Areas (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editedData.focus_areas?.join(", ") || ""}
                    onChange={(e) =>
                      handleFieldChange("focus_areas", e.target.value)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2"
                    placeholder="e.g., climate, renewable energy, sustainability"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">URL</label>
                  <input
                    type="url"
                    value={editedData.url || ""}
                    onChange={(e) => handleFieldChange("url", e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setStep("upload")}
                  className="rounded-md px-4 py-2 text-sm hover:bg-muted"
                >
                  Start Over
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!editedData.title}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Add to Watchlist
                </button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium">Grant Added Successfully</p>
              <p className="mb-4 text-sm text-muted-foreground">
                The grant has been added to your watchlist
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
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  X,
  Brain,
  CheckCircle,
  ArrowRight,
  Loader2,
  User,
} from "lucide-react";
import { DocumentUpload } from "@/components/documents/document-upload";
import { useProcessDocument } from "@/lib/hooks/use-documents";
import type { PersonnelRole } from "@scholaros/shared";

type Step = "upload" | "processing" | "review" | "complete";

interface CVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onPersonnelDataExtracted?: (data: PersonnelData) => void;
}

interface PersonnelData {
  name: string;
  email?: string | null;
  role?: PersonnelRole;
  year?: number | null;
  funding?: string | null;
  notes?: string | null;
  // Extended CV data
  institution?: string | null;
  department?: string | null;
  title?: string | null;
  research_interests?: string[];
  publications_count?: number | null;
}

const roleOptions: Array<{ value: PersonnelRole; label: string }> = [
  { value: "phd-student", label: "PhD Student" },
  { value: "postdoc", label: "Postdoc" },
  { value: "undergrad", label: "Undergrad" },
  { value: "staff", label: "Staff" },
  { value: "collaborator", label: "Collaborator" },
];

export function CVImportModal({
  isOpen,
  onClose,
  workspaceId,
  onPersonnelDataExtracted,
}: CVImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<PersonnelData | null>(
    null
  );
  // Used for future feature: re-processing document or showing raw vs edited
  void documentId;
  void extractedData;
  const [editedData, setEditedData] = useState<PersonnelData | null>(null);

  const processDocument = useProcessDocument();

  const handleUploadComplete = async (docId: string) => {
    setDocumentId(docId);
    setStep("processing");

    try {
      const result = await processDocument.mutateAsync({
        id: docId,
        extraction_type: "cv_resume",
        context: "This is a CV or resume for a researcher/academic",
      });

      // Map the extracted data to personnel format
      const cvData = result.data as Record<string, unknown>;
      const personnelData: PersonnelData = {
        name: (cvData.name as string) || "Unknown",
        email: cvData.email as string | null,
        institution: cvData.institution as string | null,
        department: cvData.department as string | null,
        title: cvData.title as string | null,
        research_interests: cvData.research_interests as string[] | undefined,
        publications_count: cvData.publications_count as number | null,
        // Infer role from title if possible
        role: inferRoleFromTitle(cvData.title as string | null),
        // Use research interests as notes
        notes: formatResearchInterests(cvData.research_interests as string[] | undefined),
      };

      setExtractedData(personnelData);
      setEditedData(personnelData);
      setStep("review");
    } catch (error) {
      console.error("Processing failed:", error);
    }
  };

  const inferRoleFromTitle = (title: string | null): PersonnelRole => {
    if (!title) return "collaborator";
    const titleLower = title.toLowerCase();
    // Check postdoc FIRST since "postdoctoral" contains "doctoral"
    if (titleLower.includes("postdoc")) {
      return "postdoc";
    }
    if (titleLower.includes("phd") || titleLower.includes("doctoral")) {
      return "phd-student";
    }
    if (
      titleLower.includes("undergrad") ||
      titleLower.includes("bachelor")
    ) {
      return "undergrad";
    }
    if (
      titleLower.includes("technician") ||
      titleLower.includes("coordinator") ||
      titleLower.includes("manager")
    ) {
      return "staff";
    }
    return "collaborator";
  };

  const formatResearchInterests = (interests: string[] | undefined): string | null => {
    if (!interests || interests.length === 0) return null;
    return `Research interests: ${interests.join(", ")}`;
  };

  const handleFieldChange = (
    field: keyof PersonnelData,
    value: string | number | null
  ) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value });
  };

  const handleConfirm = () => {
    if (editedData) {
      onPersonnelDataExtracted?.(editedData);
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
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Import from CV/Resume</h2>
          </div>
          <button onClick={handleClose} className="rounded p-1 hover:bg-muted">
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
                {step === "complete" ||
                (s === "upload" && step !== "upload") ||
                (s === "processing" && step === "review") ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span className="text-sm capitalize">{s}</span>
              {i < 2 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Upload a CV or resume to automatically extract personnel
                information. Our AI will parse the document and fill in the
                details.
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
                  <p className="text-lg font-medium">Analyzing CV...</p>
                  <p className="text-sm text-muted-foreground">
                    Extracting name, education, experience, and more
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
                <span>
                  AI extracted the following information. Review and edit as
                  needed.
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editedData.name || ""}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Role
                    </label>
                    <select
                      value={editedData.role || "collaborator"}
                      onChange={(e) =>
                        handleFieldChange("role", e.target.value)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editedData.email || ""}
                      onChange={(e) =>
                        handleFieldChange("email", e.target.value || null)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Institution
                    </label>
                    <input
                      type="text"
                      value={editedData.institution || ""}
                      onChange={(e) =>
                        handleFieldChange("institution", e.target.value || null)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      From CV (not stored in personnel)
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editedData.title || ""}
                      onChange={(e) =>
                        handleFieldChange("title", e.target.value || null)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      From CV (not stored in personnel)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Notes
                  </label>
                  <textarea
                    value={editedData.notes || ""}
                    onChange={(e) =>
                      handleFieldChange("notes", e.target.value || null)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2"
                    rows={3}
                    placeholder="Research interests, projects, etc."
                  />
                </div>

                {editedData.publications_count && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <span className="font-medium">Publications found:</span>{" "}
                    ~{editedData.publications_count}
                  </div>
                )}
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
                  disabled={!editedData.name}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Add Person
                </button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium">Person Added Successfully</p>
              <p className="mb-4 text-sm text-muted-foreground">
                The person has been added to your personnel list
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

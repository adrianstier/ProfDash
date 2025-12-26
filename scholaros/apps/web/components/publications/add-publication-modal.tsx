"use client";

import { useState } from "react";
import { X, Plus, Trash2, Users, Loader2 } from "lucide-react";
import {
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_STATUS_LABELS,
  AUTHOR_ROLE_LABELS,
  type PublicationType,
  type PublicationStatus,
  type AuthorRole,
} from "@scholaros/shared";
import { useCreatePublication } from "@/lib/hooks/use-publications";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { VoiceInputInline } from "@/components/voice";

interface AddPublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuthorInput {
  name: string;
  email?: string;
  affiliation?: string;
  orcid?: string;
  author_role: AuthorRole;
  is_corresponding: boolean;
}

const PUBLICATION_TYPES = Object.entries(PUBLICATION_TYPE_LABELS) as [
  PublicationType,
  string
][];

const PUBLICATION_STATUSES = Object.entries(PUBLICATION_STATUS_LABELS) as [
  PublicationStatus,
  string
][];

const AUTHOR_ROLES = Object.entries(AUTHOR_ROLE_LABELS) as [AuthorRole, string][];

export function AddPublicationModal({
  isOpen,
  onClose,
}: AddPublicationModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const createPublication = useCreatePublication();

  const [title, setTitle] = useState("");
  const [publicationType, setPublicationType] =
    useState<PublicationType>("journal-article");
  const [status, setStatus] = useState<PublicationStatus>("idea");
  const [abstract, setAbstract] = useState("");
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState<number | undefined>();
  const [doi, setDoi] = useState("");
  const [targetJournal, setTargetJournal] = useState("");
  const [targetDeadline, setTargetDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [authors, setAuthors] = useState<AuthorInput[]>([
    { name: "", author_role: "first", is_corresponding: true },
  ]);

  const handleAddAuthor = () => {
    setAuthors([
      ...authors,
      { name: "", author_role: "middle", is_corresponding: false },
    ]);
  };

  const handleRemoveAuthor = (index: number) => {
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const handleAuthorChange = (
    index: number,
    field: keyof AuthorInput,
    value: string | boolean
  ) => {
    const newAuthors = [...authors];
    newAuthors[index] = { ...newAuthors[index], [field]: value };

    // If setting this author as corresponding, unset others
    if (field === "is_corresponding" && value === true) {
      newAuthors.forEach((a, i) => {
        if (i !== index) a.is_corresponding = false;
      });
    }

    setAuthors(newAuthors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const validAuthors = authors
      .filter((a) => a.name.trim())
      .map((a, i) => ({
        ...a,
        author_order: i + 1,
      }));

    try {
      await createPublication.mutateAsync({
        title: title.trim(),
        publication_type: publicationType,
        status,
        abstract: abstract.trim() || undefined,
        journal: journal.trim() || undefined,
        year: year || undefined,
        doi: doi.trim() || undefined,
        target_journal: targetJournal.trim() || undefined,
        target_deadline: targetDeadline ? new Date(targetDeadline) : undefined,
        notes: notes.trim() || undefined,
        workspace_id: currentWorkspaceId || undefined,
        authors: validAuthors,
      });

      handleClose();
    } catch (error) {
      console.error("Failed to create publication:", error);
    }
  };

  const handleClose = () => {
    setTitle("");
    setPublicationType("journal-article");
    setStatus("idea");
    setAbstract("");
    setJournal("");
    setYear(undefined);
    setDoi("");
    setTargetJournal("");
    setTargetDeadline("");
    setNotes("");
    setAuthors([{ name: "", author_role: "first", is_corresponding: true }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border bg-card shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Add Publication</h2>
          <button onClick={handleClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 rounded-md border bg-background px-3 py-2"
                  placeholder="Publication title"
                  required
                />
                <VoiceInputInline
                  onTranscription={(text) => setTitle((prev) => prev ? `${prev} ${text}` : text)}
                />
              </div>
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select
                  value={publicationType}
                  onChange={(e) =>
                    setPublicationType(e.target.value as PublicationType)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  {PUBLICATION_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as PublicationStatus)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  {PUBLICATION_STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Authors */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Authors
                </label>
                <button
                  type="button"
                  onClick={handleAddAuthor}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Add Author
                </button>
              </div>

              <div className="space-y-2">
                {authors.map((author, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-md border p-2"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={author.name}
                          onChange={(e) =>
                            handleAuthorChange(index, "name", e.target.value)
                          }
                          className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                          placeholder="Author name"
                        />
                        <select
                          value={author.author_role}
                          onChange={(e) =>
                            handleAuthorChange(
                              index,
                              "author_role",
                              e.target.value
                            )
                          }
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                        >
                          {AUTHOR_ROLES.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={author.email || ""}
                          onChange={(e) =>
                            handleAuthorChange(index, "email", e.target.value)
                          }
                          className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                          placeholder="Email (optional)"
                        />
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={author.is_corresponding}
                            onChange={(e) =>
                              handleAuthorChange(
                                index,
                                "is_corresponding",
                                e.target.checked
                              )
                            }
                            className="rounded"
                          />
                          Corresponding
                        </label>
                      </div>
                    </div>
                    {authors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAuthor(index)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Journal and Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Journal / Venue
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="e.g., Nature, ICML"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Year</label>
                <input
                  type="number"
                  value={year || ""}
                  onChange={(e) =>
                    setYear(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="2024"
                  min={1900}
                  max={2100}
                />
              </div>
            </div>

            {/* DOI */}
            <div>
              <label className="mb-1 block text-sm font-medium">DOI</label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="10.1000/xyz123"
              />
            </div>

            {/* Target journal and deadline (for drafts/submissions) */}
            {["idea", "drafting", "internal-review"].includes(status) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Target Journal
                  </label>
                  <input
                    type="text"
                    value={targetJournal}
                    onChange={(e) => setTargetJournal(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2"
                    placeholder="Where to submit?"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={targetDeadline}
                    onChange={(e) => setTargetDeadline(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>
              </div>
            )}

            {/* Abstract */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">Abstract</label>
                <VoiceInputInline
                  onTranscription={(text) => setAbstract((prev) => prev ? `${prev} ${text}` : text)}
                />
              </div>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                rows={3}
                placeholder="Publication abstract (click mic to dictate)"
              />
            </div>

            {/* Notes */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">Notes</label>
                <VoiceInputInline
                  onTranscription={(text) => setNotes((prev) => prev ? `${prev} ${text}` : text)}
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                rows={2}
                placeholder="Internal notes (click mic to dictate)"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || createPublication.isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createPublication.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Publication
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

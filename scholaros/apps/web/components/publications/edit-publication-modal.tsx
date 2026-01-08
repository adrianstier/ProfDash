"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Users, Loader2, Save, ExternalLink } from "lucide-react";
import {
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_STATUS_LABELS,
  AUTHOR_ROLE_LABELS,
  type PublicationType,
  type PublicationStatus,
  type AuthorRole,
} from "@scholaros/shared";
import {
  useUpdatePublication,
  type PublicationWithAuthors,
} from "@/lib/hooks/use-publications";
import { VoiceInputInline } from "@/components/voice";

interface EditPublicationModalProps {
  publication: PublicationWithAuthors | null;
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
  author_order: number;
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

export function EditPublicationModal({
  publication,
  isOpen,
  onClose,
}: EditPublicationModalProps) {
  const updatePublication = useUpdatePublication();

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
  const [authors, setAuthors] = useState<AuthorInput[]>([]);

  // Populate form when publication changes
  useEffect(() => {
    if (publication) {
      setTitle(publication.title);
      setPublicationType(publication.publication_type);
      setStatus(publication.status);
      setAbstract(publication.abstract || "");
      setJournal(publication.journal || "");
      setYear(publication.year || undefined);
      setDoi(publication.doi || "");
      setTargetJournal(publication.target_journal || "");
      setTargetDeadline(
        publication.target_deadline
          ? new Date(publication.target_deadline).toISOString().split("T")[0]
          : ""
      );
      setNotes(publication.notes || "");
      setAuthors(
        publication.publication_authors?.map((a, i) => ({
          name: a.name,
          email: a.email || undefined,
          affiliation: a.affiliation || undefined,
          orcid: a.orcid || undefined,
          author_role: a.author_role,
          is_corresponding: a.is_corresponding,
          author_order: a.author_order || i + 1,
        })) || []
      );
    }
  }, [publication]);

  const handleAddAuthor = () => {
    setAuthors([
      ...authors,
      {
        name: "",
        author_role: "middle",
        is_corresponding: false,
        author_order: authors.length + 1,
      },
    ]);
  };

  const handleRemoveAuthor = (index: number) => {
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const handleAuthorChange = (
    index: number,
    field: keyof AuthorInput,
    value: string | boolean | number
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

    if (!publication || !title.trim()) return;

    const validAuthors = authors
      .filter((a) => a.name.trim())
      .map((a, i) => ({
        ...a,
        author_order: i + 1,
      }));

    try {
      await updatePublication.mutateAsync({
        id: publication.id,
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
        authors: validAuthors,
      });

      onClose();
    } catch (error) {
      console.error("Failed to update publication:", error);
    }
  };

  if (!isOpen || !publication) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-xl flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Edit Publication</h2>
            {doi && (
              <a
                href={`https://doi.org/${doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View DOI
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-base flex-1"
                  placeholder="Publication title"
                  required
                />
                <VoiceInputInline
                  onTranscription={(text) =>
                    setTitle((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Type</label>
                <select
                  value={publicationType}
                  onChange={(e) =>
                    setPublicationType(e.target.value as PublicationType)
                  }
                  className="input-base w-full"
                >
                  {PUBLICATION_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PublicationStatus)}
                  className="input-base w-full"
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
                {authors.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No authors added yet
                  </p>
                ) : (
                  authors.map((author, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded-xl border p-3 bg-muted/20"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={author.name}
                            onChange={(e) =>
                              handleAuthorChange(index, "name", e.target.value)
                            }
                            className="input-base flex-1 py-1.5 text-sm"
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
                            className="input-base py-1.5 text-sm"
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
                            className="input-base flex-1 py-1.5 text-sm"
                            placeholder="Email (optional)"
                          />
                          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
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
                      <button
                        type="button"
                        onClick={() => handleRemoveAuthor(index)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Journal and Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Journal / Venue
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  className="input-base w-full"
                  placeholder="e.g., Nature, ICML"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Year</label>
                <input
                  type="number"
                  value={year || ""}
                  onChange={(e) =>
                    setYear(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="input-base w-full"
                  placeholder="2024"
                  min={1900}
                  max={2100}
                />
              </div>
            </div>

            {/* DOI */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">DOI</label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                className="input-base w-full"
                placeholder="10.1000/xyz123"
              />
            </div>

            {/* Target journal and deadline (for drafts/submissions) */}
            {["idea", "drafting", "internal-review"].includes(status) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Target Journal
                  </label>
                  <input
                    type="text"
                    value={targetJournal}
                    onChange={(e) => setTargetJournal(e.target.value)}
                    className="input-base w-full"
                    placeholder="Where to submit?"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={targetDeadline}
                    onChange={(e) => setTargetDeadline(e.target.value)}
                    className="input-base w-full"
                  />
                </div>
              </div>
            )}

            {/* Abstract */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium">Abstract</label>
                <VoiceInputInline
                  onTranscription={(text) =>
                    setAbstract((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                className="input-base w-full resize-none"
                rows={4}
                placeholder="Publication abstract"
              />
            </div>

            {/* Notes */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium">Notes</label>
                <VoiceInputInline
                  onTranscription={(text) =>
                    setNotes((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-base w-full resize-none"
                rows={2}
                placeholder="Internal notes"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t p-4 bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || updatePublication.isPending}
            className="btn-primary inline-flex items-center gap-2"
          >
            {updatePublication.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

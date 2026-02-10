"use client";

import { useState } from "react";
import { X, Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCreatePermit,
  useUpdatePermit,
  PERMIT_STATUS_CONFIG,
  PERMIT_TYPE_CONFIG,
} from "@/lib/hooks/use-permits";
import { useFieldSites } from "@/lib/hooks/use-field-sites";
import { useExperiments } from "@/lib/hooks/use-experiments";
import { parseLocalDate } from "@scholaros/shared";
import type {
  PermitWithDetails,
  PermitStatus,
  PermitType,
  PermitDocument,
} from "@scholaros/shared";

interface PermitModalProps {
  projectId: string;
  workspaceId: string;
  permit: PermitWithDetails | null;
  onClose: () => void;
}

export function PermitModal({
  projectId,
  workspaceId,
  permit,
  onClose,
}: PermitModalProps) {
  const createPermit = useCreatePermit(projectId);
  const updatePermit = useUpdatePermit(projectId);
  const { data: sites = [] } = useFieldSites(workspaceId, true);
  const { data: experiments = [] } = useExperiments(projectId);
  const isEditing = !!permit;

  const [formData, setFormData] = useState({
    title: permit?.title ?? "",
    permit_type: permit?.permit_type ?? ("iacuc" as PermitType),
    permit_number: permit?.permit_number ?? "",
    issuing_authority: permit?.issuing_authority ?? "",
    pi_name: permit?.pi_name ?? "",
    status: permit?.status ?? ("pending" as PermitStatus),
    start_date: permit?.start_date
      ? permit.start_date.split("T")[0]
      : "",
    expiration_date: permit?.expiration_date
      ? permit.expiration_date.split("T")[0]
      : "",
    renewal_reminder_days: permit?.renewal_reminder_days ?? 60,
    site_id: permit?.site_id ?? null,
    experiment_id: permit?.experiment_id ?? null,
    notes: permit?.notes ?? "",
    conditions: permit?.conditions ?? "",
    documents: permit?.documents ?? [],
  });

  const [newDocument, setNewDocument] = useState<PermitDocument>({
    name: "",
    url: "",
    uploaded_at: new Date().toISOString(),
  });

  const [activeTab, setActiveTab] = useState<"basic" | "details" | "documents">("basic");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        permit_number: formData.permit_number || undefined,
        issuing_authority: formData.issuing_authority || undefined,
        pi_name: formData.pi_name || undefined,
        start_date: formData.start_date ? parseLocalDate(formData.start_date) : undefined,
        expiration_date: formData.expiration_date
          ? parseLocalDate(formData.expiration_date)
          : undefined,
        site_id: formData.site_id || undefined,
        experiment_id: formData.experiment_id || undefined,
        notes: formData.notes || undefined,
        conditions: formData.conditions || undefined,
      };

      if (isEditing && permit) {
        await updatePermit.mutateAsync({
          permitId: permit.id,
          ...data,
        });
      } else {
        await createPermit.mutateAsync(data);
      }

      onClose();
    } catch (error) {
      console.error("Failed to save permit:", error);
    }
  };

  const addDocument = () => {
    if (newDocument.name.trim() && newDocument.url.trim()) {
      setFormData({
        ...formData,
        documents: [
          ...formData.documents,
          { ...newDocument, name: newDocument.name.trim(), uploaded_at: new Date().toISOString() },
        ],
      });
      setNewDocument({ name: "", url: "", uploaded_at: new Date().toISOString() });
    }
  };

  const removeDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    });
  };

  const isPending = createPermit.isPending || updatePermit.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Permit" : "Add Permit"}
          </h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-4">
            {(["basic", "details", "documents"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-medium capitalize",
                  activeTab === tab
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {activeTab === "basic" && (
            <>
              {/* Type & Status */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    Permit Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.permit_type}
                    onChange={(e) =>
                      setFormData({ ...formData, permit_type: e.target.value as PermitType })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(PERMIT_TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.icon} {config.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as PermitStatus })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(PERMIT_STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Permit Number */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., IACUC Protocol 2024-001"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Permit Number</label>
                  <input
                    type="text"
                    value={formData.permit_number}
                    onChange={(e) => setFormData({ ...formData, permit_number: e.target.value })}
                    placeholder="e.g., 2024-001"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Issuing Authority & PI */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Issuing Authority</label>
                  <input
                    type="text"
                    value={formData.issuing_authority}
                    onChange={(e) =>
                      setFormData({ ...formData, issuing_authority: e.target.value })
                    }
                    placeholder="e.g., UCSB IACUC"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">PI Name</label>
                  <input
                    type="text"
                    value={formData.pi_name}
                    onChange={(e) => setFormData({ ...formData, pi_name: e.target.value })}
                    placeholder="Principal Investigator"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiration_date: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reminder (days before)</label>
                  <input
                    type="number"
                    value={formData.renewal_reminder_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        renewal_reminder_days: parseInt(e.target.value) || 60,
                      })
                    }
                    min={1}
                    max={365}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "details" && (
            <>
              {/* Site & Experiment links */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Field Site</label>
                  <select
                    value={formData.site_id ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, site_id: e.target.value || null })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">No specific site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                        {site.code && ` (${site.code})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Experiment</label>
                  <select
                    value={formData.experiment_id ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, experiment_id: e.target.value || null })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">No specific experiment</option>
                    {experiments.map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        {exp.code && `${exp.code} - `}
                        {exp.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="General notes about this permit..."
                  rows={3}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {/* Conditions */}
              <div>
                <label className="text-sm font-medium">Special Conditions</label>
                <textarea
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  placeholder="Any special conditions or restrictions..."
                  rows={3}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {activeTab === "documents" && (
            <>
              {/* Document list */}
              <div>
                <label className="text-sm font-medium">Attached Documents</label>
                {formData.documents.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {formData.documents.map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded border p-2"
                      >
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          {doc.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeDocument(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No documents attached yet.
                  </p>
                )}
              </div>

              {/* Add document */}
              <div className="rounded border p-3 space-y-2">
                <h4 className="text-sm font-medium">Add Document Link</h4>
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                    placeholder="Document name"
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                  <input
                    type="url"
                    value={newDocument.url}
                    onChange={(e) => setNewDocument({ ...newDocument, url: e.target.value })}
                    placeholder="URL (https://...)"
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addDocument}
                    disabled={!newDocument.name.trim() || !newDocument.url.trim()}
                    className="flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Link to documents stored in Google Drive, Dropbox, or other cloud storage.
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.title.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Permit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

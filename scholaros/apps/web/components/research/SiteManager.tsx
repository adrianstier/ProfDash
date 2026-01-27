"use client";

import { useState } from "react";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Clock,
  Users,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFieldSites,
  useCreateFieldSite,
  useUpdateFieldSite,
  useDeleteFieldSite,
} from "@/lib/hooks/use-field-sites";
import type { FieldSiteFromAPI, CreateFieldSite, UpdateFieldSite } from "@scholaros/shared";

interface SiteManagerProps {
  workspaceId: string;
  className?: string;
}

export function SiteManager({ workspaceId, className }: SiteManagerProps) {
  const { data: sites = [], isLoading } = useFieldSites(workspaceId);
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<FieldSiteFromAPI | null>(null);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  const handleEdit = (site: FieldSiteFromAPI) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSite(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Field Sites</h3>
          <p className="text-sm text-muted-foreground">
            Manage field research locations
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </button>
      </div>

      {/* Site Form Modal */}
      {showForm && (
        <SiteFormModal
          workspaceId={workspaceId}
          site={editingSite}
          onClose={handleFormClose}
        />
      )}

      {/* Sites List */}
      {sites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h4 className="mt-4 text-lg font-medium">No field sites yet</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Add field sites to track locations for your research experiments.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Your First Site
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              isExpanded={expandedSiteId === site.id}
              onToggleExpand={() =>
                setExpandedSiteId(expandedSiteId === site.id ? null : site.id)
              }
              onEdit={() => handleEdit(site)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Site Card
// ============================================================================

interface SiteCardProps {
  site: FieldSiteFromAPI;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
}

function SiteCard({ site, isExpanded, onToggleExpand, onEdit }: SiteCardProps) {
  const deleteSite = useDeleteFieldSite();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteSite.mutateAsync(site.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete site:", error);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onToggleExpand}
          className="shrink-0 rounded p-1 hover:bg-muted"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            site.is_active ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
          )}
        >
          <MapPin className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{site.name}</h4>
            {site.code && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                {site.code}
              </span>
            )}
            {!site.is_active && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                Inactive
              </span>
            )}
          </div>
          {site.location?.country && (
            <p className="text-sm text-muted-foreground">
              {[site.location.region, site.location.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {site.timezone !== "UTC" && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{site.timezone}</span>
            </div>
          )}
          {site.access_requirements.length > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{site.access_requirements.length} permits</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded p-2 hover:bg-muted"
            title="Edit site"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded p-2 text-red-600 hover:bg-red-50"
            title="Delete site"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t px-4 py-3 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {site.description && (
              <div className="md:col-span-2">
                <p className="font-medium text-muted-foreground">Description</p>
                <p className="mt-1">{site.description}</p>
              </div>
            )}

            {site.logistics_notes && (
              <div className="md:col-span-2">
                <p className="font-medium text-muted-foreground">Logistics Notes</p>
                <p className="mt-1 whitespace-pre-line">{site.logistics_notes}</p>
              </div>
            )}

            {site.access_requirements.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground">Access Requirements</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {site.access_requirements.map((req, i) => (
                    <span
                      key={i}
                      className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {site.contacts.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground">Local Contacts</p>
                <ul className="mt-1 space-y-1">
                  {site.contacts.map((contact, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{contact.name}</span>
                      {contact.role && (
                        <span className="text-muted-foreground">({contact.role})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {site.location?.lat && site.location?.lng && (
              <div>
                <p className="font-medium text-muted-foreground">Coordinates</p>
                <p className="mt-1">
                  {site.location.lat.toFixed(4)}, {site.location.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="border-t bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Are you sure you want to delete &quot;{site.name}&quot;? This will remove the site
            from all linked experiments.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteSite.isPending}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteSite.isPending ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded border px-3 py-1.5 text-sm hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Site Form Modal
// ============================================================================

interface SiteFormModalProps {
  workspaceId: string;
  site: FieldSiteFromAPI | null;
  onClose: () => void;
}

function SiteFormModal({ workspaceId, site, onClose }: SiteFormModalProps) {
  const createSite = useCreateFieldSite();
  const updateSite = useUpdateFieldSite();
  const isEditing = !!site;

  const [formData, setFormData] = useState({
    name: site?.name ?? "",
    code: site?.code ?? "",
    description: site?.description ?? "",
    timezone: site?.timezone ?? "UTC",
    logistics_notes: site?.logistics_notes ?? "",
    is_active: site?.is_active ?? true,
    location: {
      lat: site?.location?.lat ?? undefined,
      lng: site?.location?.lng ?? undefined,
      address: site?.location?.address ?? "",
      country: site?.location?.country ?? "",
      region: site?.location?.region ?? "",
    },
    access_requirements: site?.access_requirements ?? [],
    contacts: site?.contacts ?? [],
  });

  const [newRequirement, setNewRequirement] = useState("");
  const [newContact, setNewContact] = useState({ name: "", role: "", email: "", phone: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data: CreateFieldSite | UpdateFieldSite = {
        ...formData,
        code: formData.code || undefined,
        description: formData.description || undefined,
        logistics_notes: formData.logistics_notes || undefined,
        location: Object.keys(formData.location).some(
          (k) => formData.location[k as keyof typeof formData.location]
        )
          ? formData.location
          : {},
      };

      if (isEditing && site) {
        await updateSite.mutateAsync({ id: site.id, ...data });
      } else {
        await createSite.mutateAsync({ workspace_id: workspaceId, ...data } as CreateFieldSite);
      }

      onClose();
    } catch (error) {
      console.error("Failed to save site:", error);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData({
        ...formData,
        access_requirements: [...formData.access_requirements, newRequirement.trim()],
      });
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      access_requirements: formData.access_requirements.filter((_, i) => i !== index),
    });
  };

  const addContact = () => {
    if (newContact.name.trim()) {
      setFormData({
        ...formData,
        contacts: [...formData.contacts, { ...newContact, name: newContact.name.trim() }],
      });
      setNewContact({ name: "", role: "", email: "", phone: "" });
    }
  };

  const removeContact = (index: number) => {
    setFormData({
      ...formData,
      contacts: formData.contacts.filter((_, i) => i !== index),
    });
  };

  const isPending = createSite.isPending || updateSite.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Field Site" : "Add Field Site"}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Moorea Research Station"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., MOR"
                maxLength={10}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the site..."
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h4 className="font-medium">Location</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Country</label>
                <input
                  type="text"
                  value={formData.location.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: { ...formData.location, country: e.target.value },
                    })
                  }
                  placeholder="e.g., French Polynesia"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Region</label>
                <input
                  type="text"
                  value={formData.location.region}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: { ...formData.location, region: e.target.value },
                    })
                  }
                  placeholder="e.g., Windward Islands"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Timezone</label>
                <input
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  placeholder="e.g., Pacific/Tahiti"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Access Requirements */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Requirements</label>
            <div className="flex flex-wrap gap-2">
              {formData.access_requirements.map((req, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-sm text-yellow-800"
                >
                  {req}
                  <button
                    type="button"
                    onClick={() => removeRequirement(i)}
                    className="hover:text-yellow-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="e.g., IACUC, Collection permit"
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRequirement();
                  }
                }}
              />
              <button
                type="button"
                onClick={addRequirement}
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                Add
              </button>
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Local Contacts</label>
            {formData.contacts.length > 0 && (
              <div className="space-y-2">
                {formData.contacts.map((contact, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border p-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{contact.name}</span>
                      {contact.role && (
                        <span className="text-muted-foreground"> - {contact.role}</span>
                      )}
                      {contact.email && (
                        <span className="ml-2 text-muted-foreground">{contact.email}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-2 rounded border p-2 md:grid-cols-4">
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Name"
                className="rounded-md border px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                placeholder="Role"
                className="rounded-md border px-2 py-1 text-sm"
              />
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="Email"
                className="rounded-md border px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={addContact}
                className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
              >
                Add Contact
              </button>
            </div>
          </div>

          {/* Logistics Notes */}
          <div>
            <label className="text-sm font-medium">Logistics Notes</label>
            <textarea
              value={formData.logistics_notes}
              onChange={(e) => setFormData({ ...formData, logistics_notes: e.target.value })}
              placeholder="Travel info, accommodation, equipment availability..."
              rows={3}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm">
              Active (available for new experiments)
            </label>
          </div>

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
              disabled={isPending || !formData.name.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Site"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

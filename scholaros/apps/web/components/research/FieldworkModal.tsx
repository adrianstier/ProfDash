"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  useCreateFieldworkSchedule,
  useUpdateFieldworkSchedule,
  FIELDWORK_STATUS_CONFIG,
} from "@/lib/hooks/use-fieldwork";
import { useFieldSites } from "@/lib/hooks/use-field-sites";
import { parseLocalDate } from "@scholaros/shared";
import type { FieldworkScheduleWithDetails, FieldworkStatus } from "@scholaros/shared";

interface FieldworkModalProps {
  projectId: string;
  experimentId: string;
  workspaceId: string;
  schedule: FieldworkScheduleWithDetails | null;
  onClose: () => void;
}

export function FieldworkModal({
  projectId,
  experimentId,
  workspaceId,
  schedule,
  onClose,
}: FieldworkModalProps) {
  const createSchedule = useCreateFieldworkSchedule(projectId, experimentId);
  const updateSchedule = useUpdateFieldworkSchedule(projectId, experimentId);
  const { data: sites = [] } = useFieldSites(workspaceId, true);
  const isEditing = !!schedule;

  const [formData, setFormData] = useState({
    title: schedule?.title ?? "",
    description: schedule?.description ?? "",
    status: schedule?.status ?? ("planned" as FieldworkStatus),
    site_id: schedule?.site_id ?? null,
    start_date: schedule?.start_date
      ? schedule.start_date.split("T")[0]
      : "",
    end_date: schedule?.end_date
      ? schedule.end_date.split("T")[0]
      : "",
    travel_booked: schedule?.travel_booked ?? false,
    accommodation_booked: schedule?.accommodation_booked ?? false,
    permits_verified: schedule?.permits_verified ?? false,
    logistics_notes: schedule?.logistics_notes ?? "",
    team_member_ids: schedule?.team_member_ids ?? [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        description: formData.description || undefined,
        site_id: formData.site_id || undefined,
        start_date: formData.start_date ? parseLocalDate(formData.start_date) : new Date(),
        end_date: formData.end_date ? parseLocalDate(formData.end_date) : new Date(),
        logistics_notes: formData.logistics_notes || undefined,
        team_member_ids:
          formData.team_member_ids.length > 0 ? formData.team_member_ids : undefined,
      };

      if (isEditing && schedule) {
        await updateSchedule.mutateAsync({
          scheduleId: schedule.id,
          ...data,
        });
      } else {
        await createSchedule.mutateAsync(data);
      }

      onClose();
    } catch (error) {
      console.error("Failed to save fieldwork schedule:", error);
    }
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Fieldwork Trip" : "Schedule Fieldwork Trip"}
          </h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., February Sampling Trip"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this trip..."
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Status & Site */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as FieldworkStatus })
                }
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                {Object.entries(FIELDWORK_STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Field Site</label>
              <select
                value={formData.site_id ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, site_id: e.target.value || null })
                }
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                    {site.code && ` (${site.code})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="text-sm font-medium">Preparation Checklist</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.travel_booked}
                  onChange={(e) =>
                    setFormData({ ...formData, travel_booked: e.target.checked })
                  }
                  className="rounded border"
                />
                <span className="text-sm">Travel booked</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.accommodation_booked}
                  onChange={(e) =>
                    setFormData({ ...formData, accommodation_booked: e.target.checked })
                  }
                  className="rounded border"
                />
                <span className="text-sm">Accommodation booked</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permits_verified}
                  onChange={(e) =>
                    setFormData({ ...formData, permits_verified: e.target.checked })
                  }
                  className="rounded border"
                />
                <span className="text-sm">Permits verified</span>
              </label>
            </div>
          </div>

          {/* Logistics notes */}
          <div>
            <label className="text-sm font-medium">Logistics Notes</label>
            <textarea
              value={formData.logistics_notes}
              onChange={(e) =>
                setFormData({ ...formData, logistics_notes: e.target.value })
              }
              placeholder="Transportation, accommodation details, equipment to bring..."
              rows={3}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
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
              disabled={
                isPending ||
                !formData.title.trim() ||
                !formData.start_date ||
                !formData.end_date
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Schedule Trip"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

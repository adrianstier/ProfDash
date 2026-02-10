"use client";

import { useState } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCreateExperiment,
  useUpdateExperiment,
  EXPERIMENT_STATUS_CONFIG,
} from "@/lib/hooks/use-experiments";
import { SiteSelect } from "./SiteSelect";
import { parseLocalDate } from "@scholaros/shared";
import type {
  ExperimentWithDetails,
  ExperimentStatus,
  ExperimentProtocol,
  ExperimentEquipment,
} from "@scholaros/shared";

const EXPERIMENT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
];

interface ExperimentModalProps {
  projectId: string;
  workspaceId: string;
  experiment: ExperimentWithDetails | null;
  onClose: () => void;
}

export function ExperimentModal({
  projectId,
  workspaceId,
  experiment,
  onClose,
}: ExperimentModalProps) {
  const createExperiment = useCreateExperiment(projectId);
  const updateExperiment = useUpdateExperiment(projectId);
  const isEditing = !!experiment;

  const [formData, setFormData] = useState({
    title: experiment?.title ?? "",
    code: experiment?.code ?? "",
    description: experiment?.description ?? "",
    status: experiment?.status ?? ("planning" as ExperimentStatus),
    site_id: experiment?.site_id ?? null,
    lead_id: experiment?.lead_id ?? null,
    start_date: experiment?.start_date
      ? experiment.start_date.split("T")[0]
      : "",
    end_date: experiment?.end_date
      ? experiment.end_date.split("T")[0]
      : "",
    fieldwork_start: experiment?.fieldwork_start
      ? experiment.fieldwork_start.split("T")[0]
      : "",
    fieldwork_end: experiment?.fieldwork_end
      ? experiment.fieldwork_end.split("T")[0]
      : "",
    hypothesis: experiment?.hypothesis ?? "",
    objectives: experiment?.objectives ?? [],
    protocols: experiment?.protocols ?? [],
    equipment_needs: experiment?.equipment_needs ?? [],
    sample_targets: experiment?.sample_targets ?? {},
    color: experiment?.color ?? EXPERIMENT_COLORS[0],
  });

  const [newObjective, setNewObjective] = useState("");
  const [newProtocol, setNewProtocol] = useState<ExperimentProtocol>({
    name: "",
    version: "",
    url: "",
  });
  const [newEquipment, setNewEquipment] = useState<ExperimentEquipment>({
    item: "",
    quantity: 1,
    notes: "",
  });
  const [activeTab, setActiveTab] = useState<"basic" | "details" | "protocols">("basic");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        code: formData.code || undefined,
        description: formData.description || undefined,
        site_id: formData.site_id || undefined,
        lead_id: formData.lead_id || undefined,
        start_date: formData.start_date ? parseLocalDate(formData.start_date) : undefined,
        end_date: formData.end_date ? parseLocalDate(formData.end_date) : undefined,
        fieldwork_start: formData.fieldwork_start ? parseLocalDate(formData.fieldwork_start) : undefined,
        fieldwork_end: formData.fieldwork_end ? parseLocalDate(formData.fieldwork_end) : undefined,
        hypothesis: formData.hypothesis || undefined,
      };

      if (isEditing && experiment) {
        await updateExperiment.mutateAsync({
          experimentId: experiment.id,
          ...data,
        });
      } else {
        await createExperiment.mutateAsync(data);
      }

      onClose();
    } catch (error) {
      console.error("Failed to save experiment:", error);
    }
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData({
        ...formData,
        objectives: [...formData.objectives, newObjective.trim()],
      });
      setNewObjective("");
    }
  };

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index),
    });
  };

  const addProtocol = () => {
    if (newProtocol.name.trim()) {
      setFormData({
        ...formData,
        protocols: [...formData.protocols, { ...newProtocol, name: newProtocol.name.trim() }],
      });
      setNewProtocol({ name: "", version: "", url: "" });
    }
  };

  const removeProtocol = (index: number) => {
    setFormData({
      ...formData,
      protocols: formData.protocols.filter((_, i) => i !== index),
    });
  };

  const addEquipment = () => {
    if (newEquipment.item.trim()) {
      setFormData({
        ...formData,
        equipment_needs: [
          ...formData.equipment_needs,
          { ...newEquipment, item: newEquipment.item.trim() },
        ],
      });
      setNewEquipment({ item: "", quantity: 1, notes: "" });
    }
  };

  const removeEquipment = (index: number) => {
    setFormData({
      ...formData,
      equipment_needs: formData.equipment_needs.filter((_, i) => i !== index),
    });
  };

  const isPending = createExperiment.isPending || updateExperiment.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Experiment" : "Add Experiment"}
          </h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-4">
            {(["basic", "details", "protocols"] as const).map((tab) => (
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
              {/* Title & Code */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Coral Growth Rate Study"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., EXP-001"
                    maxLength={20}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm uppercase"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the experiment..."
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
                      setFormData({ ...formData, status: e.target.value as ExperimentStatus })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(EXPERIMENT_STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Field Site</label>
                  <SiteSelect
                    workspaceId={workspaceId}
                    value={formData.site_id}
                    onChange={(siteId) => setFormData({ ...formData, site_id: siteId })}
                    placeholder="Select site..."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-4 md:grid-cols-2">
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
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Fieldwork Dates */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Fieldwork Start</label>
                  <input
                    type="date"
                    value={formData.fieldwork_start}
                    onChange={(e) =>
                      setFormData({ ...formData, fieldwork_start: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fieldwork End</label>
                  <input
                    type="date"
                    value={formData.fieldwork_end}
                    onChange={(e) =>
                      setFormData({ ...formData, fieldwork_end: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="mt-2 flex gap-2">
                  {EXPERIMENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        "h-8 w-8 rounded-full",
                        color,
                        formData.color === color && "ring-2 ring-offset-2 ring-primary"
                      )}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "details" && (
            <>
              {/* Hypothesis */}
              <div>
                <label className="text-sm font-medium">Hypothesis</label>
                <textarea
                  value={formData.hypothesis}
                  onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                  placeholder="State your research hypothesis..."
                  rows={3}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {/* Objectives */}
              <div>
                <label className="text-sm font-medium">Objectives</label>
                {formData.objectives.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {formData.objectives.map((obj, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded border p-2 text-sm"
                      >
                        <span>{obj}</span>
                        <button
                          type="button"
                          onClick={() => removeObjective(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Add an objective..."
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addObjective();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addObjective}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "protocols" && (
            <>
              {/* Protocols */}
              <div>
                <label className="text-sm font-medium">Research Protocols</label>
                {formData.protocols.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {formData.protocols.map((protocol, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded border p-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{protocol.name}</span>
                          {protocol.version && (
                            <span className="ml-2 text-muted-foreground">
                              v{protocol.version}
                            </span>
                          )}
                          {protocol.url && (
                            <a
                              href={protocol.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-primary hover:underline"
                            >
                              Link
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProtocol(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 grid gap-2 rounded border p-2 md:grid-cols-4">
                  <input
                    type="text"
                    value={newProtocol.name}
                    onChange={(e) => setNewProtocol({ ...newProtocol, name: e.target.value })}
                    placeholder="Protocol name"
                    className="rounded-md border px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    value={newProtocol.version}
                    onChange={(e) =>
                      setNewProtocol({ ...newProtocol, version: e.target.value })
                    }
                    placeholder="Version"
                    className="rounded-md border px-2 py-1 text-sm"
                  />
                  <input
                    type="url"
                    value={newProtocol.url}
                    onChange={(e) => setNewProtocol({ ...newProtocol, url: e.target.value })}
                    placeholder="URL (optional)"
                    className="rounded-md border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addProtocol}
                    className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Equipment */}
              <div>
                <label className="text-sm font-medium">Equipment Needs</label>
                {formData.equipment_needs.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {formData.equipment_needs.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded border p-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{item.item}</span>
                          {item.quantity && item.quantity > 1 && (
                            <span className="ml-2 text-muted-foreground">x{item.quantity}</span>
                          )}
                          {item.notes && (
                            <span className="ml-2 text-muted-foreground">({item.notes})</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEquipment(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 grid gap-2 rounded border p-2 md:grid-cols-4">
                  <input
                    type="text"
                    value={newEquipment.item}
                    onChange={(e) => setNewEquipment({ ...newEquipment, item: e.target.value })}
                    placeholder="Equipment item"
                    className="rounded-md border px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    value={newEquipment.quantity || ""}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    placeholder="Qty"
                    min={1}
                    className="rounded-md border px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    value={newEquipment.notes}
                    onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                    placeholder="Notes"
                    className="rounded-md border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addEquipment}
                    className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
                  >
                    Add
                  </button>
                </div>
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
                "Create Experiment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

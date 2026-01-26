"use client";

import { useState } from "react";
import { X, FileText, CheckCircle2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useTemplates, type TemplateWithCreator, RSE_7_PHASE_TEMPLATE } from "@/lib/hooks/use-templates";
import { useApplyTemplate } from "@/lib/hooks/use-project-hierarchy";

interface ApplyTemplateModalProps {
  projectId: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ApplyTemplateModal({
  projectId,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}: ApplyTemplateModalProps) {
  const { data: templates = [], isLoading } = useTemplates(workspaceId);
  const applyTemplate = useApplyTemplate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [useBuiltIn, setUseBuiltIn] = useState(false);

  const handleApply = async () => {
    if (!selectedId && !useBuiltIn) return;

    try {
      if (useBuiltIn) {
        // First create the template, then apply it
        // For now, we'll use a workaround - the hook will handle this
        // In a real implementation, you'd either:
        // 1. Have the RSE template seeded in the DB
        // 2. Or modify the apply-template endpoint to accept template data directly
        alert("Built-in templates need to be seeded first. Please create the template via the Templates page.");
        return;
      }

      await applyTemplate.mutateAsync({
        projectId,
        templateId: selectedId!,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to apply template: ${error.message}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Apply Project Template</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Built-in templates */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Built-in Templates
                </h3>
                <TemplateOption
                  template={{
                    id: "builtin-rse-7",
                    name: RSE_7_PHASE_TEMPLATE.name,
                    description: RSE_7_PHASE_TEMPLATE.description,
                    phase_definitions: RSE_7_PHASE_TEMPLATE.phase_definitions,
                    role_definitions: RSE_7_PHASE_TEMPLATE.role_definitions,
                    is_public: true,
                    workspace_id: null,
                    created_by: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }}
                  isSelected={useBuiltIn}
                  isExpanded={expandedId === "builtin-rse-7"}
                  onSelect={() => {
                    setUseBuiltIn(true);
                    setSelectedId(null);
                  }}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === "builtin-rse-7" ? null : "builtin-rse-7")
                  }
                />
              </div>

              {/* Workspace templates */}
              {templates.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Workspace Templates
                  </h3>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <TemplateOption
                        key={template.id}
                        template={template}
                        isSelected={selectedId === template.id}
                        isExpanded={expandedId === template.id}
                        onSelect={() => {
                          setSelectedId(template.id);
                          setUseBuiltIn(false);
                        }}
                        onToggleExpand={() =>
                          setExpandedId(
                            expandedId === template.id ? null : template.id
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No custom templates available. You can create templates from the
                  Templates page.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={(!selectedId && !useBuiltIn) || applyTemplate.isPending}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {applyTemplate.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplateOptionProps {
  template: TemplateWithCreator;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}

function TemplateOption({
  template,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
}: TemplateOptionProps) {
  const phaseCount = template.phase_definitions?.length || 0;
  const roleCount = template.role_definitions?.length || 0;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "hover:border-primary/50 cursor-pointer"
      }`}
    >
      <div className="flex items-start gap-3 p-3" onClick={onSelect}>
        {/* Selection indicator */}
        <div
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            isSelected
              ? "border-primary bg-primary text-white"
              : "border-muted-foreground"
          }`}
        >
          {isSelected && <CheckCircle2 className="h-3 w-3" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">{template.name}</h4>
          </div>
          {template.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {template.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{phaseCount} phases</span>
            <span>{roleCount} roles</span>
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="shrink-0 rounded p-1 hover:bg-muted"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && template.phase_definitions && (
        <div className="border-t px-3 py-2">
          <h5 className="mb-2 text-xs font-medium text-muted-foreground">
            Phases
          </h5>
          <div className="space-y-1">
            {template.phase_definitions.map((phase, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {index + 1}. {phase.title}
                </span>
                {phase.assigned_role && (
                  <span className="text-xs text-muted-foreground">
                    {phase.assigned_role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

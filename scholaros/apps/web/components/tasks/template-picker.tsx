"use client";

import { useState } from "react";
import {
  FileText,
  Loader2,
  ChevronDown,
  BookOpen,
  Users,
  BarChart3,
  Send,
  RotateCcw,
  Presentation,
  PenTool,
  BookMarked,
  GraduationCap,
  ClipboardList,
  Banknote,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTaskTemplates } from "@/lib/hooks/use-task-templates";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { CATEGORY_CONFIG, PRIORITY_LABELS } from "@/lib/constants";
import type { TaskCategory, TaskPriority, TaskTemplateSubtask } from "@scholaros/shared";
import type { TaskTemplateWithDetails } from "@/lib/hooks/use-task-templates";

// Icon mapping for categories
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  research: BookOpen,
  teaching: GraduationCap,
  grants: Banknote,
  "grad-mentorship": Users,
  "undergrad-mentorship": Users,
  admin: ClipboardList,
  misc: FileText,
  meeting: Users,
  analysis: BarChart3,
  submission: Send,
  revision: RotateCcw,
  presentation: Presentation,
  writing: PenTool,
  reading: BookMarked,
  coursework: GraduationCap,
};

interface TemplatePickerProps {
  onSelectTemplate: (data: {
    title: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    subtasks?: TaskTemplateSubtask[];
    assignedTo?: string;
  }) => void;
}

export function TemplatePicker({ onSelectTemplate }: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: templates, isLoading } = useTaskTemplates(currentWorkspaceId);

  const handleSelect = (template: TaskTemplateWithDetails) => {
    onSelectTemplate({
      title: template.description || template.name,
      category: template.default_category as TaskCategory | undefined,
      priority: template.default_priority as TaskPriority | undefined,
      subtasks: template.subtasks as TaskTemplateSubtask[],
      assignedTo: template.default_assigned_to ?? undefined,
    });
    setIsOpen(false);
  };

  const builtinTemplates = templates?.filter((t) => t.is_builtin) ?? [];
  const userTemplates = templates?.filter((t) => !t.is_builtin) ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label="Choose a task template"
      >
        <FileText className="h-4 w-4" />
        <span>Templates</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Task Templates</DialogTitle>
            <DialogDescription>
              Choose a template to pre-fill your task with suggested category,
              priority, and subtasks.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !templates || templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No templates available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Templates will appear here once they are created.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                {/* Built-in academic templates */}
                {builtinTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Academic Templates
                      </h3>
                    </div>
                    <div className="grid gap-1.5">
                      {builtinTemplates.map((template) => (
                        <TemplateItem
                          key={template.id}
                          template={template}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* User-created templates */}
                {userTemplates.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Custom Templates
                    </h3>
                    <div className="grid gap-1.5">
                      {userTemplates.map((template) => (
                        <TemplateItem
                          key={template.id}
                          template={template}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Individual template row
function TemplateItem({
  template,
  onSelect,
}: {
  template: TaskTemplateWithDetails;
  onSelect: (template: TaskTemplateWithDetails) => void;
}) {
  const category = template.default_category as string | undefined;
  const config = category ? CATEGORY_CONFIG[category] : null;
  const Icon = category ? CATEGORY_ICON_MAP[category] || FileText : FileText;
  const priorityLabel = template.default_priority
    ? PRIORITY_LABELS[template.default_priority as keyof typeof PRIORITY_LABELS]
    : null;

  const subtaskCount = Array.isArray(template.subtasks)
    ? template.subtasks.length
    : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg text-left",
        "border border-transparent hover:border-border",
        "hover:bg-accent/50 transition-colors group"
      )}
    >
      {/* Category icon */}
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          backgroundColor: config?.bgColor ?? "hsl(var(--muted))",
        }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: config?.color ?? "hsl(var(--muted-foreground))" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{template.name}</span>
          {template.is_builtin && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium flex-shrink-0">
              Built-in
            </span>
          )}
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {template.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {config && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                backgroundColor: config.bgColor,
                color: config.color,
              }}
            >
              {config.label}
            </span>
          )}
          {priorityLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {priorityLabel}
            </span>
          )}
          {subtaskCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

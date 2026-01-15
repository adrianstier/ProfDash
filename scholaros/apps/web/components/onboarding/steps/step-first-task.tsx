"use client";

import { useState } from "react";
import { CheckSquare, ArrowRight, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingInteraction } from "@/lib/hooks/use-onboarding";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { parseQuickAdd } from "@scholaros/shared";
import type { TaskCategory, TaskPriority } from "@scholaros/shared";

interface StepFirstTaskProps {
  onNext: () => void;
  onBack: () => void;
}

const TASK_TEMPLATES = [
  {
    id: "review",
    title: "Review manuscript draft",
    category: "research" as TaskCategory,
    priority: "p2" as TaskPriority,
    icon: "📝",
  },
  {
    id: "meeting",
    title: "Prepare for lab meeting",
    category: "research" as TaskCategory,
    priority: "p3" as TaskPriority,
    icon: "🗓️",
  },
  {
    id: "grant",
    title: "Check grant deadlines",
    category: "grants" as TaskCategory,
    priority: "p2" as TaskPriority,
    icon: "💰",
  },
  {
    id: "email",
    title: "Respond to collaborator emails",
    category: "admin" as TaskCategory,
    priority: "p3" as TaskPriority,
    icon: "📧",
  },
];

export function StepFirstTask({ onNext, onBack }: StepFirstTaskProps) {
  const [taskInput, setTaskInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [taskCreated, setTaskCreated] = useState(false);
  const recordInteraction = useOnboardingInteraction();
  const createTask = useCreateTask();

  const handleCreateTask = async () => {
    let taskData;

    if (selectedTemplate) {
      const template = TASK_TEMPLATES.find((t) => t.id === selectedTemplate);
      if (template) {
        taskData = {
          title: template.title,
          category: template.category,
          priority: template.priority,
          status: "todo" as const,
          description: null,
          due: null,
          project_id: null,
          workspace_id: null,
          assignees: [],
          tags: [],
        };
      }
    } else if (taskInput.trim()) {
      const parsed = parseQuickAdd(taskInput);
      taskData = {
        title: parsed.title,
        category: (parsed.category as TaskCategory) || "misc",
        priority: (parsed.priority as TaskPriority) || "p3",
        status: "todo" as const,
        description: null,
        due: parsed.due ? parsed.due.toISOString().split("T")[0] : null,
        project_id: parsed.projectId || null,
        workspace_id: null,
        assignees: parsed.assignees || [],
        tags: [],
      };
    }

    if (taskData) {
      try {
        await createTask.mutateAsync(taskData);
        setTaskCreated(true);
        recordInteraction();
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId === selectedTemplate ? null : templateId);
    setTaskInput("");
    recordInteraction();
  };

  const canProceed = taskCreated || taskInput.trim().length > 0 || selectedTemplate;

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <CheckSquare className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Create Your First Task
        </h2>
        <p className="mt-2 text-muted-foreground">
          Let&apos;s add a task to get you started
        </p>
      </div>

      {/* Success State */}
      {taskCreated ? (
        <div className="mt-8 rounded-2xl border bg-green-500/5 border-green-500/20 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckSquare className="h-6 w-6 text-green-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Task Created!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Great job! Your first task is ready. You can find it in your Today view.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Quick Templates */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quick Templates</label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="text-lg">{template.icon}</span>
                  <span className="text-xs font-medium">{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Custom Task Input */}
          <div className="space-y-2">
            <label htmlFor="taskInput" className="text-sm font-medium">
              Write Your Own
            </label>
            <div className="relative">
              <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="taskInput"
                type="text"
                value={taskInput}
                onChange={(e) => {
                  setTaskInput(e.target.value);
                  setSelectedTemplate(null);
                  recordInteraction();
                }}
                placeholder='Try: "Review paper draft tomorrow p2 #research"'
                className="w-full rounded-xl border bg-background pl-11 pr-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use natural language with dates, priorities (p1-p4), and categories
              (#research, #teaching, #grants)
            </p>
          </div>

          {/* Create Button */}
          {(taskInput.trim() || selectedTemplate) && (
            <Button
              onClick={handleCreateTask}
              disabled={createTask.isPending}
              className="w-full gap-2"
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Create Task
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!taskCreated && !canProceed}
          className="gap-2"
        >
          {taskCreated ? "Continue" : "Skip for Now"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

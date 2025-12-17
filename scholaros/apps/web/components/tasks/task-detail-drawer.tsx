"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  Flag,
  Hash,
  Loader2,
  Check,
  Pencil,
  Trash2,
  Save,
  Folder,
  ExternalLink,
} from "lucide-react";
import type { TaskCategory, TaskPriority, TaskStatus } from "@scholaros/shared";
import { useTaskStore } from "@/lib/stores/task-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useTasks, useUpdateTask, useDeleteTask } from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: "p1", label: "P1 - Urgent", color: "text-red-500" },
  { value: "p2", label: "P2 - High", color: "text-orange-500" },
  { value: "p3", label: "P3 - Medium", color: "text-blue-500" },
  { value: "p4", label: "P4 - Low", color: "text-gray-400" },
];

const categoryOptions: { value: TaskCategory; label: string }[] = [
  { value: "research", label: "Research" },
  { value: "teaching", label: "Teaching" },
  { value: "grants", label: "Grants" },
  { value: "admin", label: "Admin" },
  { value: "grad-mentorship", label: "Graduate Mentorship" },
  { value: "undergrad-mentorship", label: "Undergrad Mentorship" },
  { value: "misc", label: "Miscellaneous" },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export function TaskDetailDrawer() {
  const { selectedTaskId, isDetailOpen, editingTaskId, closeTaskDetail, setEditingTask } = useTaskStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: tasks = [] } = useTasks({ workspace_id: currentWorkspaceId });
  const { data: projects = [] } = useProjects({ workspace_id: currentWorkspaceId ?? "" });
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const task = tasks.find((t) => t.id === selectedTaskId);
  const isEditing = editingTaskId === selectedTaskId;
  const linkedProject = task?.project_id ? projects.find((p) => p.id === task.project_id) : null;

  // Local form state for editing
  const [formData, setFormData] = useState<Partial<TaskFromAPI>>({});

  // Sync form data when task changes or editing starts
  useEffect(() => {
    if (task && isEditing) {
      setFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        status: task.status,
        due: task.due,
        project_id: task.project_id,
      });
    }
  }, [task, isEditing]);

  if (!isDetailOpen || !task) return null;

  const handleSave = async () => {
    if (!selectedTaskId) return;

    await updateTask.mutateAsync({
      id: selectedTaskId,
      ...formData,
    });

    setEditingTask(null);
  };

  const handleDelete = async () => {
    if (!selectedTaskId) return;

    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask.mutateAsync(selectedTaskId);
      closeTaskDetail();
    }
  };

  const handleToggleComplete = async () => {
    if (!selectedTaskId) return;

    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await updateTask.mutateAsync({
      id: selectedTaskId,
      status: newStatus,
    });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={closeTaskDetail}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleComplete}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                task.status === "done"
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-muted-foreground/30 hover:border-primary"
              }`}
            >
              {task.status === "done" && <Check className="h-4 w-4" />}
            </button>
            <span className="text-sm text-muted-foreground">
              {task.status === "done" ? "Completed" : "Mark complete"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={updateTask.isPending}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {updateTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditingTask(selectedTaskId)}
                className="rounded-md p-2 hover:bg-muted"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleteTask.isPending}
              className="rounded-md p-2 hover:bg-muted"
            >
              {deleteTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-red-500" />
              )}
            </button>
            <button
              onClick={closeTaskDetail}
              className="rounded-md p-2 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Title */}
          <div>
            {isEditing ? (
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <h2
                className={`text-lg font-semibold ${
                  task.status === "done" ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a description..."
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {task.description || "No description"}
              </p>
            )}
          </div>

          {/* Properties */}
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="w-24 text-sm text-muted-foreground">Status</div>
              {isEditing ? (
                <select
                  value={formData.status || task.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded-md bg-muted px-2 py-1 text-sm">
                  {statusOptions.find((s) => s.value === task.status)?.label || task.status}
                </span>
              )}
            </div>

            {/* Priority */}
            <div className="flex items-center gap-3">
              <div className="flex w-24 items-center gap-1 text-sm text-muted-foreground">
                <Flag className="h-4 w-4" />
                Priority
              </div>
              {isEditing ? (
                <select
                  value={formData.priority || task.priority || "p3"}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`text-sm font-medium ${
                    priorityOptions.find((p) => p.value === task.priority)?.color || ""
                  }`}
                >
                  {priorityOptions.find((p) => p.value === task.priority)?.label ||
                    task.priority?.toUpperCase() ||
                    "None"}
                </span>
              )}
            </div>

            {/* Category */}
            <div className="flex items-center gap-3">
              <div className="flex w-24 items-center gap-1 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                Category
              </div>
              {isEditing ? (
                <select
                  value={formData.category || task.category || "misc"}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded-md bg-muted px-2 py-1 text-sm">
                  {categoryOptions.find((c) => c.value === task.category)?.label ||
                    task.category ||
                    "None"}
                </span>
              )}
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-3">
              <div className="flex w-24 items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Due date
              </div>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.due?.split("T")[0] || ""}
                  onChange={(e) => setFormData({ ...formData, due: e.target.value || null })}
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <span className="text-sm">
                  {formatDate(task.due)}
                </span>
              )}
            </div>

            {/* Project */}
            <div className="flex items-center gap-3">
              <div className="flex w-24 items-center gap-1 text-sm text-muted-foreground">
                <Folder className="h-4 w-4" />
                Project
              </div>
              {isEditing ? (
                <select
                  value={formData.project_id || ""}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value || null })}
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              ) : linkedProject ? (
                <Link
                  href={`/projects/${linkedProject.id}`}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {linkedProject.title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">No project</span>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
            <p>Created: {new Date(task.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </>
  );
}

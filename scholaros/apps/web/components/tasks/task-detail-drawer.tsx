"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Repeat,
  ListChecks,
  Plus,
  Clock,
} from "lucide-react";
import { parseLocalDate } from "@scholaros/shared";
import type { TaskCategory, TaskPriority, TaskStatus, Subtask } from "@scholaros/shared";
import { useTaskStore } from "@/lib/stores/task-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useTasks, useUpdateTask, useDeleteTask } from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import { ARIA_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { FocusTrap } from "@/components/accessibility/focus-trap";
import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { rruleToText } from "@/lib/utils/recurrence";

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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = "task-detail-title";

  const task = tasks.find((t) => t.id === selectedTaskId);
  const isEditing = editingTaskId === selectedTaskId;
  const linkedProject = task?.project_id ? projects.find((p) => p.id === task.project_id) : null;

  // Local form state for editing
  const [formData, setFormData] = useState<Partial<TaskFromAPI>>({});

  // Subtask state
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Handle Escape key to close drawer
  const handleEscape = useCallback(() => {
    closeTaskDetail();
  }, [closeTaskDetail]);

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
        is_recurring: task.is_recurring,
        recurrence_rule: task.recurrence_rule,
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
    return parseLocalDate(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Subtask helpers
  const subtasks: Subtask[] = task.subtasks ?? [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleAddSubtask = async () => {
    if (!newSubtaskText.trim() || !selectedTaskId) return;
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: newSubtaskText.trim(),
      completed: false,
    };
    await updateTask.mutateAsync({
      id: selectedTaskId,
      subtasks: [...subtasks, newSubtask],
    });
    setNewSubtaskText("");
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!selectedTaskId) return;
    const updated = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    await updateTask.mutateAsync({
      id: selectedTaskId,
      subtasks: updated,
    });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!selectedTaskId) return;
    const updated = subtasks.filter((s) => s.id !== subtaskId);
    await updateTask.mutateAsync({
      id: selectedTaskId,
      subtasks: updated,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={closeTaskDetail}
        aria-hidden="true"
      />

      {/* Drawer - Full screen on mobile, side drawer on larger screens */}
      <FocusTrap active={isDetailOpen} onEscape={handleEscape}>
        <div
          className="fixed inset-0 z-50 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-md border-l bg-background shadow-xl flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Header - Enhanced for mobile with prominent close button */}
          <div className="flex items-center justify-between border-b px-4 py-3 sm:py-3">
            {/* Mobile close button - more prominent on small screens */}
            <button
              onClick={closeTaskDetail}
              className="sm:hidden flex items-center gap-2 rounded-lg p-2 -ml-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={ARIA_LABELS.closeDrawer}
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Close</span>
            </button>

            {/* Complete toggle - visible on all screens, but positioned differently */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handleToggleComplete}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  task.status === "done"
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground/30 hover:border-primary"
                }`}
                role="checkbox"
                aria-checked={task.status === "done"}
                aria-label={
                  task.status === "done"
                    ? ARIA_LABELS.markIncomplete(task.title)
                    : ARIA_LABELS.markComplete(task.title)
                }
              >
                {task.status === "done" && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
              <span className="text-sm text-muted-foreground" aria-hidden="true">
                {task.status === "done" ? "Completed" : "Mark complete"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isEditing ? (
                <button
                  onClick={handleSave}
                  disabled={updateTask.isPending}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={ARIA_LABELS.save}
                >
                  {updateTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  Save
                </button>
              ) : (
                <button
                  onClick={() => setEditingTask(selectedTaskId)}
                  className="rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={ARIA_LABELS.edit}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleteTask.isPending}
                className="rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={ARIA_LABELS.delete}
              >
                {deleteTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                )}
              </button>
              {/* Desktop close button */}
              <button
                onClick={closeTaskDetail}
                className="hidden sm:flex rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={ARIA_LABELS.closeDrawer}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Mobile complete toggle - shown below header on mobile */}
          <div className="sm:hidden flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
            <button
              onClick={handleToggleComplete}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                task.status === "done"
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-muted-foreground/30 hover:border-primary"
              }`}
              role="checkbox"
              aria-checked={task.status === "done"}
              aria-label={
                task.status === "done"
                  ? ARIA_LABELS.markIncomplete(task.title)
                  : ARIA_LABELS.markComplete(task.title)
              }
            >
              {task.status === "done" && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
            <span className="text-sm text-muted-foreground" aria-hidden="true">
              {task.status === "done" ? "Completed" : "Tap to mark complete"}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-4 space-y-6">
            {/* Title */}
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2.5 sm:py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Task title"
                />
              ) : (
                <h2
                  id={titleId}
                  ref={titleRef}
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
              <label
                htmlFor="task-description"
                className="mb-2 block text-sm font-medium text-muted-foreground"
              >
                Description
              </label>
              {isEditing ? (
                <textarea
                  id="task-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <p id="task-description" className="text-sm text-muted-foreground">
                  {task.description || "No description"}
                </p>
              )}
            </div>

            {/* Properties - Stacked on mobile, inline on desktop */}
            <div className="space-y-4" role="group" aria-label="Task properties">
              {/* Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label
                  htmlFor="task-status"
                  className="w-24 text-sm font-medium sm:font-normal text-foreground sm:text-muted-foreground"
                >
                  Status
                </label>
                {isEditing ? (
                  <select
                    id="task-status"
                    value={formData.status || task.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="flex-1 rounded-md border bg-background px-3 py-2.5 sm:py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={ARIA_LABELS.selectStatus}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label
                  htmlFor="task-priority"
                  className="flex w-24 items-center gap-1 text-sm font-medium sm:font-normal text-foreground sm:text-muted-foreground"
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Priority
                </label>
                {isEditing ? (
                  <select
                    id="task-priority"
                    value={formData.priority || task.priority || "p3"}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="flex-1 rounded-md border bg-background px-3 py-2.5 sm:py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={ARIA_LABELS.selectPriority}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label
                  htmlFor="task-category"
                  className="flex w-24 items-center gap-1 text-sm font-medium sm:font-normal text-foreground sm:text-muted-foreground"
                >
                  <Hash className="h-4 w-4" aria-hidden="true" />
                  Category
                </label>
                {isEditing ? (
                  <select
                    id="task-category"
                    value={formData.category || task.category || "misc"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                    className="flex-1 rounded-md border bg-background px-3 py-2.5 sm:py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={ARIA_LABELS.selectCategory}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label
                  htmlFor="task-due-date"
                  className="flex w-24 items-center gap-1 text-sm font-medium sm:font-normal text-foreground sm:text-muted-foreground"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Due date
                </label>
                {isEditing ? (
                  <input
                    id="task-due-date"
                    type="date"
                    value={formData.due?.split("T")[0] || ""}
                    onChange={(e) => setFormData({ ...formData, due: e.target.value || null })}
                    className="flex-1 rounded-md border bg-background px-3 py-2.5 sm:py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={ARIA_LABELS.selectDueDate}
                  />
                ) : (
                  <span className="text-sm">
                    {formatDate(task.due)}
                  </span>
                )}
              </div>

              {/* Project */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label
                  htmlFor="task-project"
                  className="flex w-24 items-center gap-1 text-sm font-medium sm:font-normal text-foreground sm:text-muted-foreground"
                >
                  <Folder className="h-4 w-4" aria-hidden="true" />
                  Project
                </label>
                {isEditing ? (
                  <select
                    id="task-project"
                    value={formData.project_id || ""}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value || null })}
                    className="flex-1 rounded-md border bg-background px-3 py-2.5 sm:py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={ARIA_LABELS.selectProject}
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
                    className="flex items-center gap-1 text-sm text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  >
                    {linkedProject.title}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">No project</span>
                )}
              </div>

              {/* Recurrence */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label
                  className="flex w-24 items-center gap-1 text-sm font-medium sm:font-normal text-foreground sm:text-muted-foreground"
                >
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                  Repeat
                </label>
                {isEditing ? (
                  <RecurrencePicker
                    value={formData.recurrence_rule}
                    onChange={(rrule) => setFormData({
                      ...formData,
                      recurrence_rule: rrule,
                      is_recurring: !!rrule,
                    })}
                    startDate={formData.due ? parseLocalDate(formData.due) : null}
                  />
                ) : task.is_recurring && task.recurrence_rule ? (
                  <span className="text-sm">
                    {rruleToText(task.recurrence_rule)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Does not repeat</span>
                )}
              </div>
            </div>

            {/* Subtasks Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">Subtasks</span>
                  {totalSubtasks > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({completedSubtasks}/{totalSubtasks})
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {totalSubtasks > 0 && (
                <div className="mb-3">
                  <Progress value={subtaskProgress} className="h-2" />
                </div>
              )}

              {/* Subtask list */}
              <div className="space-y-1.5 mb-3">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className={cn(
                      "group/subtask flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                      "hover:bg-muted/50"
                    )}
                  >
                    {/* Subtask checkbox */}
                    <button
                      onClick={() => handleToggleSubtask(subtask.id)}
                      className={cn(
                        "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition-all",
                        subtask.completed
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-muted-foreground/30 hover:border-primary"
                      )}
                      role="checkbox"
                      aria-checked={subtask.completed}
                      aria-label={`${subtask.completed ? "Mark incomplete" : "Mark complete"}: ${subtask.text}`}
                    >
                      {subtask.completed && (
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                      )}
                    </button>

                    {/* Subtask text */}
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        subtask.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {subtask.text}
                    </span>

                    {/* Estimated time */}
                    {subtask.estimatedMinutes && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {subtask.estimatedMinutes}m
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="opacity-0 group-hover/subtask:opacity-100 p-1 rounded transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Delete subtask: ${subtask.text}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add subtask input */}
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add a subtask..."
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  aria-label="New subtask text"
                />
                {newSubtaskText.trim() && (
                  <button
                    onClick={handleAddSubtask}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
              <p>Created: <time dateTime={task.created_at}>{new Date(task.created_at).toLocaleString()}</time></p>
              <p>Updated: <time dateTime={task.updated_at}>{new Date(task.updated_at).toLocaleString()}</time></p>
            </div>
          </div>
        </div>
      </FocusTrap>
    </>
  );
}

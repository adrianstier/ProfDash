"use client";

import { Plus, Check, Link2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { parseLocalDate } from "@scholaros/shared";
import { useTasks, useUpdateTask, type TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

interface LinkedTasksProps {
  projectId: string;
  tasks?: TaskFromAPI[];
}

export function LinkedTasks({ projectId, tasks: initialTasks }: LinkedTasksProps) {
  const { currentWorkspaceId } = useWorkspaceStore();

  // Fetch tasks if not provided
  const { data: fetchedTasks } = useTasks(
    initialTasks ? undefined : { workspace_id: currentWorkspaceId }
  );

  const tasks = initialTasks ?? fetchedTasks ?? [];
  const projectTasks = tasks.filter((t) => t.project_id === projectId);

  const completedCount = projectTasks.filter((t) => t.status === "done").length;
  const progress = projectTasks.length > 0
    ? Math.round((completedCount / projectTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">Linked Tasks</h3>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{projectTasks.length}
          </span>
        </div>
        {projectTasks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {projectTasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tasks linked to this project yet.
          </p>
        ) : (
          projectTasks.map((task) => (
            <LinkedTaskItem key={task.id} task={task} />
          ))
        )}
      </div>

      {/* Link to create task */}
      <Link
        href={`/list?project=${projectId}`}
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Plus className="h-4 w-4" />
        Add task to this project
      </Link>
    </div>
  );
}

interface LinkedTaskItemProps {
  task: TaskFromAPI;
}

function LinkedTaskItem({ task }: LinkedTaskItemProps) {
  const updateTask = useUpdateTask();
  const isCompleted = task.status === "done";

  const handleToggle = () => {
    updateTask.mutate({
      id: task.id,
      status: isCompleted ? "todo" : "done",
    });
  };

  const priorityColors = {
    p1: "border-l-red-500",
    p2: "border-l-orange-500",
    p3: "border-l-blue-500",
    p4: "border-l-gray-400",
  };

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-l-4 p-3 ${
        priorityColors[task.priority]
      } ${isCompleted ? "bg-muted/50" : "bg-card"}`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground hover:border-primary"
        }`}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            isCompleted ? "text-muted-foreground line-through" : ""
          }`}
        >
          {task.title}
        </p>
        {task.due && (
          <p className="text-xs text-muted-foreground">
            Due: {parseLocalDate(task.due).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Link to task */}
      <Link
        href={`/list?task=${task.id}`}
        className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-muted"
      >
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}

interface LinkTaskModalProps {
  projectId: string;
  onClose: () => void;
}

export function LinkTaskModal({ projectId, onClose }: LinkTaskModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: tasks = [] } = useTasks({ workspace_id: currentWorkspaceId });
  const updateTask = useUpdateTask();

  const unlinkedTasks = tasks.filter((t) => !t.project_id);

  const handleLinkTask = async (taskId: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        project_id: projectId,
      });
    } catch (error) {
      console.error("Failed to link task:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Link Task to Project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>

        {unlinkedTasks.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No unlinked tasks available.
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2">
            {unlinkedTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleLinkTask(task.id)}
                className="flex w-full items-center gap-2 rounded-lg border p-3 text-left hover:bg-muted"
              >
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{task.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

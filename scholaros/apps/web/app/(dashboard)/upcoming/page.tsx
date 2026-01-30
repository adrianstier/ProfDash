"use client";

import { useMemo, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskSectionsList } from "@/components/tasks/task-section-header";
import { groupTasksForUpcoming } from "@/lib/utils/task-grouping";
import { useTasks, useToggleTaskComplete, useDeleteTask, type TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useTaskStore } from "@/lib/stores/task-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { MESSAGES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export default function UpcomingPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: tasks = [], isLoading } = useTasks({
    workspace_id: currentWorkspaceId,
  });

  const toggleComplete = useToggleTaskComplete();
  const deleteTask = useDeleteTask();
  const { openTaskDetail, setEditingTask } = useTaskStore();

  // Filter to non-done tasks and group into sections
  const sections = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status !== "done");
    return groupTasksForUpcoming(activeTasks);
  }, [tasks]);

  const handleToggleComplete = useCallback(
    (task: TaskFromAPI) => {
      toggleComplete.mutate(task);
    },
    [toggleComplete]
  );

  const handleEdit = useCallback(
    (task: TaskFromAPI) => {
      setEditingTask(task.id);
      openTaskDetail(task.id);
    },
    [setEditingTask, openTaskDetail]
  );

  const handleDelete = useCallback(
    (task: TaskFromAPI) => {
      if (confirm(MESSAGES.confirmations.deleteTask)) {
        deleteTask.mutate(task.id);
      }
    },
    [deleteTask]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/5 via-primary/5 to-indigo-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 shadow-sm">
            <CalendarDays className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Upcoming
            </h1>
            <p className="text-muted-foreground">
              All tasks organized by deadline
            </p>
          </div>
        </div>
      </header>

      {/* Quick Add */}
      <section className="animate-fade-in stagger-1">
        <QuickAdd />
      </section>

      {/* Sectioned Task List */}
      <section className="animate-fade-in stagger-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TaskSectionsList
            sections={sections}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="No upcoming tasks"
          />
        )}
      </section>
    </div>
  );
}

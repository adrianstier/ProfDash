"use client";

import { useMemo, useCallback } from "react";
import type { TaskFromAPI } from "@scholaros/shared";
import { groupTasksForToday } from "@/lib/utils/task-grouping";
import { TaskSectionsList } from "@/components/tasks/task-section-header";
import { useToggleTaskComplete, useDeleteTask } from "@/lib/hooks/use-tasks";
import { useTaskStore } from "@/lib/stores/task-store";
import { MESSAGES } from "@/lib/constants";

interface TodaySectionedTasksProps {
  initialTasks: TaskFromAPI[];
}

/**
 * Client component that renders the Today page tasks in
 * collapsible, color-coded sections: Overdue, Due Today, Coming Up, No Date.
 */
export function TodaySectionedTasks({ initialTasks }: TodaySectionedTasksProps) {
  const toggleComplete = useToggleTaskComplete();
  const deleteTask = useDeleteTask();
  const { openTaskDetail, setEditingTask } = useTaskStore();

  const sections = useMemo(() => groupTasksForToday(initialTasks), [initialTasks]);

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
    <TaskSectionsList
      sections={sections}
      onToggleComplete={handleToggleComplete}
      onEdit={handleEdit}
      onDelete={handleDelete}
      emptyMessage="All caught up! No tasks for today."
    />
  );
}

"use client";

import { useMemo, useState, useCallback } from "react";
import { LayoutList, CheckCircle, Circle, Clock, ListTodo, Layers, List, Loader2 } from "lucide-react";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { TaskFilters } from "@/components/tasks/task-filters";
import { BulkActionsToolbar } from "@/components/tasks/bulk-actions-toolbar";
import { TaskSectionsList } from "@/components/tasks/task-section-header";
import { groupTasksBySections, sortByUrgency } from "@/lib/utils/task-grouping";
import { useTasks, useToggleTaskComplete, useDeleteTask, type TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useTaskStore, filterTasks } from "@/lib/stores/task-store";
import { MESSAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const statCards = [
  {
    key: "total",
    label: "Total Tasks",
    icon: ListTodo,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "todo",
    label: "To Do",
    icon: Circle,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
  },
  {
    key: "progress",
    label: "In Progress",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "done",
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export default function ListPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: tasks = [], isLoading } = useTasks({
    workspace_id: currentWorkspaceId,
  });

  const [sectionedView, setSectionedView] = useState(false);
  const [urgencySort, setUrgencySort] = useState(false);

  const toggleComplete = useToggleTaskComplete();
  const deleteTask = useDeleteTask();
  const { filters, openTaskDetail, setEditingTask } = useTaskStore();

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const progress = tasks.filter((t) => t.status === "progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    return { total, todo, progress, done };
  }, [tasks]);

  // Apply store filters then optionally urgency sort / section
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filters);
  }, [tasks, filters]);

  const sections = useMemo(() => {
    if (!sectionedView) return [];
    const sorted = urgencySort ? sortByUrgency(filteredTasks) : filteredTasks;
    return groupTasksBySections(sorted);
  }, [sectionedView, urgencySort, filteredTasks]);

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
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/5 via-primary/5 to-blue-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <LayoutList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                All Tasks
              </h1>
              <p className="text-muted-foreground">
                Complete overview of your task backlog
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fade-in stagger-1">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const count = stats[stat.key as keyof typeof stats];

          return (
            <div
              key={stat.key}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  stat.bgColor
                )}
                style={{ opacity: 0.3 }}
              />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-display font-semibold tracking-tight">
                    {count}
                  </p>
                </div>
                <div className={cn("rounded-xl p-2.5", stat.bgColor)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Quick Add */}
      <section className="animate-fade-in stagger-2">
        <QuickAdd />
      </section>

      {/* Filters + View Toggles */}
      <section className="animate-fade-in stagger-3 space-y-4">
        <TaskFilters />

        {/* View mode and urgency sort toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Urgency Sort Toggle */}
          <button
            onClick={() => setUrgencySort(!urgencySort)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              urgencySort
                ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm"
                : "hover:bg-muted hover:border-border"
            )}
          >
            <Clock className="h-4 w-4" />
            Urgency Sort
          </button>

          {/* Sectioned View Toggle */}
          <button
            onClick={() => setSectionedView(!sectionedView)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              sectionedView
                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-sm"
                : "hover:bg-muted hover:border-border"
            )}
          >
            {sectionedView ? (
              <Layers className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
            {sectionedView ? "Sectioned View" : "Flat View"}
          </button>
        </div>
      </section>

      {/* Bulk Actions */}
      <section className="animate-fade-in stagger-4">
        <BulkActionsToolbar allTaskIds={tasks.map(t => t.id)} />
      </section>

      {/* Task List - Sectioned or Flat */}
      <section className="animate-fade-in stagger-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sectionedView ? (
          <TaskSectionsList
            sections={sections}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="No tasks match your filters"
          />
        ) : (
          <TaskList
            filter="all"
            useStoreFilters
            paginate
            pageSize={20}
          />
        )}
      </section>
    </div>
  );
}

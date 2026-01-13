"use client";

import { useMemo } from "react";
import { LayoutList, CheckCircle, Circle, Clock, ListTodo } from "lucide-react";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { TaskFilters } from "@/components/tasks/task-filters";
import { BulkActionsToolbar } from "@/components/tasks/bulk-actions-toolbar";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
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
  const { data: tasks = [] } = useTasks({
    workspace_id: currentWorkspaceId,
  });

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const progress = tasks.filter((t) => t.status === "progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    return { total, todo, progress, done };
  }, [tasks]);

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

      {/* Filters */}
      <section className="animate-fade-in stagger-3">
        <TaskFilters />
      </section>

      {/* Bulk Actions */}
      <section className="animate-fade-in stagger-4">
        <BulkActionsToolbar allTaskIds={tasks.map(t => t.id)} />
      </section>

      {/* Task List */}
      <section className="animate-fade-in stagger-5">
        <TaskList filter="all" useStoreFilters paginate pageSize={20} />
      </section>
    </div>
  );
}

"use client";

import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { TaskFilters } from "@/components/tasks/task-filters";

export default function ListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Tasks</h1>
        <p className="text-muted-foreground">
          Complete list of all your tasks
        </p>
      </div>

      <QuickAdd />

      <TaskFilters />

      <TaskList filter="all" useStoreFilters />
    </div>
  );
}

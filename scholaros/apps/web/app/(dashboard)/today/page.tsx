import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";

export const metadata = {
  title: "Today | ScholarOS",
};

async function getTodayTasks() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .or(`due.eq.${today},due.is.null`)
    .neq("status", "done")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data || [];
}

function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-md bg-muted"
        />
      ))}
    </div>
  );
}

export default async function TodayPage() {
  const tasks = await getTodayTasks();
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedCount} / {totalCount} tasks
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Add */}
      <QuickAdd />

      {/* Task List */}
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList initialTasks={tasks} />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { AIQuickActions } from "@/components/ai";
import { TodayProgress } from "@/components/tasks/today-progress";
import { TodayAIInsights } from "@/components/ai/today-ai-insights";
import { Calendar, Sparkles, Sun, Target } from "lucide-react";

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
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-20 rounded-xl shimmer"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const tasks = await getTodayTasks();
  const today = new Date();
  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-amber-500/5 to-background border border-border/50 p-8 animate-fade-in">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sun className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{greeting}</span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
              Today
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(today)}
            </p>
          </div>

          {/* Progress Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm">
            <TodayProgress />
          </div>
        </div>
      </header>

      {/* AI Insights Section */}
      <section className="animate-fade-in stagger-1">
        <TodayAIInsights />
      </section>

      {/* Quick Actions */}
      <section className="animate-fade-in stagger-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <QuickAdd />
          </div>
          <AIQuickActions />
        </div>
      </section>

      {/* Task List Section */}
      <section className="space-y-4 animate-fade-in stagger-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Today&apos;s Tasks
          </h2>
          <span className="text-sm text-muted-foreground">
            {tasks.filter(t => t.status !== "done").length} remaining
          </span>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4">
          <Suspense fallback={<TaskListSkeleton />}>
            <TaskList initialTasks={tasks} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

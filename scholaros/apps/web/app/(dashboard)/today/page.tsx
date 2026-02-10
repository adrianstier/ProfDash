import { Suspense } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { QuickAdd } from "@/components/tasks/quick-add";
import { AIQuickActions } from "@/components/ai";
import { TodayProgress } from "@/components/tasks/today-progress";
import { TodayAIInsights } from "@/components/ai/today-ai-insights";
import { TodaySectionedTasks } from "@/components/tasks/today-sectioned-tasks";
import { Calendar, Flame, Target } from "lucide-react";

export const metadata = {
  title: "Today | ScholarOS",
};

async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    firstName: profile?.full_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || null,
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
    email: user.email,
  };
}

async function getTodayTasks(workspaceId?: string | null) {
  const supabase = await createClient();
  // Fetch overdue + today + next 3 days for the "Coming Up" section
  const comingUpDate = new Date();
  comingUpDate.setDate(comingUpDate.getDate() + 3);
  const comingUp = comingUpDate.toISOString().split("T")[0];

  let query = supabase
    .from("tasks")
    .select("*")
    .or(`due.lte.${comingUp},due.is.null`)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  // Filter by workspace_id when provided; personal tasks have workspace_id IS NULL
  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data, error } = await query;

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

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace_id?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = params.workspace_id || null;
  const [tasks, userProfile] = await Promise.all([getTodayTasks(workspaceId), getUserProfile()]);
  const today = new Date();
  const greeting = getGreeting();
  const completedCount = tasks.filter(t => t.status === "done").length;
  const totalCount = tasks.length;

  // Motivational messages based on progress
  const getMotivationalMessage = () => {
    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    if (percentage === 100 && totalCount > 0) return "Amazing work! All tasks complete! 🎉";
    if (percentage >= 75) return "Almost there! Keep up the momentum!";
    if (percentage >= 50) return "Great progress! You're halfway there.";
    if (percentage >= 25) return "Good start! Keep pushing forward.";
    if (totalCount === 0) return "Ready to plan your day?";
    return "Let's make today count!";
  };

  return (
    <div className="space-y-8">
      {/* Hero Header - Personalized and warm */}
      <header className="relative rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-8 animate-fade-in overflow-hidden">
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            {/* Personalized greeting with wave */}
            <div className="flex items-center gap-3">
              {userProfile?.avatarUrl ? (
                <Image
                  src={userProfile.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-primary/20"
                  unoptimized // External avatar URLs may not be in allowed domains
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20 text-lg font-semibold text-primary ring-2 ring-primary/10">
                  {userProfile?.firstName?.charAt(0) || userProfile?.email?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="animate-wave">👋</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {greeting}{userProfile?.firstName ? `, ${userProfile.firstName}` : ""}!
                  </span>
                </div>
                <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">
                  Your Focus Today
                </h1>
              </div>
            </div>

            {/* Date and motivational message */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(today)}
              </span>
              <span className="text-primary font-medium">{getMotivationalMessage()}</span>
            </div>
          </div>

          {/* Progress Card with streak */}
          <div className="flex items-center gap-4">
            {/* Streak indicator (placeholder - would need backend support) */}
            <div className="hidden sm:flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Flame className="h-5 w-5 text-amber-500 animate-streak" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">3 day streak</span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm">
              <TodayProgress />
            </div>
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

      {/* Task List Section - Sectioned by deadline proximity */}
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

        <Suspense fallback={<TaskListSkeleton />}>
          <TodaySectionedTasks initialTasks={tasks} />
        </Suspense>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Sparkles,
  Lightbulb,
  Target,
  TrendingUp,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useAgentStore } from "@/lib/stores/agent-store";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  type: "suggestion" | "warning" | "tip";
  title: string;
  description: string;
  action?: {
    label: string;
    agentType?: "task" | "planner" | "project";
    prompt?: string;
  };
}

function generateInsights(tasks: Array<{
  id: string;
  title: string;
  status: string;
  priority: string;
  due?: string | null;
  category?: string;
}>): Insight[] {
  const insights: Insight[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Check for overdue tasks
  const overdueTasks = tasks.filter(
    (t) => t.due && t.due < today && t.status !== "done"
  );
  if (overdueTasks.length > 0) {
    insights.push({
      id: "overdue",
      type: "warning",
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
      description: "Would you like help prioritizing and rescheduling?",
      action: {
        label: "Get help",
        agentType: "task",
        prompt: "Help me prioritize and reschedule my overdue tasks",
      },
    });
  }

  // Check for high-priority tasks
  const highPriorityTasks = tasks.filter(
    (t) => (t.priority === "p1" || t.priority === "p2") && t.status !== "done"
  );
  if (highPriorityTasks.length > 3) {
    insights.push({
      id: "too-many-priorities",
      type: "suggestion",
      title: "Too many high-priority items",
      description:
        "Having too many P1/P2 tasks can reduce focus. Consider reviewing priorities.",
      action: {
        label: "Review priorities",
        agentType: "task",
        prompt: "Help me review and rebalance my task priorities for today",
      },
    });
  }

  // Check task completion rate
  const completedToday = tasks.filter(
    (t) => t.status === "done" && t.due === today
  ).length;
  const totalToday = tasks.filter((t) => t.due === today).length;

  if (totalToday > 0 && completedToday === 0) {
    insights.push({
      id: "get-started",
      type: "tip",
      title: "Ready to start your day?",
      description: "I can help you plan the best approach for today's tasks.",
      action: {
        label: "Plan my day",
        agentType: "planner",
        prompt: "Help me plan my day based on my current tasks",
      },
    });
  }

  // No tasks for today
  if (totalToday === 0) {
    insights.push({
      id: "no-tasks",
      type: "suggestion",
      title: "No tasks scheduled for today",
      description: "Would you like to pull in tasks from upcoming or plan your day?",
      action: {
        label: "Plan today",
        agentType: "planner",
        prompt: "I have no tasks for today. Help me plan what to work on.",
      },
    });
  }

  return insights.slice(0, 2); // Limit to 2 insights
}

export function TodayAIInsights() {
  const { data: tasks = [] } = useTasks();
  const { openChat, selectAgent } = useAgentStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const insights = generateInsights(tasks).filter((i) => !dismissed.has(i.id));

  const handleAction = async (insight: Insight) => {
    if (insight.action) {
      setIsLoading(true);
      try {
        if (insight.action.agentType) {
          selectAgent(insight.action.agentType);
        }
        openChat();
        // The chat will open and the user can continue the conversation
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  if (insights.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3 transition-all",
            insight.type === "warning"
              ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30"
              : insight.type === "tip"
              ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
              : "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30"
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
              insight.type === "warning"
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
                : insight.type === "tip"
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                : "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400"
            )}
          >
            {insight.type === "warning" ? (
              <TrendingUp className="h-4 w-4" />
            ) : insight.type === "tip" ? (
              <Lightbulb className="h-4 w-4" />
            ) : (
              <Target className="h-4 w-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {insight.description}
                </p>
              </div>
              <button
                onClick={() => handleDismiss(insight.id)}
                className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground rounded"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {insight.action && (
              <button
                onClick={() => handleAction(insight)}
                disabled={isLoading}
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs font-medium transition-colors",
                  insight.type === "warning"
                    ? "text-amber-700 hover:text-amber-800 dark:text-amber-400"
                    : insight.type === "tip"
                    ? "text-blue-700 hover:text-blue-800 dark:text-blue-400"
                    : "text-purple-700 hover:text-purple-800 dark:text-purple-400"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    {insight.action.label}
                    <ChevronRight className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TodayAIInsights;

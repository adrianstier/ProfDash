"use client";

import { useQuery } from "@tanstack/react-query";

export interface AnalyticsData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    completionRate: number;
    avgTasksPerDay: number;
    totalProjects: number;
    memberCount: number;
  };
  tasksByStatus: {
    todo: number;
    progress: number;
    done: number;
  };
  tasksByPriority: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
  };
  tasksByCategory: Record<string, number>;
  projectsByType: {
    manuscript: number;
    grant: number;
    general: number;
  };
  activityTrend: Array<{ date: string; count: number }>;
  completionTrend: Array<{ date: string; count: number }>;
  memberProductivity: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    role: string;
    totalTasks: number;
    completedTasks: number;
    activityCount: number;
  }>;
  period: string;
}

async function fetchAnalytics(
  workspaceId: string,
  period: string
): Promise<AnalyticsData> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    period,
  });

  const response = await fetch(`/api/analytics?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch analytics");
  }

  return response.json();
}

export function useAnalytics(workspaceId: string | null, period: string = "30d") {
  return useQuery({
    queryKey: ["analytics", workspaceId, period],
    queryFn: () => fetchAnalytics(workspaceId!, period),
    enabled: !!workspaceId,
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });
}

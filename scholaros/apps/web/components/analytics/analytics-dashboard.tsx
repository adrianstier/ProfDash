"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  Target,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useAnalytics } from "@/lib/hooks/use-analytics";
import { cn } from "@/lib/utils";

// Simple bar chart component (no external deps)
function SimpleBarChart({
  data,
  height = 200,
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * 100;
        return (
          <div
            key={index}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <span className="text-xs font-medium">{item.value}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${barHeight}%` }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={cn(
                "w-full rounded-t",
                item.color || "bg-primary"
              )}
              style={{ minHeight: item.value > 0 ? 4 : 0 }}
            />
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Mini sparkline chart
function Sparkline({
  data,
  color = "bg-primary",
}: {
  data: Array<{ date: string; count: number }>;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.slice(-14).map((item, index) => {
        const barHeight = (item.count / maxValue) * 100;
        return (
          <motion.div
            key={index}
            initial={{ height: 0 }}
            animate={{ height: `${barHeight}%` }}
            transition={{ delay: index * 0.02, duration: 0.3 }}
            className={cn("flex-1 rounded-sm", color)}
            style={{ minHeight: item.count > 0 ? 2 : 0 }}
            title={`${item.date}: ${item.count}`}
          />
        );
      })}
    </div>
  );
}

// Stat card component - Mobile optimized
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">{title}</CardTitle>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-1 sm:pt-0">
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{description}</p>
        )}
        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] sm:text-xs mt-1",
              trend >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            <TrendingUp
              className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", trend < 0 && "rotate-180")}
            />
            <span className="truncate">{Math.abs(trend)}% {trendLabel || "from last period"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Member productivity row
function MemberRow({
  member,
}: {
  member: {
    userId: string;
    name: string;
    avatar: string | null;
    role: string;
    totalTasks: number;
    completedTasks: number;
    activityCount: number;
  };
}) {
  const completionRate =
    member.totalTasks > 0
      ? Math.round((member.completedTasks / member.totalTasks) * 100)
      : 0;

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.avatar || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{member.name}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {member.role}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress
            value={completionRate}
            className="h-1.5 flex-1"
          />
          <span className="text-xs text-muted-foreground w-10 text-right">
            {completionRate}%
          </span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
          <span>{member.totalTasks} tasks</span>
          <span>{member.completedTasks} done</span>
          <span>{member.activityCount} activities</span>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState("30d");
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data, isLoading, isError, refetch } = useAnalytics(
    currentWorkspaceId,
    period
  );

  if (!currentWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Select a workspace to view analytics
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <p>Failed to load analytics</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
          Try again
        </Button>
      </div>
    );
  }

  const categoryData = Object.entries(data.tasksByCategory).map(([label, value]) => ({
    label: label.replace(/-/g, " "),
    value,
    color: getCategoryColor(label),
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Analytics</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Workspace productivity overview
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={data.summary.totalTasks}
          description={`${data.summary.pendingTasks} pending`}
          icon={FileText}
          className="col-span-1"
        />
        <StatCard
          title="Completion Rate"
          value={`${data.summary.completionRate}%`}
          description={`${data.summary.completedTasks} completed`}
          icon={Target}
          className="col-span-1"
        />
        <StatCard
          title="Avg. Tasks/Day"
          value={data.summary.avgTasksPerDay}
          description="Tasks completed per day"
          icon={TrendingUp}
          className="col-span-1"
        />
        <StatCard
          title="Team Members"
          value={data.summary.memberCount}
          description={`${data.summary.totalProjects} active projects`}
          icon={Users}
          className="col-span-1"
        />
      </div>

      {/* Charts Row - Stack vertically on mobile */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Task Status */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-sm sm:text-base">Task Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Current task distribution</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            <SimpleBarChart
              data={[
                { label: "To Do", value: data.tasksByStatus.todo, color: "bg-slate-400" },
                { label: "In Progress", value: data.tasksByStatus.progress, color: "bg-blue-500" },
                { label: "Done", value: data.tasksByStatus.done, color: "bg-green-500" },
              ]}
              height={120}
            />
          </CardContent>
        </Card>

        {/* Task Priority */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-sm sm:text-base">By Priority</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Task priority breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            <SimpleBarChart
              data={[
                { label: "P1", value: data.tasksByPriority.p1, color: "bg-red-500" },
                { label: "P2", value: data.tasksByPriority.p2, color: "bg-orange-500" },
                { label: "P3", value: data.tasksByPriority.p3, color: "bg-yellow-500" },
                { label: "P4", value: data.tasksByPriority.p4, color: "bg-green-500" },
              ]}
              height={120}
            />
          </CardContent>
        </Card>

        {/* Projects by Type */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-sm sm:text-base">Projects</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Active projects by type</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            <SimpleBarChart
              data={[
                { label: "Manuscripts", value: data.projectsByType.manuscript, color: "bg-blue-500" },
                { label: "Grants", value: data.projectsByType.grant, color: "bg-purple-500" },
                { label: "General", value: data.projectsByType.general, color: "bg-slate-400" },
              ]}
              height={120}
            />
          </CardContent>
        </Card>
      </div>

      {/* Trends Row - Stack vertically on mobile */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Activity Trend */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Trend
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Daily workspace activity</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            <Sparkline data={data.activityTrend} color="bg-blue-500" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.activityTrend.reduce((sum, d) => sum + d.count, 0)} total activities
            </p>
          </CardContent>
        </Card>

        {/* Completion Trend */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completion Trend
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Daily tasks completed</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            <Sparkline data={data.completionTrend} color="bg-green-500" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.completionTrend.reduce((sum, d) => sum + d.count, 0)} tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-sm sm:text-base">Tasks by Category</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Distribution across work categories</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            <SimpleBarChart data={categoryData} height={140} />
          </CardContent>
        </Card>
      )}

      {/* Team Productivity */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Productivity
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Individual member performance</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
          {data.memberProductivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No team members yet
            </p>
          ) : (
            <div className="divide-y">
              {data.memberProductivity
                .sort((a, b) => b.completedTasks - a.completedTasks)
                .map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to get category colors
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    research: "bg-blue-500",
    teaching: "bg-green-500",
    grants: "bg-purple-500",
    admin: "bg-orange-500",
    "grad-mentorship": "bg-pink-500",
    "undergrad-mentorship": "bg-cyan-500",
    misc: "bg-slate-400",
  };
  return colors[category] || "bg-slate-400";
}

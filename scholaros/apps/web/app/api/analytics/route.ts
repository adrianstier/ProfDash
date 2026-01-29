import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch analytics data for a workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, all

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Verify user is a member of the workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date("2000-01-01");
    }

    const startDateStr = startDate.toISOString();

    // Fetch all data in parallel
    const [
      tasksResult,
      projectsResult,
      membersResult,
      activityResult,
      completedTasksResult,
    ] = await Promise.all([
      // Total tasks
      supabase
        .from("tasks")
        .select("id, status, priority, category, created_at, completed_at, assignees")
        .eq("workspace_id", workspaceId),

      // Total projects
      supabase
        .from("projects")
        .select("id, type, stage, created_at")
        .eq("workspace_id", workspaceId),

      // Workspace members
      supabase
        .from("workspace_members")
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("workspace_id", workspaceId),

      // Activity in period
      supabase
        .from("workspace_activity")
        .select("id, action, user_id, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", startDateStr)
        .order("created_at", { ascending: false })
        .limit(500),

      // Tasks completed in period
      supabase
        .from("tasks")
        .select("id, completed_at, assignees")
        .eq("workspace_id", workspaceId)
        .eq("status", "done")
        .gte("completed_at", startDateStr),
    ]);

    // Process task data
    const tasks = tasksResult.data || [];
    const tasksByStatus = {
      todo: tasks.filter((t) => t.status === "todo").length,
      progress: tasks.filter((t) => t.status === "progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    };

    const tasksByPriority = {
      p1: tasks.filter((t) => t.priority === "p1").length,
      p2: tasks.filter((t) => t.priority === "p2").length,
      p3: tasks.filter((t) => t.priority === "p3").length,
      p4: tasks.filter((t) => t.priority === "p4").length,
    };

    const tasksByCategory: Record<string, number> = {};
    tasks.forEach((task) => {
      const category = task.category || "misc";
      tasksByCategory[category] = (tasksByCategory[category] || 0) + 1;
    });

    // Process project data
    const projects = projectsResult.data || [];
    const projectsByType = {
      manuscript: projects.filter((p) => p.type === "manuscript").length,
      grant: projects.filter((p) => p.type === "grant").length,
      general: projects.filter((p) => p.type === "general").length,
    };

    // Process member data
    const members = membersResult.data || [];
    const memberCount = members.length;

    // Process activity data for trends
    const activities = activityResult.data || [];
    const activityByDate: Record<string, number> = {};
    activities.forEach((activity) => {
      const date = activity.created_at.split("T")[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    // Convert to array for charting
    const activityTrend = Object.entries(activityByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Process completed tasks for productivity
    const completedTasks = completedTasksResult.data || [];
    const completedByDate: Record<string, number> = {};
    completedTasks.forEach((task) => {
      if (task.completed_at) {
        const date = task.completed_at.split("T")[0];
        completedByDate[date] = (completedByDate[date] || 0) + 1;
      }
    });

    const completionTrend = Object.entries(completedByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Calculate member productivity
    const memberProductivity = members.map((member) => {
      const memberTasks = tasks.filter((t) =>
        (t.assignees || []).includes(member.user_id)
      );
      const completedMemberTasks = completedTasks.filter((t) =>
        (t.assignees || []).includes(member.user_id)
      );
      const memberActivities = activities.filter(
        (a) => a.user_id === member.user_id
      );

      return {
        userId: member.user_id,
        name: (member.profiles as { full_name?: string })?.full_name || "Unknown",
        avatar: (member.profiles as { avatar_url?: string })?.avatar_url,
        role: member.role,
        totalTasks: memberTasks.length,
        completedTasks: completedMemberTasks.length,
        activityCount: memberActivities.length,
      };
    });

    // Calculate summary stats
    const totalTasks = tasks.length;
    const completedTotal = tasksByStatus.done;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTotal / totalTasks) * 100) : 0;

    const avgTasksPerDay =
      completionTrend.length > 0
        ? Math.round(
            completionTrend.reduce((sum, d) => sum + d.count, 0) /
              completionTrend.length * 10
          ) / 10
        : 0;

    return NextResponse.json({
      summary: {
        totalTasks,
        completedTasks: completedTotal,
        inProgressTasks: tasksByStatus.progress,
        pendingTasks: tasksByStatus.todo,
        completionRate,
        avgTasksPerDay,
        totalProjects: projects.length,
        memberCount,
      },
      tasksByStatus,
      tasksByPriority,
      tasksByCategory,
      projectsByType,
      activityTrend,
      completionTrend,
      memberProductivity,
      period,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MessageSquare,
  Pin,
  Plus,
  Trash2,
  Edit3,
  User,
  Loader2,
  Activity,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useActivityFeed } from "@/lib/hooks/use-activity";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ActivityAction, ActivityEntryWithUser } from "@scholaros/shared";

// Icon mapping for activity types
const ACTIVITY_ICONS: Record<ActivityAction, React.ReactNode> = {
  task_created: <Plus className="h-4 w-4 text-green-500" />,
  task_updated: <Edit3 className="h-4 w-4 text-blue-500" />,
  task_completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  task_deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  task_reopened: <Clock className="h-4 w-4 text-yellow-500" />,
  task_assigned: <User className="h-4 w-4 text-purple-500" />,
  task_priority_changed: <Activity className="h-4 w-4 text-orange-500" />,
  task_due_date_changed: <Clock className="h-4 w-4 text-purple-500" />,
  task_status_changed: <Clock className="h-4 w-4 text-blue-500" />,
  subtask_added: <Plus className="h-4 w-4 text-green-500" />,
  subtask_completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  subtask_deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  notes_updated: <FileText className="h-4 w-4 text-gray-500" />,
  project_created: <Plus className="h-4 w-4 text-green-500" />,
  project_updated: <Edit3 className="h-4 w-4 text-blue-500" />,
  project_stage_changed: <Circle className="h-4 w-4 text-purple-500" />,
  project_milestone_completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  phase_created: <Plus className="h-4 w-4 text-blue-500" />,
  phase_started: <Circle className="h-4 w-4 text-green-500" />,
  phase_completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  phase_blocked: <Clock className="h-4 w-4 text-red-500" />,
  workstream_created: <Plus className="h-4 w-4 text-blue-500" />,
  workstream_updated: <Edit3 className="h-4 w-4 text-blue-500" />,
  deliverable_created: <Plus className="h-4 w-4 text-blue-500" />,
  deliverable_completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  role_assigned: <User className="h-4 w-4 text-purple-500" />,
  template_applied: <FileText className="h-4 w-4 text-indigo-500" />,
  message_sent: <MessageSquare className="h-4 w-4 text-blue-500" />,
  message_pinned: <Pin className="h-4 w-4 text-amber-500" />,
  ai_tasks_extracted: <Activity className="h-4 w-4 text-violet-500" />,
  ai_task_enhanced: <Activity className="h-4 w-4 text-violet-500" />,
  ai_task_breakdown: <Activity className="h-4 w-4 text-violet-500" />,
};

// Label mapping for activity types
const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  task_created: "created a task",
  task_updated: "updated a task",
  task_completed: "completed a task",
  task_deleted: "deleted a task",
  task_reopened: "reopened a task",
  task_assigned: "assigned a task",
  task_priority_changed: "changed task priority",
  task_due_date_changed: "changed due date",
  task_status_changed: "changed task status",
  subtask_added: "added a subtask",
  subtask_completed: "completed a subtask",
  subtask_deleted: "deleted a subtask",
  notes_updated: "updated notes",
  project_created: "created a project",
  project_updated: "updated a project",
  project_stage_changed: "changed project stage",
  project_milestone_completed: "completed a milestone",
  phase_created: "created a phase",
  phase_started: "started a phase",
  phase_completed: "completed a phase",
  phase_blocked: "blocked a phase",
  workstream_created: "created a workstream",
  workstream_updated: "updated a workstream",
  deliverable_created: "created a deliverable",
  deliverable_completed: "completed a deliverable",
  role_assigned: "assigned a role",
  template_applied: "applied a template",
  message_sent: "sent a message",
  message_pinned: "pinned a message",
  ai_tasks_extracted: "extracted tasks with AI",
  ai_task_enhanced: "enhanced a task with AI",
  ai_task_breakdown: "broke down a task with AI",
};

interface ActivityItemProps {
  activity: ActivityEntryWithUser;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const userName = activity.user?.full_name || "Unknown";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-3 px-4 hover:bg-muted/50 transition-colors"
    >
      {/* User avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={activity.user?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Activity icon */}
          <span className="flex-shrink-0">
            {ACTIVITY_ICONS[activity.action]}
          </span>

          {/* Activity text */}
          <p className="text-sm">
            <span className="font-medium">{userName}</span>{" "}
            <span className="text-muted-foreground">
              {ACTIVITY_LABELS[activity.action]}
            </span>
          </p>
        </div>

        {/* Entity title if available */}
        {activity.entity_title && (
          <p className="text-sm text-muted-foreground truncate mt-0.5 ml-6">
            &quot;{activity.entity_title}&quot;
          </p>
        )}

        {/* Details if available */}
        {activity.details && Object.keys(activity.details).length > 0 && (
          <div className="text-xs text-muted-foreground mt-1 ml-6">
            {"old_status" in activity.details && "new_status" in activity.details && (
              <span>
                {String(activity.details.old_status)} →{" "}
                {String(activity.details.new_status)}
              </span>
            )}
            {"old_stage" in activity.details && "new_stage" in activity.details && (
              <span>
                {String(activity.details.old_stage)} →{" "}
                {String(activity.details.new_stage)}
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-1 ml-6">{timeAgo}</p>
      </div>
    </motion.div>
  );
}

interface ActivityFeedProps {
  className?: string;
  maxHeight?: string;
  maxItems?: number;
  showHeader?: boolean;
  filterUserId?: string;
  filterTaskId?: string;
  filterProjectId?: string;
  /** @deprecated Use filterTaskId instead */
  taskId?: string;
  /** @deprecated Use filterProjectId instead */
  projectId?: string;
}

export function ActivityFeed({
  className,
  maxHeight = "500px",
  maxItems,
  showHeader = true,
  filterUserId,
  filterTaskId,
  filterProjectId,
  taskId,
  projectId,
}: ActivityFeedProps) {
  const supabase = createClient();
  const { currentWorkspaceId } = useWorkspaceStore();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useActivityFeed(currentWorkspaceId || "", {
    userId: filterUserId,
    taskId: filterTaskId || taskId,
    projectId: filterProjectId || projectId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const channel = supabase
      .channel(`workspace-activity-${currentWorkspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workspace_activity",
          filter: `workspace_id=eq.${currentWorkspaceId}`,
        },
        () => {
          // Refetch activity feed when new activity is logged
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, supabase, refetch]);

  const allActivities = data?.pages.flatMap((page) => page.data) || [];
  const activities = maxItems ? allActivities.slice(0, maxItems) : allActivities;

  if (!currentWorkspaceId) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        Select a workspace to view activity
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Activity Feed</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
          </Button>
        </div>
      )}

      <ScrollArea style={{ maxHeight }}>
        {isLoading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>Failed to load activity</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              Try again
            </Button>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p>No activity yet</p>
            <p className="text-sm">Activity will appear here as you work</p>
          </div>
        ) : (
          <div className="divide-y">
            <AnimatePresence>
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </AnimatePresence>

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

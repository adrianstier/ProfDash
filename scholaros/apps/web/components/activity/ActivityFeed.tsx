"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useActivityFeed } from "@/lib/hooks/use-activity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  RotateCcw,
  UserPlus,
  Flag,
  Calendar,
  ArrowRight,
  ListPlus,
  CheckSquare,
  ListMinus,
  FileText,
  FolderPlus,
  Folder,
  MessageSquare,
  Pin,
  Sparkles,
  Wand2,
  ListTree,
  Loader2,
  Layers,
  Play,
  AlertTriangle,
  GitBranch,
  Package,
  UserCheck,
  Copy,
} from "lucide-react";
import type { ActivityAction, ActivityEntryWithUser } from "@scholaros/shared";

const ACTION_CONFIG: Record<
  ActivityAction,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  task_created: { icon: Plus, label: "created a task", color: "text-green-500" },
  task_updated: { icon: Pencil, label: "updated a task", color: "text-blue-500" },
  task_deleted: { icon: Trash2, label: "deleted a task", color: "text-red-500" },
  task_completed: { icon: CheckCircle, label: "completed a task", color: "text-green-500" },
  task_reopened: { icon: RotateCcw, label: "reopened a task", color: "text-yellow-500" },
  task_assigned: { icon: UserPlus, label: "assigned a task", color: "text-blue-500" },
  task_priority_changed: { icon: Flag, label: "changed priority", color: "text-orange-500" },
  task_due_date_changed: { icon: Calendar, label: "changed due date", color: "text-purple-500" },
  task_status_changed: { icon: ArrowRight, label: "changed status", color: "text-blue-500" },
  subtask_added: { icon: ListPlus, label: "added a subtask", color: "text-green-500" },
  subtask_completed: { icon: CheckSquare, label: "completed a subtask", color: "text-green-500" },
  subtask_deleted: { icon: ListMinus, label: "removed a subtask", color: "text-red-500" },
  notes_updated: { icon: FileText, label: "updated notes", color: "text-gray-500" },
  project_created: { icon: FolderPlus, label: "created a project", color: "text-green-500" },
  project_updated: { icon: Folder, label: "updated a project", color: "text-blue-500" },
  project_stage_changed: { icon: ArrowRight, label: "moved project stage", color: "text-purple-500" },
  project_milestone_completed: { icon: Flag, label: "completed a milestone", color: "text-green-500" },
  phase_created: { icon: Layers, label: "created a phase", color: "text-blue-500" },
  phase_started: { icon: Play, label: "started a phase", color: "text-green-500" },
  phase_completed: { icon: CheckCircle, label: "completed a phase", color: "text-green-500" },
  phase_blocked: { icon: AlertTriangle, label: "blocked a phase", color: "text-red-500" },
  workstream_created: { icon: GitBranch, label: "created a workstream", color: "text-blue-500" },
  workstream_updated: { icon: GitBranch, label: "updated a workstream", color: "text-blue-500" },
  deliverable_created: { icon: Package, label: "created a deliverable", color: "text-blue-500" },
  deliverable_completed: { icon: Package, label: "completed a deliverable", color: "text-green-500" },
  role_assigned: { icon: UserCheck, label: "assigned a role", color: "text-purple-500" },
  template_applied: { icon: Copy, label: "applied a template", color: "text-indigo-500" },
  message_sent: { icon: MessageSquare, label: "sent a message", color: "text-blue-500" },
  message_pinned: { icon: Pin, label: "pinned a message", color: "text-yellow-500" },
  ai_tasks_extracted: { icon: Sparkles, label: "extracted tasks with AI", color: "text-purple-500" },
  ai_task_enhanced: { icon: Wand2, label: "enhanced a task with AI", color: "text-purple-500" },
  ai_task_breakdown: { icon: ListTree, label: "broke down a task with AI", color: "text-purple-500" },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function ActivityItem({ entry }: { entry: ActivityEntryWithUser }) {
  const config = ACTION_CONFIG[entry.action];
  const Icon = config?.icon || Activity;

  const userName = entry.user?.full_name || "Unknown";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={entry.user?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{userName}</span>
          <span className="text-muted-foreground text-sm">{config?.label || entry.action}</span>
        </div>

        {entry.entity_title && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            &ldquo;{entry.entity_title}&rdquo;
          </p>
        )}

        <span className="text-xs text-muted-foreground mt-1 block">
          {formatRelativeTime(entry.created_at)}
        </span>
      </div>

      <div className={cn("p-1.5 rounded-lg bg-muted/50", config?.color)}>
        <Icon className="h-4 w-4" />
      </div>
    </motion.div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
  taskId?: string;
  projectId?: string;
}

export function ActivityFeed({ className, maxItems = 20, taskId, projectId }: ActivityFeedProps) {
  const supabase = createClient();
  const { currentWorkspaceId } = useWorkspaceStore();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useActivityFeed(currentWorkspaceId || "", {
    taskId,
    projectId,
  });

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Real-time subscription
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const channel = supabase
      .channel(`activity-${currentWorkspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workspace_activity",
          filter: `workspace_id=eq.${currentWorkspaceId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, supabase, refetch]);

  const allEntries = data?.pages.flatMap((page) => page.data) || [];
  const displayEntries = maxItems ? allEntries.slice(0, maxItems) : allEntries;

  if (!currentWorkspaceId) {
    return (
      <div className={cn("text-center text-muted-foreground py-8", className)}>
        Select a workspace to view activity
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Recent Activity</h3>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Activity list */}
      <div className="space-y-0.5">
        {isLoading ? (
          <>
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
          </>
        ) : displayEntries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayEntries.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
        )}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasNextPage && !isFetchingNextPage && !maxItems && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

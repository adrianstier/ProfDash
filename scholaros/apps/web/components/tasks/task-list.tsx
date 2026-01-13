"use client";

import { useMemo } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTasks, useToggleTaskComplete, useDeleteTask, type TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useTaskStore, filterTasks, sortTasks } from "@/lib/stores/task-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { usePagination } from "@/lib/hooks/use-pagination";
import { Pagination } from "@/components/ui/pagination";
import { TaskCard } from "./task-card";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import { MESSAGES } from "@/lib/constants";

// Mock data for development when not connected to database
const mockTasks: TaskFromAPI[] = [
  {
    id: "1",
    user_id: "user-1",
    title: "Review NSF proposal draft",
    description: "Final review before submission deadline",
    priority: "p1",
    category: "grants",
    status: "todo",
    due: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user-1",
    title: "Grade midterm exams",
    description: "CS 101 midterms - 45 students",
    priority: "p2",
    category: "teaching",
    status: "todo",
    due: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "user-1",
    title: "Weekly lab meeting",
    description: "Discuss progress on ML project",
    priority: "p2",
    category: "research",
    status: "todo",
    due: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    user_id: "user-1",
    title: "Submit travel reimbursement",
    description: "Conference expenses from last month",
    priority: "p3",
    category: "admin",
    status: "todo",
    due: new Date(Date.now() + 172800000).toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

interface TaskListProps {
  initialTasks?: TaskFromAPI[];
  filter?: "today" | "upcoming" | "all";
  useMockData?: boolean;
  useStoreFilters?: boolean;
  workspaceId?: string | null;
  paginate?: boolean;
  pageSize?: number;
  showBulkActions?: boolean;
}

export function TaskList({
  initialTasks,
  filter = "all",
  useMockData = false,
  useStoreFilters = false,
  workspaceId: propWorkspaceId,
  paginate = false,
  pageSize: initialPageSize = 20,
  showBulkActions = true,
}: TaskListProps) {
  const { currentWorkspaceId } = useWorkspaceStore();

  // Use prop if provided, otherwise use store value
  const workspaceId = propWorkspaceId !== undefined ? propWorkspaceId : currentWorkspaceId;

  // Build filters for the query
  const taskFilters = filter === "today"
    ? { due: "today" as const, workspace_id: workspaceId }
    : filter === "upcoming"
    ? { due: "upcoming" as const, workspace_id: workspaceId }
    : { workspace_id: workspaceId };

  // Only fetch if we don't have initialTasks - prevents double-fetching
  // When initialTasks is provided, we use it as the data source
  const shouldFetch = !initialTasks?.length && !useMockData;

  const { data: fetchedTasks, isLoading, error } = useTasks(
    shouldFetch ? taskFilters : undefined
  );

  const toggleComplete = useToggleTaskComplete();
  const deleteTask = useDeleteTask();
  const { filters, sortBy, sortDirection, openTaskDetail, setEditingTask } = useTaskStore();

  // Determine which tasks to display - prioritize initialTasks for SSR hydration
  const rawTasks: TaskFromAPI[] = useMockData
    ? mockTasks
    : initialTasks?.length
    ? initialTasks
    : fetchedTasks || mockTasks; // Fall back to mock data if API fails

  // Apply date-based filtering first (for today/upcoming views)
  const dateFilteredTasks = useMemo(() => {
    if (initialTasks || useMockData) {
      return rawTasks.filter((task) => {
        if (filter === "today") {
          const today = new Date().toISOString().split("T")[0];
          return task.due === today || !task.due;
        }
        if (filter === "upcoming") {
          const today = new Date().toISOString().split("T")[0];
          return task.due && task.due >= today;
        }
        return true;
      });
    }
    return rawTasks;
  }, [rawTasks, filter, initialTasks, useMockData]);

  // Apply store filters and sorting
  const processedTasks = useMemo(() => {
    if (!useStoreFilters) {
      return dateFilteredTasks;
    }
    const filtered = filterTasks(dateFilteredTasks, filters);
    return sortTasks(filtered, sortBy, sortDirection);
  }, [dateFilteredTasks, useStoreFilters, filters, sortBy, sortDirection]);

  // Pagination
  const pagination = usePagination<TaskFromAPI>({
    initialPageSize,
    totalItems: processedTasks.length,
  });

  // Apply pagination to tasks
  const displayedTasks = paginate
    ? pagination.paginateData(processedTasks)
    : processedTasks;

  // Get all task IDs for bulk selection - must be before any early returns
  const allTaskIds = useMemo(() => processedTasks.map((t) => t.id), [processedTasks]);

  const handleToggleComplete = (task: TaskFromAPI) => {
    if (useMockData) {
      // Mock mode - no action needed
      return;
    }
    toggleComplete.mutate(task);
  };

  const handleEdit = (task: TaskFromAPI) => {
    setEditingTask(task.id);
    openTaskDetail(task.id);
  };

  const handleDelete = (task: TaskFromAPI) => {
    if (useMockData) {
      // Mock mode - no action needed
      return;
    }
    if (confirm(MESSAGES.confirmations.deleteTask)) {
      deleteTask.mutate(task.id);
    }
  };

  if (isLoading && shouldFetch) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && shouldFetch) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">Failed to load tasks</p>
        <p className="text-sm">Please try again later</p>
      </div>
    );
  }

  if (processedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Check className="mb-4 h-12 w-12 text-green-500" />
        <p className="text-lg font-medium">{MESSAGES.empty.allCaughtUp}</p>
        <p className="text-sm">{MESSAGES.empty.tasks}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {showBulkActions && !useMockData && (
        <BulkActionsToolbar allTaskIds={allTaskIds} />
      )}

      <div className="space-y-2">
        {displayedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      {paginate && processedTasks.length > initialPageSize && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
}

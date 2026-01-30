"use client";

import { useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Loader2 } from "lucide-react";
import { useTasks, useToggleTaskComplete, useDeleteTask, type TaskFromAPI } from "@/lib/hooks/use-tasks";
import { useTaskStore, filterTasks, sortTasks, applyFocusModeFilter } from "@/lib/stores/task-store";
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
  /**
   * Enable virtual scrolling for large lists
   * Recommended for lists with 50+ items
   * @default false
   */
  virtualize?: boolean;
  /**
   * Height of the virtualized container
   * Only used when virtualize is true
   * @default 600
   */
  virtualHeight?: number;
}

// Estimated row height for virtualization
const ESTIMATED_ROW_HEIGHT = 88;
// Number of items to render outside the visible area
const OVERSCAN_COUNT = 5;

export function TaskList({
  initialTasks,
  filter = "all",
  useMockData = false,
  useStoreFilters = false,
  workspaceId: propWorkspaceId,
  paginate = false,
  pageSize: initialPageSize = 20,
  showBulkActions = true,
  virtualize = false,
  virtualHeight = 600,
}: TaskListProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const parentRef = useRef<HTMLDivElement>(null);

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
  const { filters, sortBy, sortDirection, openTaskDetail, setEditingTask, focusMode } = useTaskStore();

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

  // Apply focus mode filtering
  const focusFilteredTasks = useMemo(() => {
    if (!focusMode) return dateFilteredTasks;
    return applyFocusModeFilter(dateFilteredTasks);
  }, [dateFilteredTasks, focusMode]);

  // Apply store filters and sorting
  const processedTasks = useMemo(() => {
    if (!useStoreFilters) {
      return focusFilteredTasks;
    }
    const filtered = filterTasks(focusFilteredTasks, filters);
    return sortTasks(filtered, sortBy, sortDirection);
  }, [focusFilteredTasks, useStoreFilters, filters, sortBy, sortDirection]);

  // Pagination
  const pagination = usePagination<TaskFromAPI>({
    initialPageSize,
    totalItems: processedTasks.length,
  });

  // Apply pagination to tasks (only when not virtualizing)
  const displayedTasks = paginate && !virtualize
    ? pagination.paginateData(processedTasks)
    : processedTasks;

  // Get all task IDs for bulk selection - must be before any early returns
  const allTaskIds = useMemo(() => processedTasks.map((t) => t.id), [processedTasks]);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: virtualize ? displayedTasks.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN_COUNT,
    // Maintain scroll position on data updates
    getItemKey: (index) => displayedTasks[index]?.id ?? index,
  });

  const handleToggleComplete = useCallback((task: TaskFromAPI) => {
    if (useMockData) {
      // Mock mode - no action needed
      return;
    }
    toggleComplete.mutate(task);
  }, [useMockData, toggleComplete]);

  const handleEdit = useCallback((task: TaskFromAPI) => {
    setEditingTask(task.id);
    openTaskDetail(task.id);
  }, [setEditingTask, openTaskDetail]);

  const handleDelete = useCallback((task: TaskFromAPI) => {
    if (useMockData) {
      // Mock mode - no action needed
      return;
    }
    if (confirm(MESSAGES.confirmations.deleteTask)) {
      deleteTask.mutate(task.id);
    }
  }, [useMockData, deleteTask]);

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

  // Render virtualized list
  if (virtualize && displayedTasks.length > 0) {
    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div className="space-y-4">
        {/* Bulk Actions Toolbar */}
        {showBulkActions && !useMockData && (
          <BulkActionsToolbar allTaskIds={allTaskIds} />
        )}

        {/* Virtualized container */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: virtualHeight }}
        >
          {/* Total height spacer */}
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {/* Rendered items */}
            {virtualItems.map((virtualItem) => {
              const task = displayedTasks[virtualItem.index];
              if (!task) return null;

              return (
                <div
                  key={task.id}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    height: virtualItem.size,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="pb-2">
                    <TaskCard
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Render standard list
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

/**
 * Virtualized task list component for large datasets
 * Pre-configured with optimal settings for performance
 */
export function VirtualizedTaskList(props: Omit<TaskListProps, "virtualize" | "paginate">) {
  return (
    <TaskList
      {...props}
      virtualize={true}
      paginate={false}
    />
  );
}

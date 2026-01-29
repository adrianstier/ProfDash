"use client";

import { useState, useMemo, memo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus, Filter, X, Kanban, Circle, CircleDashed, CheckCircle2 } from "lucide-react";
import type { TaskStatus, TaskCategory, TaskPriority } from "@scholaros/shared";
import {
  useTasks,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
  useCreateTask,
} from "@/lib/hooks/use-tasks";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { useTaskStore } from "@/lib/stores/task-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToastActions } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const columns: {
  id: TaskStatus;
  label: string;
  icon: typeof Circle;
  color: string;
  bgColor: string;
}[] = [
  {
    id: "todo",
    label: "To Do",
    icon: CircleDashed,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
  },
  {
    id: "progress",
    label: "In Progress",
    icon: Circle,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

const categoryFilters: { id: TaskCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "research", label: "Research" },
  { id: "teaching", label: "Teaching" },
  { id: "grants", label: "Grants" },
  { id: "admin", label: "Admin" },
];

const priorityFilters: { id: TaskPriority | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "p1", label: "P1" },
  { id: "p2", label: "P2" },
  { id: "p3", label: "P3" },
  { id: "p4", label: "P4" },
];

interface DroppableColumnProps {
  id: TaskStatus;
  label: string;
  icon: typeof Circle;
  color: string;
  bgColor: string;
  tasks: TaskFromAPI[];
  onToggleComplete: (task: TaskFromAPI) => void;
  onEdit: (task: TaskFromAPI) => void;
  onDelete: (task: TaskFromAPI) => void;
  onAddTask: (status: TaskStatus) => void;
}

const DroppableColumn = memo(function DroppableColumn({
  id,
  label,
  icon: Icon,
  color,
  bgColor,
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onAddTask,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border transition-all duration-200",
        isOver
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "bg-card/50 hover:bg-card/80"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className={cn("rounded-lg p-1.5", bgColor)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          <h3 className="font-medium text-sm">{label}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(id)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Add task to ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-2.5 p-3 min-h-[250px] scrollbar-hide overflow-y-auto"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, i) => (
            <div
              key={task.id}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <TaskCard
                task={task}
                isDraggable
                isCompact
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <div className={cn("rounded-xl p-3 mb-3", bgColor)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <p className="text-sm text-muted-foreground">No tasks</p>
            <button
              onClick={() => onAddTask(id)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Add one
            </button>
          </div>
        )}

        {isOver && (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 py-6 text-sm font-medium text-primary animate-pulse">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
});

DroppableColumn.displayName = "DroppableColumn";

function InlineQuickAdd({
  status,
  onCancel,
  workspaceId,
}: {
  status: TaskStatus;
  onCancel: () => void;
  workspaceId: string | null;
}) {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();
  const toast = useToastActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        status,
        priority: "p3",
        category: "misc",
        workspace_id: workspaceId,
        description: null,
        due: null,
        project_id: null,
        assignees: [],
        tags: [],
      });
      toast.success("Task created");
      onCancel();
    } catch {
      toast.error("Failed to create task");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        className="input-base"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="btn-primary flex-1 py-2 text-sm"
        >
          {createTask.isPending ? "Adding..." : "Add Task"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function BoardPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  // Show all tasks (personal + workspace) to match Today page behavior
  // If you want workspace-only filtering, add back: workspace_id: currentWorkspaceId
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleComplete = useToggleTaskComplete();
  const { openTaskDetail, setEditingTask } = useTaskStore();
  const toast = useToastActions();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TaskFromAPI | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">(
    "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all"
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (categoryFilter !== "all" && task.category !== categoryFilter)
        return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [tasks, categoryFilter, priorityFilter]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskFromAPI[]> = {
      todo: [],
      progress: [],
      done: [],
    };

    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId),
    [tasks, activeId]
  );

  const hasActiveFilters =
    categoryFilter !== "all" || priorityFilter !== "all";

  const clearFilters = () => {
    setCategoryFilter("all");
    setPriorityFilter("all");
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const isColumn = columns.some((col) => col.id === overId);

    if (isColumn) {
      const newStatus = overId as TaskStatus;
      const task = tasks.find((t) => t.id === taskId);

      if (task && task.status !== newStatus) {
        updateTask.mutate({
          id: taskId,
          status: newStatus,
        });
        toast.success(
          `Moved to ${columns.find((c) => c.id === newStatus)?.label}`
        );
      }
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overTask.status) {
        updateTask.mutate({
          id: taskId,
          status: overTask.status,
        });
        toast.success(
          `Moved to ${columns.find((c) => c.id === overTask.status)?.label}`
        );
      }
    }
  };

  const handleToggleComplete = (task: TaskFromAPI) => {
    toggleComplete.mutate(task);
  };

  const handleEdit = (task: TaskFromAPI) => {
    setEditingTask(task.id);
    openTaskDetail(task.id);
  };

  const handleDeleteClick = (task: TaskFromAPI) => {
    setDeleteConfirm(task);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteTask.mutate(deleteConfirm.id);
      toast.success("Task deleted");
      setDeleteConfirm(null);
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    setAddingToColumn(status);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Clean, minimal approach */}
      <header className="rounded-2xl border border-border/50 bg-card/50 p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Kanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Board
              </h1>
              <p className="text-sm text-muted-foreground">
                Drag tasks between columns to update status
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
              showFilters || hasActiveFilters
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {(categoryFilter !== "all" ? 1 : 0) +
                  (priorityFilter !== "all" ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Filters - Improved spacing and scroll behavior */}
      {showFilters && (
        <section className="rounded-xl border bg-card p-4 animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Category filters */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-muted-foreground shrink-0">
                Category:
              </span>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
                {categoryFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setCategoryFilter(filter.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-all shrink-0",
                      categoryFilter === filter.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden sm:block h-6 w-px bg-border shrink-0" />

            {/* Priority filters */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-muted-foreground shrink-0">
                Priority:
              </span>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
                {priorityFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setPriorityFilter(filter.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-all shrink-0",
                      priorityFilter === filter.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="sm:ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            )}
          </div>
        </section>
      )}

      {/* Quick Add Modal */}
      {addingToColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 border-b px-4 py-4">
              {(() => {
                const column = columns.find((c) => c.id === addingToColumn);
                const Icon = column?.icon || Circle;
                return (
                  <>
                    <div className={cn("rounded-lg p-2", column?.bgColor)}>
                      <Icon className={cn("h-4 w-4", column?.color)} />
                    </div>
                    <h3 className="font-semibold">Add to {column?.label}</h3>
                  </>
                );
              })()}
            </div>
            <InlineQuickAdd
              status={addingToColumn}
              onCancel={() => setAddingToColumn(null)}
              workspaceId={currentWorkspaceId}
            />
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Mobile: vertical stack, Tablet: horizontal scroll, Desktop: grid */}
        <div className="flex flex-col gap-5 sm:flex-row sm:overflow-x-auto sm:pb-4 sm:-mx-4 sm:px-4 sm:snap-x sm:snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0 animate-fade-in stagger-1">
          {columns.map((column, i) => (
            <div
              key={column.id}
              className="animate-fade-in w-full sm:min-w-[320px] sm:max-w-[360px] sm:flex-shrink-0 sm:snap-center lg:min-w-0 lg:max-w-none lg:snap-align-none"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <DroppableColumn
                id={column.id}
                label={column.label}
                icon={column.icon}
                color={column.color}
                bgColor={column.bgColor}
                tasks={tasksByStatus[column.id]}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onAddTask={handleAddTask}
              />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-105 shadow-2xl">
              <TaskCard task={activeTask} isCompact />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteTask.isPending}
      />
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
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
import { Plus, Loader2 } from "lucide-react";
import type { TaskStatus } from "@scholaros/shared";
import { useTasks, useUpdateTask, useDeleteTask, useToggleTaskComplete } from "@/lib/hooks/use-tasks";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { useTaskStore } from "@/lib/stores/task-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "bg-slate-500" },
  { id: "progress", label: "In Progress", color: "bg-blue-500" },
  { id: "done", label: "Done", color: "bg-green-500" },
];

interface DroppableColumnProps {
  id: TaskStatus;
  label: string;
  color: string;
  tasks: TaskFromAPI[];
  activeId: string | null;
  onToggleComplete: (task: TaskFromAPI) => void;
  onEdit: (task: TaskFromAPI) => void;
  onDelete: (task: TaskFromAPI) => void;
}

function DroppableColumn({
  id,
  label,
  color,
  tasks,
  activeId,
  onToggleComplete,
  onEdit,
  onDelete,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex flex-col rounded-lg border transition-colors ${
        isOver ? "border-primary bg-primary/5" : "bg-muted/30"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          <h3 className="font-medium">{label}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button className="rounded p-1 hover:bg-muted">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-2 p-2 min-h-[200px]"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDraggable
              isCompact
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
            No tasks
          </div>
        )}

        {isOver && tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-primary/50 py-8 text-sm text-primary">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: tasks = [], isLoading } = useTasks({ workspace_id: currentWorkspaceId });
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleComplete = useToggleTaskComplete();
  const { openTaskDetail, setEditingTask } = useTaskStore();

  const [activeId, setActiveId] = useState<string | null>(null);

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

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskFromAPI[]> = {
      todo: [],
      progress: [],
      done: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId),
    [tasks, activeId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Can be used for real-time visual feedback
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const isColumn = columns.some((col) => col.id === overId);

    if (isColumn) {
      const newStatus = overId as TaskStatus;
      const task = tasks.find((t) => t.id === taskId);

      if (task && task.status !== newStatus) {
        updateTask.mutate({
          id: taskId,
          status: newStatus,
        });
      }
      return;
    }

    // Dropped on another task - find which column it's in
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overTask.status) {
        updateTask.mutate({
          id: taskId,
          status: overTask.status,
        });
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

  const handleDelete = (task: TaskFromAPI) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(task.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Board</h1>
        <p className="text-muted-foreground">
          Drag tasks between columns to update their status
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              id={column.id}
              label={column.label}
              color={column.color}
              tasks={tasksByStatus[column.id]}
              activeId={activeId}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 scale-105">
              <TaskCard
                task={activeTask}
                isCompact
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Tag,
  X,
  ChevronDown,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTaskStore } from "@/lib/stores/task-store";
import { useBulkUpdateTasks, useBulkDeleteTasks } from "@/lib/hooks/use-tasks";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority, TaskCategory } from "@scholaros/shared";

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { value: "todo", label: "To Do", icon: <Circle className="h-4 w-4" /> },
  { value: "progress", label: "In Progress", icon: <Clock className="h-4 w-4" /> },
  { value: "done", label: "Done", icon: <CheckCircle2 className="h-4 w-4" /> },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "p1", label: "P1 - Critical", color: "text-red-500" },
  { value: "p2", label: "P2 - High", color: "text-orange-500" },
  { value: "p3", label: "P3 - Medium", color: "text-yellow-500" },
  { value: "p4", label: "P4 - Low", color: "text-green-500" },
];

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: "research", label: "Research" },
  { value: "teaching", label: "Teaching" },
  { value: "grants", label: "Grants" },
  { value: "grad-mentorship", label: "Grad Mentorship" },
  { value: "undergrad-mentorship", label: "Undergrad Mentorship" },
  { value: "admin", label: "Admin" },
  { value: "misc", label: "Misc" },
];

interface BulkActionsToolbarProps {
  allTaskIds: string[];
}

export function BulkActionsToolbar({ allTaskIds }: BulkActionsToolbarProps) {
  const {
    selectedTaskIds,
    isSelectionMode,
    toggleSelectionMode,
    selectAllTasks,
    deselectAllTasks,
    clearSelection,
  } = useTaskStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();

  const selectedCount = selectedTaskIds.size;
  const allSelected = selectedCount === allTaskIds.length && allTaskIds.length > 0;

  const handleStatusChange = async (status: TaskStatus) => {
    if (selectedCount === 0) return;
    try {
      await bulkUpdate.mutateAsync({
        taskIds: Array.from(selectedTaskIds),
        updates: { status },
      });
      clearSelection();
    } catch (error) {
      console.error("Failed to update tasks:", error);
    }
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (selectedCount === 0) return;
    try {
      await bulkUpdate.mutateAsync({
        taskIds: Array.from(selectedTaskIds),
        updates: { priority },
      });
      clearSelection();
    } catch (error) {
      console.error("Failed to update tasks:", error);
    }
  };

  const handleCategoryChange = async (category: TaskCategory) => {
    if (selectedCount === 0) return;
    try {
      await bulkUpdate.mutateAsync({
        taskIds: Array.from(selectedTaskIds),
        updates: { category },
      });
      clearSelection();
    } catch (error) {
      console.error("Failed to update tasks:", error);
    }
  };

  const handleDelete = async () => {
    if (selectedCount === 0) return;
    try {
      await bulkDelete.mutateAsync({
        taskIds: Array.from(selectedTaskIds),
      });
      clearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete tasks:", error);
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      deselectAllTasks();
    } else {
      selectAllTasks(allTaskIds);
    }
  };

  const isLoading = bulkUpdate.isPending || bulkDelete.isPending;

  return (
    <>
      {/* Selection Mode Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={isSelectionMode ? "secondary" : "outline"}
          size="sm"
          onClick={toggleSelectionMode}
          className="gap-2"
        >
          {isSelectionMode ? (
            <>
              <CheckSquare className="h-4 w-4" />
              Exit Selection
            </>
          ) : (
            <>
              <Square className="h-4 w-4" />
              Select Tasks
            </>
          )}
        </Button>
      </div>

      {/* Floating Toolbar */}
      <AnimatePresence>
        {isSelectionMode && selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-background border rounded-xl shadow-xl">
              {/* Selection count */}
              <div className="flex items-center gap-2 pr-3 border-r">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-2"
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {allSelected ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-sm font-medium">
                  {selectedCount} selected
                </span>
              </div>

              {/* Status dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
                    <CheckCircle2 className="h-4 w-4" />
                    Status
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {STATUS_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      className="gap-2"
                    >
                      {option.icon}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
                    <AlertTriangle className="h-4 w-4" />
                    Priority
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Set Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRIORITY_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handlePriorityChange(option.value)}
                      className={cn("gap-2", option.color)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Category dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
                    <Tag className="h-4 w-4" />
                    Category
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Set Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {CATEGORY_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleCategoryChange(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Divider */}
              <div className="w-px h-6 bg-border" />

              {/* Delete button */}
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>

              {/* Clear selection button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete {selectedCount} tasks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

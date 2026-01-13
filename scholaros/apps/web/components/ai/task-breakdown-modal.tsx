"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  ListTree,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LegacyDialog as Dialog } from "@/components/ui/dialog";
import { useTaskBreakdown, type TaskBreakdownResult } from "@/lib/hooks/use-ai";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG = {
  p1: { label: "Urgent", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  p2: { label: "High", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  p3: { label: "Normal", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  p4: { label: "Low", color: "text-gray-500 bg-gray-500/10 border-gray-500/30" },
};

const COMPLEXITY_CONFIG = {
  low: { label: "Low Complexity", color: "text-green-500 bg-green-500/10" },
  medium: { label: "Medium Complexity", color: "text-yellow-500 bg-yellow-500/10" },
  high: { label: "High Complexity", color: "text-red-500 bg-red-500/10" },
};

interface TaskBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  taskDescription?: string;
  onCreateSubtasks?: (subtasks: TaskBreakdownResult["subtasks"]) => void;
}

export function TaskBreakdownModal({
  open,
  onOpenChange,
  taskTitle,
  taskDescription,
  onCreateSubtasks,
}: TaskBreakdownModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [result, setResult] = useState<TaskBreakdownResult | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set());
  const [breakdownStyle, setBreakdownStyle] = useState<"sequential" | "parallel" | "mixed">("mixed");

  const breakdown = useTaskBreakdown();

  const handleBreakdown = async () => {
    if (!currentWorkspaceId) return;

    try {
      const breakdownResult = await breakdown.mutateAsync({
        task_title: taskTitle,
        task_description: taskDescription,
        workspace_id: currentWorkspaceId,
        breakdown_style: breakdownStyle,
        include_estimates: true,
      });
      setResult(breakdownResult);
      setSelectedSubtasks(new Set(breakdownResult.subtasks.map((_, i) => i)));
    } catch (error) {
      console.error("Breakdown error:", error);
    }
  };

  const handleCreate = () => {
    if (!result) return;

    const selectedItems = result.subtasks.filter((_, i) => selectedSubtasks.has(i));
    onCreateSubtasks?.(selectedItems);

    handleClose();
  };

  const handleClose = () => {
    setResult(null);
    setSelectedSubtasks(new Set());
    onOpenChange(false);
  };

  const toggleSubtask = (index: number) => {
    const newSelected = new Set(selectedSubtasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSubtasks(newSelected);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      title="AI Task Breakdown"
      description={`Breaking down: "${taskTitle}"`}
      size="lg"
      icon={<ListTree className="h-5 w-5 text-purple-500" />}
    >
      <div className="space-y-4">
        {/* Options before breakdown */}
        {!result && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">Task to Break Down</h4>
              <p className="text-sm">{taskTitle}</p>
              {taskDescription && (
                <p className="text-sm text-muted-foreground mt-1">{taskDescription}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Breakdown Style</label>
              <div className="flex gap-2">
                {(["sequential", "parallel", "mixed"] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setBreakdownStyle(style)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md border text-sm transition-colors",
                      breakdownStyle === style
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sequential: One-by-one steps. Parallel: Independent tasks. Mixed: Combination.
              </p>
            </div>
          </div>
        )}

        {/* Result section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Approach Summary</h4>
                <Badge className={COMPLEXITY_CONFIG[result.complexity_rating].color}>
                  {COMPLEXITY_CONFIG[result.complexity_rating].label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.approach_summary}</p>

              {result.total_estimated_minutes && (
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Total estimated time: {formatTime(result.total_estimated_minutes)}</span>
                </div>
              )}
            </div>

            {/* Prerequisites */}
            {result.prerequisites.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Prerequisites
                  </span>
                </div>
                <ul className="text-sm space-y-1">
                  {result.prerequisites.map((prereq, i) => (
                    <li key={i} className="text-yellow-700 dark:text-yellow-400">
                      {prereq}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Subtasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <ListTree className="h-4 w-4" />
                  {result.subtasks.length} Subtasks
                </h4>
                <button
                  onClick={() => {
                    if (selectedSubtasks.size === result.subtasks.length) {
                      setSelectedSubtasks(new Set());
                    } else {
                      setSelectedSubtasks(new Set(result.subtasks.map((_, i) => i)));
                    }
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedSubtasks.size === result.subtasks.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {result.subtasks.map((subtask, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      selectedSubtasks.has(index)
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                    )}
                    onClick={() => toggleSubtask(index)}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded border flex items-center justify-center transition-colors mt-0.5",
                        selectedSubtasks.has(index)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedSubtasks.has(index) && <Check className="h-3 w-3" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Step {subtask.order}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{subtask.text}</p>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", PRIORITY_CONFIG[subtask.priority].color)}
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {PRIORITY_CONFIG[subtask.priority].label}
                        </Badge>
                        {subtask.estimated_minutes && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(subtask.estimated_minutes)}
                          </Badge>
                        )}
                      </div>

                      {subtask.dependency_notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {subtask.dependency_notes}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTips(!showTips)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span>{result.tips.length} Tips</span>
                  {showTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {showTips && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20"
                    >
                      <ul className="space-y-1">
                        {result.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-purple-700 dark:text-purple-300">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        {result ? (
          <>
            <Button variant="outline" onClick={() => setResult(null)}>
              <X className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleCreate} disabled={selectedSubtasks.size === 0}>
              <Check className="h-4 w-4 mr-2" />
              Create {selectedSubtasks.size} Subtask{selectedSubtasks.size !== 1 ? "s" : ""}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleBreakdown} disabled={breakdown.isPending}>
              {breakdown.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Breaking down...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Break Down Task
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

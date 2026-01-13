"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Check, X, ChevronDown, ChevronUp, Calendar, Flag, User, Folder, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LegacyDialog as Dialog } from "@/components/ui/dialog";
import { useSmartParse, parsedResultToTask } from "@/lib/hooks/use-smart-parse";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";
import type { SmartParseResult, TaskCategory, TaskPriority } from "@scholaros/shared";

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  p1: { label: "Urgent", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  p2: { label: "High", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  p3: { label: "Normal", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  p4: { label: "Low", color: "text-gray-500 bg-gray-500/10 border-gray-500/30" },
};

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; emoji: string }> = {
  research: { label: "Research", emoji: "🔬" },
  teaching: { label: "Teaching", emoji: "📚" },
  grants: { label: "Grants", emoji: "💰" },
  "grad-mentorship": { label: "Grad Mentoring", emoji: "🎓" },
  "undergrad-mentorship": { label: "Undergrad Mentoring", emoji: "📖" },
  admin: { label: "Admin", emoji: "📋" },
  misc: { label: "Misc", emoji: "📌" },
};

interface SmartParseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (taskData: ReturnType<typeof parsedResultToTask>) => void;
  initialText?: string;
}

export function SmartParseModal({ open, onOpenChange, onCreateTask, initialText = "" }: SmartParseModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [inputText, setInputText] = useState(initialText);
  const [result, setResult] = useState<SmartParseResult | null>(null);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set());

  const smartParse = useSmartParse();

  const handleParse = async () => {
    if (!inputText.trim() || !currentWorkspaceId) return;

    try {
      const parseResult = await smartParse.mutateAsync({
        text: inputText,
        workspaceId: currentWorkspaceId,
      });
      setResult(parseResult);
      // Select all subtasks by default
      setSelectedSubtasks(new Set(parseResult.subtasks.map((_, i) => i)));
    } catch (error) {
      console.error("Parse error:", error);
    }
  };

  const handleCreate = () => {
    if (!result || !currentWorkspaceId) return;

    const taskData = parsedResultToTask(result, currentWorkspaceId);
    onCreateTask(taskData);

    // Reset state
    setInputText("");
    setResult(null);
    setSelectedSubtasks(new Set());
    onOpenChange(false);
  };

  const handleReset = () => {
    setResult(null);
    setSelectedSubtasks(new Set());
  };

  const handleClose = () => {
    setInputText("");
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

  const priority = result?.main_task.priority || "p3";
  const category = (result?.main_task.category as TaskCategory) || "misc";

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      title="AI Task Parser"
      description="Describe your task in natural language and let AI structure it for you."
      size="lg"
      icon={<Sparkles className="h-5 w-5 text-purple-500" />}
    >
      <div className="space-y-4">
        {/* Input section */}
        {!result && (
          <div className="space-y-3">
            <Textarea
              value={inputText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
              placeholder="e.g., 'Need to review the NSF grant proposal by Friday, update the budget section, and send to co-PIs for feedback'"
              className="min-h-[120px] resize-none"
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tips:</span>
              <span>Include dates, priorities (urgent, ASAP), team member names, and project context for better results.</span>
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
            {/* Main task */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{result.main_task.title}</h3>
                  {result.main_task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{result.main_task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {Math.round(result.confidence * 100)}% confident
                  </span>
                </div>
              </div>

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className={cn("gap-1", PRIORITY_CONFIG[priority].color)}>
                  <Flag className="h-3 w-3" />
                  {PRIORITY_CONFIG[priority].label}
                </Badge>

                <Badge variant="outline" className="gap-1">
                  {CATEGORY_CONFIG[category].emoji} {CATEGORY_CONFIG[category].label}
                </Badge>

                {result.main_task.due_date && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(result.main_task.due_date).toLocaleDateString()}
                  </Badge>
                )}

                {result.main_task.assigned_to && (
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    {result.main_task.assigned_to}
                  </Badge>
                )}

                {result.main_task.project_id && (
                  <Badge variant="outline" className="gap-1">
                    <Folder className="h-3 w-3" />
                    Linked to project
                  </Badge>
                )}
              </div>
            </div>

            {/* Subtasks */}
            {result.subtasks.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <ListTree className="h-4 w-4" />
                  <span>{result.subtasks.length} Subtasks</span>
                  {showSubtasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {showSubtasks && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {result.subtasks.map((subtask, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                            selectedSubtasks.has(index)
                              ? "bg-primary/5 border-primary/20"
                              : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                          )}
                          onClick={() => toggleSubtask(index)}
                        >
                          <div
                            className={cn(
                              "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                              selectedSubtasks.has(index)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            )}
                          >
                            {selectedSubtasks.has(index) && <Check className="h-3 w-3" />}
                          </div>

                          <div className="flex-1">
                            <p className="text-sm">{subtask.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn("text-xs", PRIORITY_CONFIG[subtask.priority].color)}>
                                {PRIORITY_CONFIG[subtask.priority].label}
                              </Badge>
                              {subtask.estimated_minutes && (
                                <span className="text-xs text-muted-foreground">
                                  ~{subtask.estimated_minutes} min
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Summary */}
            {result.summary && (
              <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <p className="text-sm text-purple-700 dark:text-purple-300 italic">
                  &ldquo;{result.summary}&rdquo;
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        {result ? (
          <>
            <Button variant="outline" onClick={handleReset}>
              <X className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleCreate}>
              <Check className="h-4 w-4 mr-2" />
              Create Task{selectedSubtasks.size > 0 && ` + ${selectedSubtasks.size} Subtasks`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleParse} disabled={!inputText.trim() || smartParse.isPending}>
              {smartParse.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse with AI
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

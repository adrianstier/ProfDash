"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Flag,
  Calendar,
  User,
  Tag,
  ArrowRight,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LegacyDialog as Dialog } from "@/components/ui/dialog";
import { useTaskEnhancement, type EnhancedTask } from "@/lib/hooks/use-ai";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG = {
  p1: { label: "Urgent", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  p2: { label: "High", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  p3: { label: "Normal", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  p4: { label: "Low", color: "text-gray-500 bg-gray-500/10 border-gray-500/30" },
};

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  research: { label: "Research", emoji: "🔬" },
  teaching: { label: "Teaching", emoji: "📚" },
  grants: { label: "Grants", emoji: "💰" },
  "grad-mentorship": { label: "Grad Mentoring", emoji: "🎓" },
  "undergrad-mentorship": { label: "Undergrad Mentoring", emoji: "📖" },
  admin: { label: "Admin", emoji: "📋" },
  misc: { label: "Misc", emoji: "📌" },
};

interface TaskEnhanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  taskDescription?: string;
  currentPriority?: "p1" | "p2" | "p3" | "p4";
  currentCategory?: string;
  onApplyEnhancements?: (enhancements: {
    title: string;
    description?: string;
    priority: "p1" | "p2" | "p3" | "p4";
    category: string;
    due_date?: string;
  }) => void;
}

export function TaskEnhanceModal({
  open,
  onOpenChange,
  taskTitle,
  taskDescription,
  currentPriority,
  currentCategory,
  onApplyEnhancements,
}: TaskEnhanceModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [result, setResult] = useState<EnhancedTask | null>(null);

  const enhance = useTaskEnhancement();

  const handleEnhance = async () => {
    if (!currentWorkspaceId) return;

    try {
      const enhanceResult = await enhance.mutateAsync({
        task_title: taskTitle,
        task_description: taskDescription,
        workspace_id: currentWorkspaceId,
        current_priority: currentPriority,
        current_category: currentCategory,
      });
      setResult(enhanceResult);
    } catch (error) {
      console.error("Enhancement error:", error);
    }
  };

  const handleApply = () => {
    if (!result) return;

    onApplyEnhancements?.({
      title: result.enhanced_title,
      description: result.enhanced_description,
      priority: result.suggested_priority,
      category: result.suggested_category,
      due_date: result.suggested_due_date,
    });

    handleClose();
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      title="AI Task Enhancement"
      description="Let AI improve and enrich your task with better clarity and metadata."
      size="lg"
      icon={<Wand2 className="h-5 w-5 text-purple-500" />}
    >
      <div className="space-y-4">
        {/* Original task */}
        {!result && (
          <div className="p-4 rounded-lg border bg-muted/30">
            <h4 className="font-medium mb-2">Original Task</h4>
            <p className="text-sm">{taskTitle}</p>
            {taskDescription && (
              <p className="text-sm text-muted-foreground mt-1">{taskDescription}</p>
            )}
            <div className="flex gap-2 mt-2">
              {currentPriority && (
                <Badge variant="outline" className={cn("text-xs", PRIORITY_CONFIG[currentPriority].color)}>
                  <Flag className="h-3 w-3 mr-1" />
                  {PRIORITY_CONFIG[currentPriority].label}
                </Badge>
              )}
              {currentCategory && CATEGORY_CONFIG[currentCategory] && (
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_CONFIG[currentCategory].emoji} {CATEGORY_CONFIG[currentCategory].label}
                </Badge>
              )}
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
            {/* Before/After comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before */}
              <div className="p-4 rounded-lg border bg-muted/20">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Before</h4>
                <p className="text-sm">{taskTitle}</p>
                {taskDescription && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{taskDescription}</p>
                )}
              </div>

              {/* Arrow */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* After */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <h4 className="text-sm font-medium text-primary mb-2">After</h4>
                <p className="text-sm font-medium">{result.enhanced_title}</p>
                {result.enhanced_description && (
                  <p className="text-xs text-muted-foreground mt-1">{result.enhanced_description}</p>
                )}
              </div>
            </div>

            {/* Suggested metadata */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-3">Suggested Metadata</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <div className="mt-1">
                    <Badge className={cn(PRIORITY_CONFIG[result.suggested_priority].color)}>
                      <Flag className="h-3 w-3 mr-1" />
                      {PRIORITY_CONFIG[result.suggested_priority].label}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {CATEGORY_CONFIG[result.suggested_category]?.emoji}{" "}
                      {CATEGORY_CONFIG[result.suggested_category]?.label || result.suggested_category}
                    </Badge>
                  </div>
                </div>

                {result.suggested_due_date && (
                  <div>
                    <label className="text-xs text-muted-foreground">Due Date</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(result.suggested_due_date).toLocaleDateString()}
                      </Badge>
                    </div>
                    {result.due_date_reasoning && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.due_date_reasoning}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Extracted entities */}
            {result.extracted_entities && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-3">Extracted Information</h4>
                <div className="flex flex-wrap gap-2">
                  {result.extracted_entities.people?.map((person, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      {person}
                    </Badge>
                  ))}
                  {result.extracted_entities.keywords?.map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {keyword}
                    </Badge>
                  ))}
                  {result.extracted_entities.deadlines?.map((deadline, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {deadline}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements made */}
            {result.improvements_made.length > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                  Improvements Made
                </h4>
                <ul className="text-sm space-y-1">
                  {result.improvements_made.map((improvement, i) => (
                    <li key={i} className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Check className="h-3 w-3" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Original issues */}
            {result.original_issues && result.original_issues.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                  Issues Identified in Original
                </h4>
                <ul className="text-sm space-y-1">
                  {result.original_issues.map((issue, i) => (
                    <li key={i} className="text-yellow-700 dark:text-yellow-400">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence */}
            <div className="text-xs text-muted-foreground text-right">
              Confidence: {Math.round(result.confidence * 100)}%
            </div>
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
            <Button onClick={handleApply}>
              <Check className="h-4 w-4 mr-2" />
              Apply Enhancements
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleEnhance} disabled={enhance.isPending}>
              {enhance.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enhance Task
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Flag,
  Calendar,
  User,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useContentParsing, type ParseContentResult } from "@/lib/hooks/use-ai";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";
import type { TaskCategory } from "@scholaros/shared";

const CONTENT_TYPES = [
  { value: "meeting_notes", label: "Meeting Notes", icon: "📝" },
  { value: "email_thread", label: "Email Thread", icon: "📧" },
  { value: "document", label: "Document", icon: "📄" },
  { value: "brainstorm", label: "Brainstorm", icon: "💡" },
  { value: "agenda", label: "Agenda", icon: "📋" },
  { value: "feedback", label: "Feedback", icon: "💬" },
  { value: "requirements", label: "Requirements", icon: "📐" },
  { value: "general", label: "General", icon: "📌" },
] as const;

const EXTRACT_MODES = [
  { value: "tasks", label: "Tasks Only" },
  { value: "subtasks", label: "Subtasks Only" },
  { value: "both", label: "Tasks & Subtasks" },
] as const;

const PRIORITY_CONFIG = {
  p1: { label: "Urgent", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  p2: { label: "High", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  p3: { label: "Normal", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  p4: { label: "Low", color: "text-gray-500 bg-gray-500/10 border-gray-500/30" },
};

interface ContentImporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTaskId?: string;
  projectId?: string;
}

export function ContentImporterModal({
  open,
  onOpenChange,
  parentTaskId,
  projectId,
}: ContentImporterModalProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [result, setResult] = useState<ParseContentResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Form state
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<typeof CONTENT_TYPES[number]["value"]>("general");
  const [extractMode, setExtractMode] = useState<typeof EXTRACT_MODES[number]["value"]>("tasks");

  const parse = useContentParsing();
  const createTask = useCreateTask();

  const handleParse = async () => {
    if (!currentWorkspaceId || !content.trim()) return;

    try {
      const parseResult = await parse.mutateAsync({
        content: content.trim(),
        workspace_id: currentWorkspaceId,
        content_type: contentType,
        extract_mode: extractMode,
        parent_task_id: parentTaskId,
        project_id: projectId,
      });
      setResult(parseResult);
      setSelectedItems(new Set(parseResult.items.map((_, i) => i)));
    } catch (error) {
      console.error("Content parsing error:", error);
    }
  };

  const handleImport = async () => {
    if (!result || !currentWorkspaceId) return;

    const itemsToImport = result.items.filter((_, i) => selectedItems.has(i));
    let imported = 0;

    for (const item of itemsToImport) {
      try {
        await createTask.mutateAsync({
          title: item.text,
          priority: item.priority,
          category: (item.category || "misc") as TaskCategory,
          due: item.due_date,
          status: "todo",
          workspace_id: currentWorkspaceId,
          project_id: projectId,
        });
        imported++;
      } catch {
        // Continue with other items
      }
    }

    setImportedCount(imported);
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setResult(null);
    setContent("");
    setSelectedItems(new Set());
    setImportedCount(0);
    onOpenChange(false);
  };

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      title="Content Importer"
      description="Paste text content and let AI extract actionable tasks."
      size="lg"
      icon={<FileText className="h-5 w-5 text-purple-500" />}
    >
      <div className="space-y-4">
        {/* Form section */}
        {!result && (
          <div className="space-y-4">
            {/* Content Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Content Type</label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setContentType(type.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-sm transition-colors flex items-center gap-1",
                      contentType === type.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Extract Mode */}
            <div>
              <label className="text-sm font-medium mb-2 block">Extract</label>
              <div className="flex gap-2">
                {EXTRACT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setExtractMode(mode.value)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md border text-sm transition-colors",
                      extractMode === mode.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Input */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Paste your content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste meeting notes, email threads, or any text containing action items..."
                className="w-full h-48 rounded-md border bg-background px-3 py-2 text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length}/50000 characters
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
                <h4 className="font-medium">Analysis Summary</h4>
                <Badge variant="outline">{result.content_type_detected}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.summary}</p>

              <div className="flex items-center gap-4 mt-3 text-sm">
                <span>{result.action_item_count} action items found</span>
                {result.people_mentioned.length > 0 && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {result.people_mentioned.length} people
                  </span>
                )}
                {result.dates_mentioned.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {result.dates_mentioned.length} dates
                  </span>
                )}
              </div>
            </div>

            {/* Key themes */}
            {result.key_themes.length > 0 && (
              <div>
                <button
                  onClick={() => setShowThemes(!showThemes)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <span>Key Themes ({result.key_themes.length})</span>
                  {showThemes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {showThemes && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 flex flex-wrap gap-2"
                    >
                      {result.key_themes.map((theme, i) => (
                        <Badge key={i} variant="outline">
                          {theme}
                        </Badge>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Extracted items */}
            {result.items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Extracted Items ({result.items.length})</h4>
                  <button
                    onClick={() => {
                      if (selectedItems.size === result.items.length) {
                        setSelectedItems(new Set());
                      } else {
                        setSelectedItems(new Set(result.items.map((_, i) => i)));
                      }
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedItems.size === result.items.length ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {result.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedItems.has(index)
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                      )}
                      onClick={() => toggleItem(index)}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors mt-0.5",
                          selectedItems.has(index)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedItems.has(index) && <Check className="h-3 w-3" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", PRIORITY_CONFIG[item.priority].color)}
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            {PRIORITY_CONFIG[item.priority].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>

                        <p className="text-sm">{item.text}</p>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          {item.due_date && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {item.due_date}
                            </Badge>
                          )}
                          {item.assignee_hint && (
                            <Badge variant="outline" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {item.assignee_hint}
                            </Badge>
                          )}
                        </div>

                        {item.source_excerpt && (
                          <div className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
                            <Quote className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2 italic">{item.source_excerpt}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups */}
            {result.follow_ups_needed && result.follow_ups_needed.length > 0 && (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">
                  Follow-ups Needed
                </h4>
                <ul className="text-sm space-y-1">
                  {result.follow_ups_needed.map((followUp, i) => (
                    <li key={i} className="text-purple-700 dark:text-purple-400">
                      {followUp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Import success */}
            {importedCount > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>
                  Successfully imported {importedCount} item{importedCount !== 1 ? "s" : ""}!
                </span>
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
              Start Over
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedItems.size === 0 || createTask.isPending || importedCount > 0}
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Import {selectedItems.size} Item{selectedItems.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleParse} disabled={!content.trim() || parse.isPending}>
              {parse.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Extract Tasks
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

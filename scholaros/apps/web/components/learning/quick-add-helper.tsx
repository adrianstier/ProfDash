"use client";

/**
 * Quick Add Helper - Interactive Syntax Guide
 *
 * Research Mapping:
 * - Issue #14: No Syntax Help in Quick-Add
 *   "The hint shows syntax examples but no interactive help"
 *   "Dr. Sarah types full sentences expecting AI parsing"
 * - Persona: Dr. Sarah Chen - "May not understand priority syntax (p1, p2)"
 * - Persona: Dr. Lisa Anderson - "Will miss non-obvious UI elements"
 *
 * This component provides an interactive, contextual syntax helper
 * that appears when users focus on the quick-add input.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag,
  Hash,
  Calendar,
  User,
  Folder,
  HelpCircle,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SyntaxExample {
  syntax: string;
  meaning: string;
  icon: React.ReactNode;
  category: "priority" | "category" | "date" | "assignee" | "project";
  examples: string[];
}

const SYNTAX_EXAMPLES: SyntaxExample[] = [
  {
    syntax: "p1, p2, p3, p4",
    meaning: "Set priority level",
    icon: <Flag className="h-3.5 w-3.5" />,
    category: "priority",
    examples: [
      "Review paper p1 (urgent)",
      "Grade exams p2 (high)",
      "Update website p4 (low)",
    ],
  },
  {
    syntax: "#category",
    meaning: "Categorize your task",
    icon: <Hash className="h-3.5 w-3.5" />,
    category: "category",
    examples: [
      "#research - research tasks",
      "#teaching - course work",
      "#grants - funding related",
      "#admin - administrative",
    ],
  },
  {
    syntax: "today, tomorrow, friday, next week",
    meaning: "Set due date naturally",
    icon: <Calendar className="h-3.5 w-3.5" />,
    category: "date",
    examples: [
      "Submit report tomorrow",
      "Review paper friday",
      "Grant deadline next month",
    ],
  },
  {
    syntax: "@name",
    meaning: "Assign to team member",
    icon: <User className="h-3.5 w-3.5" />,
    category: "assignee",
    examples: [
      "@sarah review data",
      "@team meeting prep",
    ],
  },
  {
    syntax: "+project",
    meaning: "Link to a project",
    icon: <Folder className="h-3.5 w-3.5" />,
    category: "project",
    examples: [
      "+nsf-grant submit report",
      "+thesis chapter review",
    ],
  },
];

interface QuickAddHelperProps {
  isVisible: boolean;
  onClose: () => void;
  inputValue?: string;
  onInsertSyntax?: (syntax: string) => void;
}

export function QuickAddHelper({
  isVisible,
  onClose,
  inputValue = "",
  onInsertSyntax,
}: QuickAddHelperProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showFullGuide, setShowFullGuide] = useState(false);

  // Analyze input to provide contextual suggestions
  const hasPriority = /p[1-4]/i.test(inputValue);
  const hasCategory = /#\w+/.test(inputValue);
  const hasDate = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+\w+)\b/i.test(inputValue);
  const hasAssignee = /@\w+/.test(inputValue);
  const hasProject = /\+\w+/.test(inputValue);

  const getMissingSuggestions = () => {
    const missing: string[] = [];
    if (!hasPriority) missing.push("priority (p1-p4)");
    if (!hasCategory) missing.push("category (#research)");
    if (!hasDate) missing.push("due date (tomorrow)");
    return missing;
  };

  const missingSuggestions = getMissingSuggestions();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 z-50"
        >
          <div className="rounded-xl border bg-card shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <span className="text-sm font-medium">Quick Add Syntax</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contextual suggestions based on input */}
            {inputValue.length > 0 && missingSuggestions.length > 0 && (
              <div className="px-4 py-3 border-b bg-amber-500/5">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      You could add:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {missingSuggestions.join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick reference */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                {SYNTAX_EXAMPLES.map((example) => {
                  const isUsed =
                    (example.category === "priority" && hasPriority) ||
                    (example.category === "category" && hasCategory) ||
                    (example.category === "date" && hasDate) ||
                    (example.category === "assignee" && hasAssignee) ||
                    (example.category === "project" && hasProject);

                  return (
                    <button
                      key={example.category}
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === example.category
                            ? null
                            : example.category
                        )
                      }
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-left transition-colors",
                        expandedCategory === example.category
                          ? "bg-primary/5 border-primary/20"
                          : "hover:bg-muted/50",
                        isUsed && "opacity-50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                          isUsed ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {example.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{example.syntax}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {example.meaning}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Expanded examples */}
              <AnimatePresence>
                {expandedCategory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-lg bg-muted/30 border">
                      <p className="text-xs font-medium mb-2">Examples:</p>
                      <div className="space-y-1.5">
                        {SYNTAX_EXAMPLES.find((e) => e.category === expandedCategory)?.examples.map(
                          (ex, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                // Extract the syntax part to insert
                                const match = ex.match(/([p@#]\w+|tomorrow|today|friday|next\s+\w+)/i);
                                if (match && onInsertSyntax) {
                                  onInsertSyntax(match[0]);
                                }
                              }}
                              className="block w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted/50"
                            >
                              <code className="font-mono">{ex}</code>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Full example */}
            <div className="px-4 py-3 border-t bg-muted/20">
              <button
                onClick={() => setShowFullGuide(!showFullGuide)}
                className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                  See full example
                </span>
                {showFullGuide ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              <AnimatePresence>
                {showFullGuide && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs font-mono mb-2">
                        Review NSF proposal <span className="text-red-500">p1</span>{" "}
                        <span className="text-purple-500">#grants</span>{" "}
                        <span className="text-blue-500">friday</span>{" "}
                        <span className="text-green-500">@sarah</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">
                          <Flag className="h-2.5 w-2.5" /> Urgent priority
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-500">
                          <Hash className="h-2.5 w-2.5" /> Grants category
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-500">
                          <Calendar className="h-2.5 w-2.5" /> Due Friday
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-500">
                          <User className="h-2.5 w-2.5" /> Assigned to Sarah
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact inline help button that triggers the helper
interface QuickAddHelpButtonProps {
  onClick: () => void;
  className?: string;
}

export function QuickAddHelpButton({ onClick, className }: QuickAddHelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
        className
      )}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      <span>Syntax help</span>
    </button>
  );
}

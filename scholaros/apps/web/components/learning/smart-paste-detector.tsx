"use client";

/**
 * Smart Paste Detector - Contextual AI Content Import
 *
 * Research Mapping:
 * - Issue #14: No Syntax Help in Quick-Add
 *   "Dr. Sarah types full sentences ('Submit NSF report by Friday') expecting AI parsing"
 *   "Suggestion: Add expandable syntax reference or AI-assisted parsing with confirmation"
 * - Persona: Dr. Sarah Chen (New PI) - "Will try typing full sentences in quick-add"
 *
 * This component detects when users paste multi-line content or lengthy text
 * and offers to use the AI Content Importer instead of the basic quick-add.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartPasteDetectorProps {
  onOpenContentImporter: () => void;
  children: React.ReactNode;
  className?: string;
}

// Thresholds for detecting "content that would benefit from AI parsing"
const MULTI_LINE_THRESHOLD = 2;
const LONG_TEXT_THRESHOLD = 200;
const MEETING_KEYWORDS = [
  "meeting",
  "action item",
  "todo",
  "follow up",
  "deadline",
  "assigned to",
  "due date",
  "next steps",
  "discussion",
  "decided",
  "agreed",
  "@",
];

export function SmartPasteDetector({
  onOpenContentImporter,
  children,
  className,
}: SmartPasteDetectorProps) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [pastedContent, setPastedContent] = useState("");
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  const analyzeContent = useCallback((text: string): boolean => {
    // Check for multi-line content
    const lineCount = text.split("\n").filter((line) => line.trim()).length;
    if (lineCount >= MULTI_LINE_THRESHOLD) return true;

    // Check for long text
    if (text.length >= LONG_TEXT_THRESHOLD) return true;

    // Check for meeting/task keywords
    const lowerText = text.toLowerCase();
    const hasKeywords = MEETING_KEYWORDS.some((keyword) =>
      lowerText.includes(keyword)
    );
    if (hasKeywords && text.length > 50) return true;

    return false;
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (dismissedThisSession) return;

      const text = event.clipboardData?.getData("text") || "";
      if (text && analyzeContent(text)) {
        setPastedContent(text);
        setShowSuggestion(true);
      }
    },
    [analyzeContent, dismissedThisSession]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleUseAI = () => {
    setShowSuggestion(false);
    onOpenContentImporter();
  };

  const handleDismiss = () => {
    setShowSuggestion(false);
    setDismissedThisSession(true);
  };

  const handleDismissOnce = () => {
    setShowSuggestion(false);
  };

  return (
    <div className={cn("relative", className)}>
      {children}

      <AnimatePresence>
        {showSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 w-80"
          >
            <div className="rounded-2xl border border-purple-500/20 bg-card p-4 shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-semibold">AI Suggestion</span>
                </div>
                <button
                  onClick={handleDismissOnce}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content preview */}
              <div className="mb-3 p-2 rounded-lg bg-muted/50 max-h-20 overflow-hidden">
                <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
                  {pastedContent.slice(0, 150)}
                  {pastedContent.length > 150 && "..."}
                </p>
              </div>

              {/* Message */}
              <p className="text-sm text-muted-foreground mb-4">
                This looks like content with multiple action items. Use AI to extract tasks automatically?
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleUseAI}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Extract with AI
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Don&apos;t ask again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook version for more flexible integration
interface UsePasteDetectorOptions {
  onPasteDetected: (content: string) => void;
  enabled?: boolean;
}

export function useSmartPasteDetector({
  onPasteDetected,
  enabled = true,
}: UsePasteDetectorOptions) {
  const [pastedContent, setPastedContent] = useState<string | null>(null);

  const analyzeContent = useCallback((text: string): boolean => {
    const lineCount = text.split("\n").filter((line) => line.trim()).length;
    if (lineCount >= MULTI_LINE_THRESHOLD) return true;
    if (text.length >= LONG_TEXT_THRESHOLD) return true;

    const lowerText = text.toLowerCase();
    const hasKeywords = MEETING_KEYWORDS.some((keyword) =>
      lowerText.includes(keyword)
    );
    if (hasKeywords && text.length > 50) return true;

    return false;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text") || "";
      if (text && analyzeContent(text)) {
        setPastedContent(text);
        onPasteDetected(text);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [enabled, analyzeContent, onPasteDetected]);

  const clearPastedContent = useCallback(() => {
    setPastedContent(null);
  }, []);

  return { pastedContent, clearPastedContent };
}

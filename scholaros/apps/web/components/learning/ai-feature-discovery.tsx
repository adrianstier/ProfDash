"use client";

/**
 * AI Feature Discovery - Contextual Feature Suggestions
 *
 * Research Mapping:
 * - PRD Success Metric: "≥30% of users accept ≥1 AI suggestion/week"
 * - Issue #13: Empty States Lack Guidance
 * - Issue #14: No Syntax Help in Quick-Add - "AI-assisted parsing with confirmation"
 *
 * This component analyzes user context and suggests relevant AI features
 * at the right moment, connecting features to specific problems.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileText,
  Mic,
  Wand2,
  ListTree,
  Mail,
  FileImage,
  X,
  ArrowRight,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Feature suggestions based on user context
interface FeatureSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  context: string; // When to show this suggestion
  problemSolved: string; // The problem this feature solves
  howToUse: string;
  color: "purple" | "blue" | "green" | "orange";
}

const FEATURE_SUGGESTIONS: FeatureSuggestion[] = [
  {
    id: "content-importer",
    title: "AI Content Importer",
    description: "Extract tasks from meeting notes, emails, or documents automatically",
    icon: <FileText className="h-5 w-5" />,
    context: "You have text to import",
    problemSolved: "No more manually copying action items from meetings",
    howToUse: "Paste your text and AI will identify all tasks",
    color: "purple",
  },
  {
    id: "voice-input",
    title: "Voice to Task",
    description: "Speak your tasks naturally and they'll be transcribed and parsed",
    icon: <Mic className="h-5 w-5" />,
    context: "Quick capture on the go",
    problemSolved: "Capture ideas without typing",
    howToUse: "Click the microphone icon in quick-add",
    color: "blue",
  },
  {
    id: "task-breakdown",
    title: "AI Task Breakdown",
    description: "Break complex tasks into actionable subtasks with time estimates",
    icon: <ListTree className="h-5 w-5" />,
    context: "Large or complex tasks",
    problemSolved: "Overwhelmed by big tasks? Break them down",
    howToUse: "Right-click a task and select 'Break down with AI'",
    color: "green",
  },
  {
    id: "task-enhance",
    title: "AI Task Enhancement",
    description: "Improve task descriptions with clarity and actionable language",
    icon: <Wand2 className="h-5 w-5" />,
    context: "Vague or unclear tasks",
    problemSolved: "Turn fuzzy ideas into clear action items",
    howToUse: "Right-click a task and select 'Enhance with AI'",
    color: "orange",
  },
  {
    id: "email-generator",
    title: "Email Generator",
    description: "Generate professional emails for task follow-ups and updates",
    icon: <Mail className="h-5 w-5" />,
    context: "Communication needed",
    problemSolved: "Write professional emails in seconds",
    howToUse: "Right-click a task and select 'Generate email'",
    color: "purple",
  },
  {
    id: "file-parser",
    title: "Document Scanner",
    description: "Extract tasks from PDFs and images using AI vision",
    icon: <FileImage className="h-5 w-5" />,
    context: "Documents with tasks",
    problemSolved: "Get tasks out of scanned documents",
    howToUse: "Upload a PDF or image to extract tasks",
    color: "blue",
  },
];

// Floating feature discovery widget
interface AIFeatureDiscoveryProps {
  onFeatureSelect: (featureId: string) => void;
  className?: string;
}

export function AIFeatureDiscovery({ onFeatureSelect, className }: AIFeatureDiscoveryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureSuggestion | null>(null);
  const [dismissedFeatures, setDismissedFeatures] = useState<Set<string>>(new Set());

  // Load dismissed features from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("scholaros_dismissed_features");
    if (stored) {
      try {
        setDismissedFeatures(new Set(JSON.parse(stored)));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleSelectFeature = (feature: FeatureSuggestion) => {
    setSelectedFeature(feature);
  };

  const handleUseFeature = () => {
    if (selectedFeature) {
      onFeatureSelect(selectedFeature.id);
      setSelectedFeature(null);
      setIsExpanded(false);
    }
  };

  const visibleFeatures = FEATURE_SUGGESTIONS.filter(
    (f) => !dismissedFeatures.has(f.id)
  );

  return (
    <div className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200",
          isExpanded
            ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"
            : "hover:bg-muted"
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">AI Features</span>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-80 rounded-2xl border bg-card shadow-xl z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-semibold">AI-Powered Features</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Supercharge your productivity with AI
              </p>
            </div>

            {/* Feature list */}
            <div className="p-2 max-h-80 overflow-y-auto">
              {selectedFeature ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4"
                >
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
                  >
                    <ChevronRight className="h-3 w-3 rotate-180" />
                    Back to features
                  </button>

                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl mb-4",
                      selectedFeature.color === "purple" && "bg-purple-500/10 text-purple-500",
                      selectedFeature.color === "blue" && "bg-blue-500/10 text-blue-500",
                      selectedFeature.color === "green" && "bg-green-500/10 text-green-500",
                      selectedFeature.color === "orange" && "bg-orange-500/10 text-orange-500"
                    )}
                  >
                    {selectedFeature.icon}
                  </div>

                  <h3 className="text-lg font-semibold mb-2">{selectedFeature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedFeature.description}
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium mb-1">Problem it solves:</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFeature.problemSolved}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium mb-1">How to use:</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFeature.howToUse}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleUseFeature}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  >
                    Try {selectedFeature.title}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-1">
                  {visibleFeatures.map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => handleSelectFeature(feature)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                          feature.color === "purple" && "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20",
                          feature.color === "blue" && "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20",
                          feature.color === "green" && "bg-green-500/10 text-green-500 group-hover:bg-green-500/20",
                          feature.color === "orange" && "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20"
                        )}
                      >
                        {feature.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{feature.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {feature.context}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!selectedFeature && (
              <div className="px-4 py-3 border-t bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  <span>Features appear based on what you&apos;re doing</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Contextual suggestion that appears inline
interface ContextualSuggestionProps {
  featureId: string;
  trigger: string;
  onUse: () => void;
  onDismiss: () => void;
  className?: string;
}

export function ContextualSuggestion({
  featureId,
  trigger,
  onUse,
  onDismiss,
  className,
}: ContextualSuggestionProps) {
  const feature = FEATURE_SUGGESTIONS.find((f) => f.id === featureId);

  if (!feature) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10",
        className
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          feature.color === "purple" && "bg-purple-500/10 text-purple-500",
          feature.color === "blue" && "bg-blue-500/10 text-blue-500",
          feature.color === "green" && "bg-green-500/10 text-green-500",
          feature.color === "orange" && "bg-orange-500/10 text-orange-500"
        )}
      >
        {feature.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{feature.title}</p>
        <p className="text-xs text-muted-foreground">{trigger}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUse}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Use
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

// Export suggestions for reference
export { FEATURE_SUGGESTIONS };

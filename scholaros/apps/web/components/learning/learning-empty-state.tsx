"use client";

/**
 * Learning Empty State - Enhanced Empty States with AI Feature Guidance
 *
 * Research Mapping:
 * - Issue #13: Empty States Lack Guidance
 *   "Empty states show 'No tasks yet' with a single CTA. They should include:
 *    - Quick tutorial links
 *    - Example content or templates
 *    - Keyboard shortcut hints"
 * - Persona: Dr. Sarah Chen - "May get confused by empty states"
 * - Persona: Dr. Lisa Anderson - "Needs extensive onboarding"
 *
 * This component provides enhanced empty states that guide users
 * to discover AI features and learn the platform.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Plus,
  FolderOpen,
  Sparkles,
  FileText,
  Mic,
  Lightbulb,
  ArrowRight,
  Keyboard,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIFeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  color: string;
}

const AI_FEATURES_FOR_TASKS: AIFeatureCard[] = [
  {
    id: "content-import",
    title: "Import from Text",
    description: "Paste meeting notes or emails, AI extracts tasks automatically",
    icon: <FileText className="h-5 w-5" />,
    action: "Open Content Importer",
    color: "purple",
  },
  {
    id: "voice-input",
    title: "Voice Input",
    description: "Speak your tasks naturally and they'll be transcribed",
    icon: <Mic className="h-5 w-5" />,
    action: "Use Voice Input",
    color: "blue",
  },
  {
    id: "quick-add",
    title: "Quick Add",
    description: "Type 'p1 Review paper #research friday' for smart parsing",
    icon: <Keyboard className="h-5 w-5" />,
    action: "Press Q to focus",
    color: "green",
  },
];

const AI_FEATURES_FOR_PROJECTS: AIFeatureCard[] = [
  {
    id: "ai-summary",
    title: "AI Project Summaries",
    description: "Get AI-generated progress summaries for your projects",
    icon: <Sparkles className="h-5 w-5" />,
    action: "Create a project to see",
    color: "purple",
  },
  {
    id: "task-breakdown",
    title: "Task Breakdown",
    description: "Break complex project tasks into manageable subtasks with AI",
    icon: <Wand2 className="h-5 w-5" />,
    action: "Add tasks to use",
    color: "blue",
  },
];

interface LearningEmptyStateProps {
  type: "tasks" | "projects" | "grants" | "publications";
  onPrimaryAction: () => void;
  onFeatureAction?: (featureId: string) => void;
  className?: string;
}

export function LearningEmptyState({
  type,
  onPrimaryAction,
  onFeatureAction,
  className,
}: LearningEmptyStateProps) {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const config = {
    tasks: {
      icon: CheckSquare,
      title: "No tasks yet",
      description: "Start organizing your academic work. You have multiple ways to add tasks:",
      primaryAction: "Add First Task",
      features: AI_FEATURES_FOR_TASKS,
      tips: [
        { text: "Press Q anywhere for quick add", icon: <Keyboard className="h-3 w-3" /> },
        { text: "Use p1-p4 for priority levels", icon: <Lightbulb className="h-3 w-3" /> },
        { text: "Try #research #teaching for categories", icon: <Lightbulb className="h-3 w-3" /> },
      ],
    },
    projects: {
      icon: FolderOpen,
      title: "No projects yet",
      description: "Track manuscripts, grants, and research projects. Each project can have milestones and linked tasks.",
      primaryAction: "Create First Project",
      features: AI_FEATURES_FOR_PROJECTS,
      tips: [
        { text: "Projects can track manuscripts or grants", icon: <Lightbulb className="h-3 w-3" /> },
        { text: "Link tasks to projects with +project-name", icon: <Lightbulb className="h-3 w-3" /> },
      ],
    },
    grants: {
      icon: Sparkles,
      title: "Start discovering grants",
      description: "Find relevant funding opportunities matched to your research interests using AI.",
      primaryAction: "Search Grants",
      features: [],
      tips: [
        { text: "AI scores grants based on your profile", icon: <Lightbulb className="h-3 w-3" /> },
        { text: "Save searches for notifications", icon: <Lightbulb className="h-3 w-3" /> },
      ],
    },
    publications: {
      icon: FileText,
      title: "No publications tracked",
      description: "Import and track your publications through their lifecycle.",
      primaryAction: "Import by DOI",
      features: [],
      tips: [
        { text: "Paste a DOI to auto-import paper details", icon: <Lightbulb className="h-3 w-3" /> },
        { text: "Track revision status and deadlines", icon: <Lightbulb className="h-3 w-3" /> },
      ],
    },
  };

  const { icon: Icon, title, description, primaryAction, features, tips } = config[type];

  return (
    <div className={cn("flex flex-col items-center py-12 px-6", className)}>
      {/* Main icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 mb-6"
      >
        <Icon className="h-8 w-8 text-primary" />
      </motion.div>

      {/* Title and description */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </motion.div>

      {/* AI Feature cards */}
      {features.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">AI-Powered Ways to Get Started</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {features.map((feature, index) => (
              <motion.button
                key={feature.id}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
                onClick={() => onFeatureAction?.(feature.id)}
                className={cn(
                  "relative p-4 rounded-xl border text-left transition-all duration-200",
                  hoveredFeature === feature.id
                    ? "bg-primary/5 border-primary/20 shadow-md"
                    : "hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg mb-3 transition-colors",
                    feature.color === "purple" && "bg-purple-500/10 text-purple-500",
                    feature.color === "blue" && "bg-blue-500/10 text-blue-500",
                    feature.color === "green" && "bg-green-500/10 text-green-500"
                  )}
                >
                  {feature.icon}
                </div>
                <h4 className="text-sm font-medium mb-1">{feature.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{feature.description}</p>
                <span className="text-xs font-medium text-primary flex items-center gap-1">
                  {feature.action}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Primary action */}
      <motion.button
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onPrimaryAction}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors mb-8"
      >
        <Plus className="h-4 w-4" />
        {primaryAction}
      </motion.button>

      {/* Tips */}
      {tips.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {tips.map((tip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground"
            >
              {tip.icon}
              {tip.text}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Compact version for inline use
interface CompactLearningPromptProps {
  message: string;
  onAction: () => void;
  className?: string;
}

export function CompactLearningPrompt({
  message,
  onAction,
  className,
}: CompactLearningPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10",
        className
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
        <Sparkles className="h-4 w-4 text-purple-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <button
        onClick={onAction}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-500/10 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
      >
        Try it
      </button>
    </motion.div>
  );
}

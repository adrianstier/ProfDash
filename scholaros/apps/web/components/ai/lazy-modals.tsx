"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Generic modal loading state
function ModalSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Lazy-loaded AI modals for better initial page load performance.
 * These modals are only loaded when they are first opened.
 */

// Task Breakdown Modal - Heavy AI component
export const LazyTaskBreakdownModal = dynamic(
  () => import("./task-breakdown-modal").then((mod) => ({ default: mod.TaskBreakdownModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Task Enhance Modal - Heavy AI component
export const LazyTaskEnhanceModal = dynamic(
  () => import("./task-enhance-modal").then((mod) => ({ default: mod.TaskEnhanceModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Email Generator Modal - Heavy AI component
export const LazyEmailGeneratorModal = dynamic(
  () => import("./email-generator-modal").then((mod) => ({ default: mod.EmailGeneratorModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Content Importer Modal - Heavy AI component
export const LazyContentImporterModal = dynamic(
  () => import("./content-importer-modal").then((mod) => ({ default: mod.ContentImporterModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// File Parser Modal - Heavy AI component with file handling
export const LazyFileParserModal = dynamic(
  () => import("./file-parser-modal").then((mod) => ({ default: mod.FileParserModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Extract Tasks Modal - Heavy AI component
export const LazyExtractTasksModal = dynamic(
  () => import("./extract-tasks-modal").then((mod) => ({ default: mod.ExtractTasksModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Extract Tasks from Document Modal - Heavy AI component
export const LazyExtractTasksFromDocumentModal = dynamic(
  () => import("./extract-tasks-from-document").then((mod) => ({ default: mod.ExtractTasksFromDocumentModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Smart Parse Modal - Heavy AI component
export const LazySmartParseModal = dynamic(
  () => import("./SmartParseModal").then((mod) => ({ default: mod.SmartParseModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Voice Recorder - Heavy component with audio APIs
export const LazyVoiceRecorder = dynamic(
  () => import("./voice-recorder").then((mod) => ({ default: mod.VoiceRecorder })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

// Agent Chat - Heavy AI chat component
export const LazyAgentChat = dynamic(
  () => import("./agent-chat").then((mod) => ({ default: mod.AgentChat })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false,
  }
);

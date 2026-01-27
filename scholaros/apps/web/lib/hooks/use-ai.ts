"use client";

import { useMutation } from "@tanstack/react-query";

// Types for AI API responses
export interface ExtractedTask {
  title: string;
  description?: string | null;
  priority: "p1" | "p2" | "p3" | "p4";
  category:
    | "research"
    | "teaching"
    | "grants"
    | "grad-mentorship"
    | "undergrad-mentorship"
    | "admin"
    | "misc";
  due_date?: string | null;
  confidence: number;
}

// Task Breakdown Types
export interface TaskBreakdownSubtask {
  text: string;
  order: number;
  estimated_minutes?: number;
  dependency_notes?: string;
  priority: "p1" | "p2" | "p3" | "p4";
}

export interface TaskBreakdownResult {
  original_task: string;
  subtasks: TaskBreakdownSubtask[];
  total_estimated_minutes?: number;
  approach_summary: string;
  prerequisites: string[];
  complexity_rating: "low" | "medium" | "high";
  tips: string[];
}

// Task Enhancement Types
export interface EnhancedTask {
  enhanced_title: string;
  enhanced_description?: string;
  suggested_priority: "p1" | "p2" | "p3" | "p4";
  suggested_category: "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc";
  suggested_due_date?: string;
  due_date_reasoning?: string;
  extracted_entities?: {
    people?: string[];
    projects?: string[];
    deadlines?: string[];
    keywords?: string[];
  };
  improvements_made: string[];
  confidence: number;
  original_issues?: string[];
}

// Audio Transcription Types
export interface TranscribedTask {
  title: string;
  description?: string;
  priority: "p1" | "p2" | "p3" | "p4";
  category?: string;
  due_date?: string;
}

export interface TranscriptionResult {
  transcription: string;
  tasks?: TranscribedTask[];
  subtasks?: {
    text: string;
    priority: "p1" | "p2" | "p3" | "p4";
    estimated_minutes?: number;
  }[];
  summary?: string;
  duration_seconds?: number;
}

// Email Generation Types
export interface GeneratedEmail {
  subject: string;
  body: string;
  tone_applied: string;
  key_points: string[];
  suggested_follow_up?: string;
  warnings?: string[];
}

// Content Parsing Types
export interface ParsedContentItem {
  text: string;
  type: "task" | "subtask";
  priority: "p1" | "p2" | "p3" | "p4";
  category?: string;
  due_date?: string;
  assignee_hint?: string;
  estimated_minutes?: number;
  source_excerpt?: string;
  confidence: number;
}

export interface ParseContentResult {
  items: ParsedContentItem[];
  summary: string;
  content_type_detected: string;
  key_themes: string[];
  people_mentioned: string[];
  dates_mentioned: string[];
  action_item_count: number;
  follow_ups_needed?: string[];
}

// File Parsing Types
export interface ParsedFileTask {
  title: string;
  description?: string;
  priority: "p1" | "p2" | "p3" | "p4";
  category?: string;
  due_date?: string;
  confidence: number;
}

export interface ParseFileResult {
  extracted_text: string;
  tasks: ParsedFileTask[];
  document_type: string;
  summary: string;
  key_dates: string[];
  key_people: string[];
  page_count?: number;
}

export interface ExtractTasksResponse {
  tasks: ExtractedTask[];
  source_summary: string;
}

export interface ProjectSummaryResponse {
  status_summary: string;
  accomplishments: string[];
  blockers: string[];
  next_actions: string[];
  health_score: number;
}

export interface FitScoreResponse {
  score: number;
  reasons: string[];
  gaps: string[];
  suggestions: string[];
  summary: string;
}

// API functions
async function extractTasks(params: {
  text: string;
  context?: string;
}): Promise<ExtractTasksResponse> {
  const response = await fetch("/api/ai/extract-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to extract tasks");
  }

  return response.json();
}

async function generateProjectSummary(params: {
  project: {
    title: string;
    type: "manuscript" | "grant" | "general" | "research";
    status: string;
    stage?: string;
    summary?: string;
  };
  tasks?: {
    title: string;
    status: "todo" | "progress" | "done";
    priority: "p1" | "p2" | "p3" | "p4";
    due_date?: string;
  }[];
  milestones?: {
    title: string;
    due_date?: string;
    completed?: boolean;
  }[];
  recent_notes?: {
    content: string;
    created_at: string;
  }[];
}): Promise<ProjectSummaryResponse> {
  const response = await fetch("/api/ai/project-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to generate summary");
  }

  return response.json();
}

async function scoreGrantFit(params: {
  opportunity: {
    title: string;
    agency?: string;
    description?: string;
    eligibility?: string;
    funding_amount?: string;
    deadline?: string;
  };
  profile: {
    keywords?: string[];
    recent_projects?: string[];
    funding_history?: string[];
    institution_type?: string;
  };
}): Promise<FitScoreResponse> {
  const response = await fetch("/api/ai/fit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to score grant fit");
  }

  return response.json();
}

// Hooks

export function useExtractTasks() {
  return useMutation({
    mutationFn: extractTasks,
  });
}

export function useProjectSummary() {
  return useMutation({
    mutationFn: generateProjectSummary,
  });
}

export function useGrantFitScore() {
  return useMutation({
    mutationFn: scoreGrantFit,
  });
}

// ==================== NEW AI FEATURES ====================

// Task Breakdown API
async function breakdownTask(params: {
  task_title: string;
  task_description?: string;
  workspace_id: string;
  breakdown_style?: "sequential" | "parallel" | "mixed";
  max_subtasks?: number;
  include_estimates?: boolean;
}): Promise<TaskBreakdownResult> {
  const response = await fetch("/api/ai/breakdown-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to breakdown task");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to breakdown task");
  }
  return data.result;
}

export function useTaskBreakdown() {
  return useMutation({
    mutationFn: breakdownTask,
  });
}

// Task Enhancement API
async function enhanceTask(params: {
  task_title: string;
  task_description?: string;
  workspace_id: string;
  current_priority?: "p1" | "p2" | "p3" | "p4";
  current_category?: string;
  enhance_options?: {
    improve_clarity?: boolean;
    suggest_priority?: boolean;
    suggest_category?: boolean;
    suggest_due_date?: boolean;
    extract_metadata?: boolean;
    add_context?: boolean;
  };
}): Promise<EnhancedTask> {
  const response = await fetch("/api/ai/enhance-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to enhance task");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to enhance task");
  }
  return data.result;
}

export function useTaskEnhancement() {
  return useMutation({
    mutationFn: enhanceTask,
  });
}

// Audio Transcription API
async function transcribeAudio(params: {
  audio: File;
  workspace_id: string;
  mode?: "simple" | "extract_tasks" | "extract_subtasks";
  language?: string;
}): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("audio", params.audio);
  formData.append("workspace_id", params.workspace_id);
  formData.append("mode", params.mode || "simple");
  formData.append("language", params.language || "en");

  const response = await fetch("/api/ai/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to transcribe audio");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to transcribe audio");
  }
  return data.result;
}

export function useAudioTranscription() {
  return useMutation({
    mutationFn: transcribeAudio,
  });
}

// Email Generation API
async function generateEmail(params: {
  workspace_id: string;
  email_type:
    | "project_update"
    | "meeting_request"
    | "deadline_reminder"
    | "collaboration_invite"
    | "progress_report"
    | "feedback_request"
    | "thank_you"
    | "follow_up"
    | "custom";
  tone?: "formal" | "friendly" | "brief";
  recipient_name?: string;
  recipient_role?: string;
  subject_context: string;
  additional_context?: string;
  include_task_summary?: boolean;
  task_ids?: string[];
  project_id?: string;
}): Promise<GeneratedEmail> {
  const response = await fetch("/api/ai/generate-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to generate email");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to generate email");
  }
  return data.result;
}

export function useEmailGeneration() {
  return useMutation({
    mutationFn: generateEmail,
  });
}

// Content Parsing API
async function parseContent(params: {
  content: string;
  workspace_id: string;
  content_type?:
    | "meeting_notes"
    | "email_thread"
    | "document"
    | "brainstorm"
    | "agenda"
    | "feedback"
    | "requirements"
    | "general";
  extract_mode?: "tasks" | "subtasks" | "both";
  parent_task_id?: string;
  project_id?: string;
}): Promise<ParseContentResult> {
  const response = await fetch("/api/ai/parse-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to parse content");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to parse content");
  }
  return data.result;
}

export function useContentParsing() {
  return useMutation({
    mutationFn: parseContent,
  });
}

// File Parsing API (PDF/Images)
async function parseFile(params: {
  file: File;
  workspace_id: string;
}): Promise<ParseFileResult> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("workspace_id", params.workspace_id);

  const response = await fetch("/api/ai/parse-file", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to parse file");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to parse file");
  }
  return data.result;
}

export function useFileParsing() {
  return useMutation({
    mutationFn: parseFile,
  });
}

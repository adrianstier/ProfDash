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
    type: "manuscript" | "grant" | "general";
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

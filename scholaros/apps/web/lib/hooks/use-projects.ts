"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectType,
  ProjectStatus,
} from "@scholaros/shared";

// Types for API responses (with string dates from JSON)
export interface ProjectFromAPI {
  id: string;
  workspace_id: string;
  type: ProjectType;
  title: string;
  summary?: string | null;
  status: ProjectStatus;
  stage?: string | null;
  due_date?: string | null;
  owner_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  task_count?: number;
  milestone_count?: number;
  completed_task_count?: number;
}

export interface ProjectMilestoneFromAPI {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectNoteFromAPI {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectFilters {
  workspace_id: string;
  type?: ProjectType;
  status?: ProjectStatus;
}

// Fetch projects with optional filters
async function fetchProjects(filters: ProjectFilters): Promise<ProjectFromAPI[]> {
  const params = new URLSearchParams();
  params.set("workspace_id", filters.workspace_id);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);

  const response = await fetch(`/api/projects?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch projects");
  }

  return response.json();
}

// Fetch a single project with details
async function fetchProject(id: string): Promise<ProjectFromAPI & {
  milestones: ProjectMilestoneFromAPI[];
  notes: ProjectNoteFromAPI[];
  tasks: unknown[];
}> {
  const response = await fetch(`/api/projects/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch project");
  }

  return response.json();
}

// Create a new project
async function createProject(
  project: Omit<ProjectFromAPI, "id" | "created_at" | "updated_at" | "task_count" | "milestone_count">
): Promise<ProjectFromAPI> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create project");
  }

  return response.json();
}

// Update a project
async function updateProject({
  id,
  ...updates
}: Partial<ProjectFromAPI> & { id: string }): Promise<ProjectFromAPI> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update project");
  }

  return response.json();
}

// Delete a project
async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete project");
  }
}

// Hook: Fetch projects
export function useProjects(filters: ProjectFilters) {
  return useQuery({
    queryKey: ["projects", filters],
    queryFn: () => fetchProjects(filters),
    enabled: !!filters.workspace_id,
    // Cache settings for optimal performance
    staleTime: 60 * 1000, // Data is fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

// Hook: Fetch single project
export function useProject(id: string | null) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    // Cache settings for project details
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Hook: Create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// Hook: Update project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
}

// Hook: Delete project
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// =============================================================================
// MILESTONES
// =============================================================================

async function fetchMilestones(projectId: string): Promise<ProjectMilestoneFromAPI[]> {
  const response = await fetch(`/api/projects/${projectId}/milestones`);

  if (!response.ok) {
    throw new Error("Failed to fetch milestones");
  }

  return response.json();
}

async function createMilestone({
  projectId,
  ...data
}: {
  projectId: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  sort_order?: number;
}): Promise<ProjectMilestoneFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create milestone");
  }

  return response.json();
}

async function updateMilestone({
  projectId,
  milestoneId,
  ...updates
}: {
  projectId: string;
  milestoneId: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  sort_order?: number;
}): Promise<ProjectMilestoneFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update milestone");
  }

  return response.json();
}

async function deleteMilestone({
  projectId,
  milestoneId,
}: {
  projectId: string;
  milestoneId: string;
}): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete milestone");
  }
}

// Hook: Fetch milestones
export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () => fetchMilestones(projectId!),
    enabled: !!projectId,
    // Cache settings for milestones
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Hook: Create milestone
export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMilestone,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["milestones", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Update milestone
export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMilestone,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["milestones", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Delete milestone
export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["milestones", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Toggle milestone completion
export function useToggleMilestoneComplete() {
  const updateMilestone = useUpdateMilestone();

  return {
    ...updateMilestone,
    mutate: ({
      projectId,
      milestone,
    }: {
      projectId: string;
      milestone: ProjectMilestoneFromAPI;
    }) => {
      const completed_at = milestone.completed_at
        ? null
        : new Date().toISOString();
      updateMilestone.mutate({
        projectId,
        milestoneId: milestone.id,
        completed_at,
      });
    },
  };
}

// =============================================================================
// NOTES
// =============================================================================

async function fetchNotes(projectId: string): Promise<ProjectNoteFromAPI[]> {
  const response = await fetch(`/api/projects/${projectId}/notes`);

  if (!response.ok) {
    throw new Error("Failed to fetch notes");
  }

  return response.json();
}

async function createNote({
  projectId,
  ...data
}: {
  projectId: string;
  content: string;
  is_pinned?: boolean;
}): Promise<ProjectNoteFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create note");
  }

  return response.json();
}

async function updateNote({
  projectId,
  noteId,
  ...updates
}: {
  projectId: string;
  noteId: string;
  content?: string;
  is_pinned?: boolean;
}): Promise<ProjectNoteFromAPI> {
  const response = await fetch(`/api/projects/${projectId}/notes/${noteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update note");
  }

  return response.json();
}

async function deleteNote({
  projectId,
  noteId,
}: {
  projectId: string;
  noteId: string;
}): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/notes/${noteId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete note");
  }
}

// Hook: Fetch notes
export function useNotes(projectId: string | null) {
  return useQuery({
    queryKey: ["notes", projectId],
    queryFn: () => fetchNotes(projectId!),
    enabled: !!projectId,
    // Cache settings for notes
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Hook: Create note
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Update note
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNote,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes", variables.projectId] });
    },
  });
}

// Hook: Delete note
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
    },
  });
}

// Hook: Toggle note pin
export function useToggleNotePin() {
  const updateNote = useUpdateNote();

  return {
    ...updateNote,
    mutate: ({
      projectId,
      note,
    }: {
      projectId: string;
      note: ProjectNoteFromAPI;
    }) => {
      updateNote.mutate({
        projectId,
        noteId: note.id,
        is_pinned: !note.is_pinned,
      });
    },
  };
}

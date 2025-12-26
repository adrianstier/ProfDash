/**
 * V1 to V2 Data Migration Utilities
 *
 * These utilities help migrate data from the original ProfDash v1 (localStorage-based)
 * to ScholarOS v2 (Supabase-based).
 *
 * V1 stored data in localStorage under these keys:
 * - profdash_tasks: Array of tasks
 * - profdash_projects: Array of projects (manuscripts/grants)
 * - profdash_settings: User preferences
 */

import type { TaskCategory, TaskPriority, TaskStatus } from "@scholaros/shared";

// V1 Task structure (from localStorage)
interface V1Task {
  id: string;
  title: string;
  notes?: string;
  category: string; // "research" | "teaching" | "grants" | "service" | "admin" | "personal"
  priority: string; // "p1" | "p2" | "p3" | "p4"
  status: string; // "todo" | "progress" | "done"
  due?: string | null;
  project?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
}

// V1 Project structure (from localStorage)
interface V1Project {
  id: string;
  title: string;
  type: string; // "manuscript" | "grant" | "general"
  status: string; // "active" | "completed" | "archived"
  stage?: string;
  summary?: string;
  dueDate?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

// V2 Task structure (for Supabase)
export interface V2Task {
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due?: string | null;
  project_id?: string | null;
  tags?: string[];
  workspace_id?: string | null;
}

// V2 Project structure (for Supabase)
export interface V2Project {
  title: string;
  type: "manuscript" | "grant" | "general";
  status: "active" | "completed" | "archived";
  stage?: string | null;
  summary?: string | null;
  due_date?: string | null;
  workspace_id: string;
}

// Migration result
export interface MigrationResult {
  success: boolean;
  tasksImported: number;
  projectsImported: number;
  errors: string[];
  warnings: string[];
}

// Map V1 categories to V2 categories
// Note: V1 had "service" and "personal" which don't exist in V2, map to misc
const categoryMap: Record<string, TaskCategory> = {
  research: "research",
  teaching: "teaching",
  grants: "grants",
  service: "admin", // V1 service maps to admin
  admin: "admin",
  personal: "misc", // V1 personal maps to misc
};

// Map V1 priorities to V2 priorities
const priorityMap: Record<string, TaskPriority> = {
  p1: "p1",
  p2: "p2",
  p3: "p3",
  p4: "p4",
};

// Map V1 statuses to V2 statuses
const statusMap: Record<string, TaskStatus> = {
  todo: "todo",
  progress: "progress",
  done: "done",
};

/**
 * Extract V1 data from localStorage
 */
export function extractV1Data(): {
  tasks: V1Task[];
  projects: V1Project[];
} {
  if (typeof window === "undefined") {
    return { tasks: [], projects: [] };
  }

  const tasksJson = localStorage.getItem("profdash_tasks");
  const projectsJson = localStorage.getItem("profdash_projects");

  let tasks: V1Task[] = [];
  let projects: V1Project[] = [];

  try {
    if (tasksJson) {
      tasks = JSON.parse(tasksJson);
    }
  } catch (e) {
    console.error("Failed to parse V1 tasks:", e);
  }

  try {
    if (projectsJson) {
      projects = JSON.parse(projectsJson);
    }
  } catch (e) {
    console.error("Failed to parse V1 projects:", e);
  }

  return { tasks, projects };
}

/**
 * Convert V1 task to V2 format
 */
export function convertTask(
  v1Task: V1Task,
  projectIdMap: Map<string, string>
): V2Task {
  return {
    title: v1Task.title,
    description: v1Task.notes || null,
    category: categoryMap[v1Task.category] || "research",
    priority: priorityMap[v1Task.priority] || "p3",
    status: statusMap[v1Task.status] || "todo",
    due: v1Task.due || null,
    project_id: v1Task.project ? projectIdMap.get(v1Task.project) || null : null,
    tags: v1Task.tags || [],
  };
}

/**
 * Convert V1 project to V2 format
 */
export function convertProject(v1Project: V1Project, workspaceId: string): V2Project {
  const typeMap: Record<string, "manuscript" | "grant" | "general"> = {
    manuscript: "manuscript",
    grant: "grant",
    general: "general",
  };

  const statusMap: Record<string, "active" | "completed" | "archived"> = {
    active: "active",
    completed: "completed",
    archived: "archived",
  };

  return {
    title: v1Project.title,
    type: typeMap[v1Project.type] || "general",
    status: statusMap[v1Project.status] || "active",
    stage: v1Project.stage || null,
    summary: v1Project.summary || null,
    due_date: v1Project.dueDate || null,
    workspace_id: workspaceId,
  };
}

/**
 * Validate V1 data before migration
 */
export function validateV1Data(data: { tasks: V1Task[]; projects: V1Project[] }): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate tasks
  for (const task of data.tasks) {
    if (!task.title || task.title.trim() === "") {
      errors.push(`Task ${task.id} has no title`);
    }
    if (!categoryMap[task.category]) {
      warnings.push(`Task "${task.title}" has unknown category: ${task.category}`);
    }
    if (!priorityMap[task.priority]) {
      warnings.push(`Task "${task.title}" has unknown priority: ${task.priority}`);
    }
  }

  // Validate projects
  for (const project of data.projects) {
    if (!project.title || project.title.trim() === "") {
      errors.push(`Project ${project.id} has no title`);
    }
    if (!["manuscript", "grant", "general"].includes(project.type)) {
      warnings.push(`Project "${project.title}" has unknown type: ${project.type}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export V1 data as JSON for backup
 */
export function exportV1DataAsJson(): string {
  const data = extractV1Data();
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON string
 */
export function parseImportData(jsonString: string): {
  tasks: V1Task[];
  projects: V1Project[];
} | null {
  try {
    const data = JSON.parse(jsonString);
    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
    };
  } catch (e) {
    console.error("Failed to parse import data:", e);
    return null;
  }
}

/**
 * Check if V1 data exists in localStorage
 */
export function hasV1Data(): boolean {
  if (typeof window === "undefined") return false;

  const tasks = localStorage.getItem("profdash_tasks");
  const projects = localStorage.getItem("profdash_projects");

  return !!(tasks || projects);
}

/**
 * Clear V1 data from localStorage after successful migration
 */
export function clearV1Data(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("profdash_tasks");
  localStorage.removeItem("profdash_projects");
  localStorage.removeItem("profdash_settings");
}

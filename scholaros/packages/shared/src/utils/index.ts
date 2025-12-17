import type { TaskCategory, TaskPriority } from "../types";

// Quick add parser - ports existing functionality from ProfDash v1
export interface ParsedQuickAdd {
  title: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  due?: Date;
  assignees?: string[];
  projectId?: string;
}

const PRIORITY_MAP: Record<string, TaskPriority> = {
  p1: "p1",
  p2: "p2",
  p3: "p3",
  p4: "p4",
  "!1": "p1",
  "!2": "p2",
  "!3": "p3",
  "!4": "p4",
};

const CATEGORY_MAP: Record<string, TaskCategory> = {
  research: "research",
  teaching: "teaching",
  grants: "grants",
  grant: "grants",
  grad: "grad-mentorship",
  "grad-mentorship": "grad-mentorship",
  undergrad: "undergrad-mentorship",
  "undergrad-mentorship": "undergrad-mentorship",
  admin: "admin",
  misc: "misc",
};

const DAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

/**
 * Parse a quick-add string into task components
 *
 * Syntax:
 * - Priority: p1, p2, p3, p4 (or !1, !2, !3, !4)
 * - Category: #research, #teaching, #grants, #grad, #undergrad, #admin, #misc
 * - Due date: today, tomorrow, mon, tue, wed, thu, fri, sat, sun
 * - Assignees: @username (future)
 * - Project link: +project-id (future)
 *
 * Example: "NSF report fri #grants p1"
 */
export function parseQuickAdd(input: string): ParsedQuickAdd {
  const tokens = input.trim().split(/\s+/);
  const titleTokens: string[] = [];

  let priority: TaskPriority | undefined;
  let category: TaskCategory | undefined;
  let due: Date | undefined;
  const assignees: string[] = [];
  let projectId: string | undefined;

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();

    // Check for priority (p1, p2, p3, p4 or !1, !2, !3, !4)
    if (PRIORITY_MAP[lowerToken]) {
      priority = PRIORITY_MAP[lowerToken];
      continue;
    }

    // Check for category (#research, #teaching, etc.)
    if (token.startsWith("#")) {
      const cat = lowerToken.slice(1);
      if (CATEGORY_MAP[cat]) {
        category = CATEGORY_MAP[cat];
        continue;
      }
    }

    // Check for assignee (@username)
    if (token.startsWith("@")) {
      assignees.push(token.slice(1));
      continue;
    }

    // Check for project link (+project-id)
    if (token.startsWith("+")) {
      projectId = token.slice(1);
      continue;
    }

    // Check for date keywords
    if (lowerToken === "today") {
      due = new Date();
      continue;
    }

    if (lowerToken === "tomorrow") {
      due = new Date();
      due.setDate(due.getDate() + 1);
      continue;
    }

    // Check for day of week
    if (DAY_MAP[lowerToken] !== undefined) {
      due = getNextDayOfWeek(DAY_MAP[lowerToken]);
      continue;
    }

    // Everything else is part of the title
    titleTokens.push(token);
  }

  return {
    title: titleTokens.join(" "),
    priority,
    category,
    due,
    assignees: assignees.length > 0 ? assignees : undefined,
    projectId,
  };
}

/**
 * Get the next occurrence of a day of week
 */
function getNextDayOfWeek(dayIndex: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = dayIndex - currentDay;

  // If the day has passed this week, get next week's
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + daysUntil);
  return nextDay;
}

// Date formatting utilities
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatRelativeDate(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays < 7) {
    return target.toLocaleDateString("en-US", { weekday: "long" });
  }

  return formatDate(d);
}

export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isDueToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

// Slug generation
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Priority utilities
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  p1: "Urgent",
  p2: "High",
  p3: "Medium",
  p4: "Low",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  p1: "text-red-600 bg-red-100",
  p2: "text-orange-600 bg-orange-100",
  p3: "text-blue-600 bg-blue-100",
  p4: "text-gray-600 bg-gray-100",
};

// Category utilities
export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  research: "Research",
  teaching: "Teaching",
  grants: "Grants",
  "grad-mentorship": "Grad Mentorship",
  "undergrad-mentorship": "Undergrad Mentorship",
  admin: "Admin",
  misc: "Misc",
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  research: "text-blue-600 bg-blue-100",
  teaching: "text-green-600 bg-green-100",
  grants: "text-yellow-600 bg-yellow-100",
  "grad-mentorship": "text-purple-600 bg-purple-100",
  "undergrad-mentorship": "text-pink-600 bg-pink-100",
  admin: "text-gray-600 bg-gray-100",
  misc: "text-gray-500 bg-gray-50",
};

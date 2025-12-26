import type { TaskCategory, TaskPriority, PublicationStatus, PublicationType, AuthorRole } from "../types";

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

// Publication status utilities
export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  idea: "Idea",
  drafting: "Drafting",
  "internal-review": "Internal Review",
  submitted: "Submitted",
  "under-review": "Under Review",
  revision: "Revision",
  accepted: "Accepted",
  "in-press": "In Press",
  published: "Published",
};

export const PUBLICATION_STATUS_COLORS: Record<PublicationStatus, string> = {
  idea: "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
  drafting: "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
  "internal-review": "text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300",
  submitted: "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300",
  "under-review": "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300",
  revision: "text-pink-600 bg-pink-100 dark:bg-pink-900 dark:text-pink-300",
  accepted: "text-teal-600 bg-teal-100 dark:bg-teal-900 dark:text-teal-300",
  "in-press": "text-indigo-600 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300",
  published: "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300",
};

// Publication type utilities
export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  "journal-article": "Journal Article",
  "conference-paper": "Conference Paper",
  "book-chapter": "Book Chapter",
  book: "Book",
  preprint: "Preprint",
  thesis: "Thesis",
  report: "Report",
  other: "Other",
};

export const PUBLICATION_TYPE_COLORS: Record<PublicationType, string> = {
  "journal-article": "text-blue-600 bg-blue-100",
  "conference-paper": "text-purple-600 bg-purple-100",
  "book-chapter": "text-orange-600 bg-orange-100",
  book: "text-red-600 bg-red-100",
  preprint: "text-gray-600 bg-gray-100",
  thesis: "text-green-600 bg-green-100",
  report: "text-yellow-600 bg-yellow-100",
  other: "text-gray-500 bg-gray-50",
};

// Author role utilities
export const AUTHOR_ROLE_LABELS: Record<AuthorRole, string> = {
  first: "First Author",
  corresponding: "Corresponding",
  "co-first": "Co-First",
  middle: "Co-Author",
  last: "Last Author",
  senior: "Senior Author",
};

// Pipeline stages for publication tracking (ordered)
export const PUBLICATION_PIPELINE_STAGES: PublicationStatus[] = [
  "idea",
  "drafting",
  "internal-review",
  "submitted",
  "under-review",
  "revision",
  "accepted",
  "in-press",
  "published",
];

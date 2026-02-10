/**
 * Task Grouping & Urgency Sorting Utilities
 *
 * Groups tasks into deadline-based sections and provides urgency-based sorting.
 * Ported from academic-to-do-app's useFilters and TaskSections patterns,
 * adapted for ScholarOS's TaskFromAPI type.
 */

import { parseLocalDate } from "@scholaros/shared";
import type { TaskFromAPI } from "@scholaros/shared";

// Priority weight mapping for urgency sort (lower = more urgent)
const PRIORITY_ORDER: Record<string, number> = {
  p1: 0,
  p2: 1,
  p3: 2,
  p4: 3,
};

// ============================================================
// Date helpers
// ============================================================

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}


function isToday(dateStr: string): boolean {
  const date = startOfDay(parseLocalDate(dateStr));
  const today = startOfDay(new Date());
  return date.getTime() === today.getTime();
}

function isTomorrow(dateStr: string): boolean {
  const date = startOfDay(parseLocalDate(dateStr));
  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.getTime() === tomorrow.getTime();
}

function isOverdue(dateStr: string, status?: string): boolean {
  if (status === "done") return false;
  const date = startOfDay(parseLocalDate(dateStr));
  const today = startOfDay(new Date());
  return date < today;
}

function isThisWeek(dateStr: string): boolean {
  const date = startOfDay(parseLocalDate(dateStr));
  const today = startOfDay(new Date());
  // "This week" means after tomorrow but within 7 days from today
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return date >= dayAfterTomorrow && date < weekEnd;
}

function isNextWeek(dateStr: string): boolean {
  const date = startOfDay(parseLocalDate(dateStr));
  const today = startOfDay(new Date());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const twoWeeksEnd = new Date(today);
  twoWeeksEnd.setDate(twoWeeksEnd.getDate() + 14);
  return date >= weekEnd && date < twoWeeksEnd;
}

function isWithinDays(dateStr: string, days: number): boolean {
  const date = startOfDay(parseLocalDate(dateStr));
  const today = startOfDay(new Date());
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  // After today, within N days
  return date > today && date <= futureDate;
}

// ============================================================
// Task Section Types
// ============================================================

export type TaskSectionId =
  | "overdue"
  | "today"
  | "tomorrow"
  | "coming_up"
  | "this_week"
  | "next_week"
  | "later"
  | "no_date";

export interface TaskSection {
  id: TaskSectionId;
  title: string;
  tasks: TaskFromAPI[];
  color: string; // Tailwind border/text color class
  bgColor: string; // Tailwind background color class
  count: number;
}

// ============================================================
// Section definitions
// ============================================================

const SECTION_DEFS: Record<
  TaskSectionId,
  { title: string; color: string; bgColor: string }
> = {
  overdue: {
    title: "Overdue",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
  },
  today: {
    title: "Due Today",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  tomorrow: {
    title: "Tomorrow",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
  coming_up: {
    title: "Coming Up",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  this_week: {
    title: "This Week",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  next_week: {
    title: "Next Week",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  later: {
    title: "Later",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  no_date: {
    title: "No Date",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
  },
};

// ============================================================
// Grouping functions
// ============================================================

/**
 * Groups tasks into sections for the Today page.
 * Sections: Overdue, Due Today, Coming Up (next 2-3 days).
 */
export function groupTasksForToday(tasks: TaskFromAPI[]): TaskSection[] {
  const overdue: TaskFromAPI[] = [];
  const today: TaskFromAPI[] = [];
  const comingUp: TaskFromAPI[] = [];

  for (const task of tasks) {
    if (!task.due) continue; // Today page typically only shows dated tasks
    if (isOverdue(task.due, task.status)) {
      overdue.push(task);
    } else if (isToday(task.due)) {
      today.push(task);
    } else if (isWithinDays(task.due, 3)) {
      comingUp.push(task);
    }
  }

  // Also include tasks with no date in the today view
  const noDate = tasks.filter((t) => !t.due);

  const sections: TaskSection[] = [];

  if (overdue.length > 0) {
    sections.push({
      ...SECTION_DEFS.overdue,
      id: "overdue",
      tasks: sortByUrgency(overdue),
      count: overdue.length,
    });
  }

  sections.push({
    ...SECTION_DEFS.today,
    id: "today",
    tasks: sortByUrgency(today),
    count: today.length,
  });

  if (comingUp.length > 0) {
    sections.push({
      ...SECTION_DEFS.coming_up,
      id: "coming_up",
      tasks: sortByUrgency(comingUp),
      count: comingUp.length,
    });
  }

  if (noDate.length > 0) {
    sections.push({
      ...SECTION_DEFS.no_date,
      id: "no_date",
      tasks: sortByUrgency(noDate),
      count: noDate.length,
    });
  }

  return sections;
}

/**
 * Groups tasks into sections for the Upcoming page.
 * Sections: Overdue, Today, Tomorrow, This Week, Next Week, Later.
 */
export function groupTasksForUpcoming(tasks: TaskFromAPI[]): TaskSection[] {
  const buckets: Record<TaskSectionId, TaskFromAPI[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    coming_up: [],
    this_week: [],
    next_week: [],
    later: [],
    no_date: [],
  };

  for (const task of tasks) {
    if (!task.due) {
      buckets.no_date.push(task);
      continue;
    }
    if (isOverdue(task.due, task.status)) {
      buckets.overdue.push(task);
    } else if (isToday(task.due)) {
      buckets.today.push(task);
    } else if (isTomorrow(task.due)) {
      buckets.tomorrow.push(task);
    } else if (isThisWeek(task.due)) {
      buckets.this_week.push(task);
    } else if (isNextWeek(task.due)) {
      buckets.next_week.push(task);
    } else {
      buckets.later.push(task);
    }
  }

  const sectionOrder: TaskSectionId[] = [
    "overdue",
    "today",
    "tomorrow",
    "this_week",
    "next_week",
    "later",
    "no_date",
  ];

  return sectionOrder
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({
      ...SECTION_DEFS[id],
      id,
      tasks: sortByUrgency(buckets[id]),
      count: buckets[id].length,
    }));
}

/**
 * Groups tasks into all sections (for the list page sectioned view).
 * Sections: Overdue, Due Today, This Week, Upcoming (later), No Date.
 */
export function groupTasksBySections(tasks: TaskFromAPI[]): TaskSection[] {
  const buckets: Record<TaskSectionId, TaskFromAPI[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    coming_up: [],
    this_week: [],
    next_week: [],
    later: [],
    no_date: [],
  };

  for (const task of tasks) {
    if (!task.due) {
      buckets.no_date.push(task);
      continue;
    }
    if (isOverdue(task.due, task.status)) {
      buckets.overdue.push(task);
    } else if (isToday(task.due)) {
      buckets.today.push(task);
    } else if (isThisWeek(task.due) || isTomorrow(task.due)) {
      buckets.this_week.push(task);
    } else if (isNextWeek(task.due)) {
      buckets.next_week.push(task);
    } else {
      buckets.later.push(task);
    }
  }

  const sectionOrder: TaskSectionId[] = [
    "overdue",
    "today",
    "this_week",
    "next_week",
    "later",
    "no_date",
  ];

  return sectionOrder
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({
      ...SECTION_DEFS[id],
      id,
      tasks: sortByUrgency(buckets[id]),
      count: buckets[id].length,
    }));
}

// ============================================================
// Urgency sort
// ============================================================

/**
 * Sort tasks by urgency: overdue first, then by priority (p1 > p2 > p3 > p4),
 * then by due date (earliest first), then by creation date.
 */
export function sortByUrgency(tasks: TaskFromAPI[]): TaskFromAPI[] {
  return [...tasks].sort((a, b) => {
    // Completed tasks go to bottom
    const aDone = a.status === "done";
    const bDone = b.status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;

    // Overdue items first
    const aOverdue = a.due ? isOverdue(a.due, a.status) : false;
    const bOverdue = b.due ? isOverdue(b.due, b.status) : false;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    // Priority comparison (p1=0, p2=1, etc.)
    const aPriority = PRIORITY_ORDER[a.priority] ?? 2;
    const bPriority = PRIORITY_ORDER[b.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Due today comes before later dates
    const aDueToday = a.due ? isToday(a.due) : false;
    const bDueToday = b.due ? isToday(b.due) : false;
    if (aDueToday !== bDueToday) return aDueToday ? -1 : 1;

    // Sort by due date (earliest first), tasks without dates go last
    if (a.due && b.due) {
      return parseLocalDate(a.due).getTime() - parseLocalDate(b.due).getTime();
    }
    if (a.due) return -1;
    if (b.due) return 1;

    // Fall back to created date (newest first)
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}

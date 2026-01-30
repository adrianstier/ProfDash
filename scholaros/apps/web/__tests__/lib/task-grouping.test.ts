import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  sortByUrgency,
  groupTasksForToday,
  groupTasksForUpcoming,
  groupTasksBySections,
} from "@/lib/utils/task-grouping";
import { createMockTaskFromAPI } from "../helpers/mock-factories";
import type { TaskFromAPI } from "@scholaros/shared";

// ---------------------------------------------------------------------------
// Date helpers for building test fixtures relative to "now"
// ---------------------------------------------------------------------------

function toISO(date: Date): string {
  return date.toISOString();
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

// =========================================================================
// sortByUrgency
// =========================================================================

describe("sortByUrgency", () => {
  it("puts completed tasks last", () => {
    const done = createMockTaskFromAPI({ status: "done", priority: "p1" });
    const todo = createMockTaskFromAPI({ status: "todo", priority: "p4" });
    const sorted = sortByUrgency([done, todo]);
    expect(sorted[0].status).toBe("todo");
    expect(sorted[1].status).toBe("done");
  });

  it("puts overdue tasks before non-overdue", () => {
    const overdue = createMockTaskFromAPI({
      due: toISO(daysFromNow(-2)),
      priority: "p4",
      status: "todo",
    });
    const upcoming = createMockTaskFromAPI({
      due: toISO(daysFromNow(5)),
      priority: "p1",
      status: "todo",
    });
    const sorted = sortByUrgency([upcoming, overdue]);
    expect(sorted[0].id).toBe(overdue.id);
  });

  it("sorts by priority within same urgency level", () => {
    const p3 = createMockTaskFromAPI({
      priority: "p3",
      due: toISO(daysFromNow(3)),
      status: "todo",
    });
    const p1 = createMockTaskFromAPI({
      priority: "p1",
      due: toISO(daysFromNow(3)),
      status: "todo",
    });
    const p2 = createMockTaskFromAPI({
      priority: "p2",
      due: toISO(daysFromNow(3)),
      status: "todo",
    });
    const sorted = sortByUrgency([p3, p1, p2]);
    expect(sorted[0].priority).toBe("p1");
    expect(sorted[1].priority).toBe("p2");
    expect(sorted[2].priority).toBe("p3");
  });

  it("sorts by due date when priority is the same", () => {
    const sooner = createMockTaskFromAPI({
      priority: "p2",
      due: toISO(daysFromNow(2)),
      status: "todo",
    });
    const later = createMockTaskFromAPI({
      priority: "p2",
      due: toISO(daysFromNow(10)),
      status: "todo",
    });
    const sorted = sortByUrgency([later, sooner]);
    expect(sorted[0].id).toBe(sooner.id);
  });

  it("puts tasks with due dates before tasks without", () => {
    const withDate = createMockTaskFromAPI({
      priority: "p3",
      due: toISO(daysFromNow(5)),
      status: "todo",
    });
    const noDate = createMockTaskFromAPI({
      priority: "p3",
      due: null,
      status: "todo",
    });
    const sorted = sortByUrgency([noDate, withDate]);
    expect(sorted[0].id).toBe(withDate.id);
  });

  it("returns a new array (does not mutate input)", () => {
    const tasks = [
      createMockTaskFromAPI({ status: "todo" }),
      createMockTaskFromAPI({ status: "done" }),
    ];
    const sorted = sortByUrgency(tasks);
    expect(sorted).not.toBe(tasks);
  });

  it("handles empty array", () => {
    expect(sortByUrgency([])).toEqual([]);
  });
});

// =========================================================================
// groupTasksForToday
// =========================================================================

describe("groupTasksForToday", () => {
  it("returns at least a Due Today section even if empty", () => {
    const sections = groupTasksForToday([]);
    const todaySection = sections.find((s) => s.id === "today");
    expect(todaySection).toBeDefined();
    expect(todaySection!.count).toBe(0);
  });

  it("places overdue tasks in the Overdue section", () => {
    const overdue = createMockTaskFromAPI({
      due: toISO(daysFromNow(-3)),
      status: "todo",
    });
    const sections = groupTasksForToday([overdue]);
    const overdueSection = sections.find((s) => s.id === "overdue");
    expect(overdueSection).toBeDefined();
    expect(overdueSection!.tasks).toHaveLength(1);
  });

  it("does not mark completed tasks as overdue", () => {
    const completedPast = createMockTaskFromAPI({
      due: toISO(daysFromNow(-3)),
      status: "done",
    });
    const sections = groupTasksForToday([completedPast]);
    const overdueSection = sections.find((s) => s.id === "overdue");
    // Either no overdue section or it's empty
    expect(
      overdueSection === undefined || overdueSection.tasks.length === 0
    ).toBe(true);
  });

  it("places tasks due today in the Due Today section", () => {
    const today = createMockTaskFromAPI({
      due: toISO(todayDate()),
      status: "todo",
    });
    const sections = groupTasksForToday([today]);
    const todaySection = sections.find((s) => s.id === "today");
    expect(todaySection).toBeDefined();
    expect(todaySection!.tasks).toHaveLength(1);
  });

  it("places tasks due within 3 days in Coming Up", () => {
    const soon = createMockTaskFromAPI({
      due: toISO(daysFromNow(2)),
      status: "todo",
    });
    const sections = groupTasksForToday([soon]);
    const comingUp = sections.find((s) => s.id === "coming_up");
    expect(comingUp).toBeDefined();
    expect(comingUp!.tasks).toHaveLength(1);
  });

  it("does not include tasks due far in the future", () => {
    const farFuture = createMockTaskFromAPI({
      due: toISO(daysFromNow(30)),
      status: "todo",
    });
    const sections = groupTasksForToday([farFuture]);
    // Should only have the default "today" section (empty)
    const allTasks = sections.flatMap((s) => s.tasks);
    expect(allTasks).toHaveLength(0);
  });

  it("places tasks with no due date in No Date section", () => {
    const noDate = createMockTaskFromAPI({ due: null, status: "todo" });
    const sections = groupTasksForToday([noDate]);
    const noDateSection = sections.find((s) => s.id === "no_date");
    expect(noDateSection).toBeDefined();
    expect(noDateSection!.tasks).toHaveLength(1);
  });

  it("handles multiple tasks across sections", () => {
    const tasks: TaskFromAPI[] = [
      createMockTaskFromAPI({ due: toISO(daysFromNow(-1)), status: "todo" }),
      createMockTaskFromAPI({ due: toISO(todayDate()), status: "todo" }),
      createMockTaskFromAPI({ due: toISO(daysFromNow(2)), status: "todo" }),
      createMockTaskFromAPI({ due: null, status: "todo" }),
    ];
    const sections = groupTasksForToday(tasks);
    const totalTasks = sections.reduce((sum, s) => sum + s.count, 0);
    expect(totalTasks).toBe(4);
  });
});

// =========================================================================
// groupTasksForUpcoming
// =========================================================================

describe("groupTasksForUpcoming", () => {
  it("returns empty array for no tasks", () => {
    const sections = groupTasksForUpcoming([]);
    expect(sections).toEqual([]);
  });

  it("places overdue tasks in Overdue section", () => {
    const overdue = createMockTaskFromAPI({
      due: toISO(daysFromNow(-5)),
      status: "todo",
    });
    const sections = groupTasksForUpcoming([overdue]);
    expect(sections[0].id).toBe("overdue");
  });

  it("places tasks due today in Today section", () => {
    const today = createMockTaskFromAPI({
      due: toISO(todayDate()),
      status: "todo",
    });
    const sections = groupTasksForUpcoming([today]);
    const todaySection = sections.find((s) => s.id === "today");
    expect(todaySection).toBeDefined();
  });

  it("places tasks due tomorrow in Tomorrow section", () => {
    const tomorrow = createMockTaskFromAPI({
      due: toISO(daysFromNow(1)),
      status: "todo",
    });
    const sections = groupTasksForUpcoming([tomorrow]);
    const tomorrowSection = sections.find((s) => s.id === "tomorrow");
    expect(tomorrowSection).toBeDefined();
    expect(tomorrowSection!.tasks).toHaveLength(1);
  });

  it("places tasks due this week in This Week section", () => {
    // "This week" = after tomorrow but within 7 days
    const thisWeek = createMockTaskFromAPI({
      due: toISO(daysFromNow(4)),
      status: "todo",
    });
    const sections = groupTasksForUpcoming([thisWeek]);
    const weekSection = sections.find((s) => s.id === "this_week");
    expect(weekSection).toBeDefined();
    expect(weekSection!.tasks).toHaveLength(1);
  });

  it("places tasks due next week in Next Week section", () => {
    const nextWeek = createMockTaskFromAPI({
      due: toISO(daysFromNow(10)),
      status: "todo",
    });
    const sections = groupTasksForUpcoming([nextWeek]);
    const nextWeekSection = sections.find((s) => s.id === "next_week");
    expect(nextWeekSection).toBeDefined();
    expect(nextWeekSection!.tasks).toHaveLength(1);
  });

  it("places tasks due far in the future in Later section", () => {
    const later = createMockTaskFromAPI({
      due: toISO(daysFromNow(30)),
      status: "todo",
    });
    const sections = groupTasksForUpcoming([later]);
    const laterSection = sections.find((s) => s.id === "later");
    expect(laterSection).toBeDefined();
    expect(laterSection!.tasks).toHaveLength(1);
  });

  it("places tasks with no due date in No Date section", () => {
    const noDate = createMockTaskFromAPI({ due: null, status: "todo" });
    const sections = groupTasksForUpcoming([noDate]);
    const noDateSection = sections.find((s) => s.id === "no_date");
    expect(noDateSection).toBeDefined();
    expect(noDateSection!.tasks).toHaveLength(1);
  });

  it("maintains section ordering: overdue first, no_date last", () => {
    const tasks: TaskFromAPI[] = [
      createMockTaskFromAPI({ due: null, status: "todo" }),
      createMockTaskFromAPI({ due: toISO(daysFromNow(-1)), status: "todo" }),
      createMockTaskFromAPI({ due: toISO(todayDate()), status: "todo" }),
      createMockTaskFromAPI({ due: toISO(daysFromNow(30)), status: "todo" }),
    ];
    const sections = groupTasksForUpcoming(tasks);
    const ids = sections.map((s) => s.id);
    // Overdue should come before today, and no_date should be last
    expect(ids.indexOf("overdue")).toBeLessThan(ids.indexOf("today"));
    expect(ids[ids.length - 1]).toBe("no_date");
  });

  it("only includes sections that have tasks", () => {
    const tasks: TaskFromAPI[] = [
      createMockTaskFromAPI({ due: toISO(todayDate()), status: "todo" }),
    ];
    const sections = groupTasksForUpcoming(tasks);
    // Should only have the "today" section
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe("today");
  });
});

// =========================================================================
// groupTasksBySections
// =========================================================================

describe("groupTasksBySections", () => {
  it("returns empty array for no tasks", () => {
    expect(groupTasksBySections([])).toEqual([]);
  });

  it("places overdue tasks in Overdue section", () => {
    const overdue = createMockTaskFromAPI({
      due: toISO(daysFromNow(-2)),
      status: "todo",
    });
    const sections = groupTasksBySections([overdue]);
    expect(sections[0].id).toBe("overdue");
  });

  it("places tasks due today in Today section", () => {
    const today = createMockTaskFromAPI({
      due: toISO(todayDate()),
      status: "todo",
    });
    const sections = groupTasksBySections([today]);
    const todaySection = sections.find((s) => s.id === "today");
    expect(todaySection).toBeDefined();
  });

  it("places tomorrow tasks in This Week section (merged)", () => {
    // In groupTasksBySections, tomorrow tasks go into this_week
    const tomorrow = createMockTaskFromAPI({
      due: toISO(daysFromNow(1)),
      status: "todo",
    });
    const sections = groupTasksBySections([tomorrow]);
    const weekSection = sections.find((s) => s.id === "this_week");
    expect(weekSection).toBeDefined();
    expect(weekSection!.tasks).toHaveLength(1);
  });

  it("places tasks with no due date in No Date section", () => {
    const noDate = createMockTaskFromAPI({ due: null, status: "todo" });
    const sections = groupTasksBySections([noDate]);
    const noDateSection = sections.find((s) => s.id === "no_date");
    expect(noDateSection).toBeDefined();
    expect(noDateSection!.tasks).toHaveLength(1);
  });

  it("places far-future tasks in Later section", () => {
    const later = createMockTaskFromAPI({
      due: toISO(daysFromNow(30)),
      status: "todo",
    });
    const sections = groupTasksBySections([later]);
    const laterSection = sections.find((s) => s.id === "later");
    expect(laterSection).toBeDefined();
  });

  it("only includes sections that have tasks", () => {
    const single = createMockTaskFromAPI({
      due: toISO(todayDate()),
      status: "todo",
    });
    const sections = groupTasksBySections([single]);
    expect(sections).toHaveLength(1);
  });

  it("each section has count matching its tasks length", () => {
    const tasks: TaskFromAPI[] = [
      createMockTaskFromAPI({ due: toISO(daysFromNow(-1)), status: "todo" }),
      createMockTaskFromAPI({ due: toISO(daysFromNow(-2)), status: "todo" }),
      createMockTaskFromAPI({ due: toISO(todayDate()), status: "todo" }),
    ];
    const sections = groupTasksBySections(tasks);
    for (const section of sections) {
      expect(section.count).toBe(section.tasks.length);
    }
  });

  it("sorts tasks within each section by urgency", () => {
    const tasks: TaskFromAPI[] = [
      createMockTaskFromAPI({
        due: toISO(todayDate()),
        priority: "p4",
        status: "todo",
      }),
      createMockTaskFromAPI({
        due: toISO(todayDate()),
        priority: "p1",
        status: "todo",
      }),
    ];
    const sections = groupTasksBySections(tasks);
    const todaySection = sections.find((s) => s.id === "today");
    expect(todaySection).toBeDefined();
    expect(todaySection!.tasks[0].priority).toBe("p1");
    expect(todaySection!.tasks[1].priority).toBe("p4");
  });
});

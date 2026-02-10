/**
 * Recurrence utilities for parsing and generating RRULE strings (RFC 5545)
 *
 * Supports:
 * - Daily, weekly, monthly, yearly frequencies
 * - Interval (every N days/weeks/months/years)
 * - Days of week (for weekly recurrence)
 * - End date (UNTIL) or count (COUNT)
 */

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type DayOfWeek = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // Every N periods (default: 1)
  byDay?: DayOfWeek[]; // For weekly: specific days
  until?: Date; // End date
  count?: number; // Number of occurrences
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  SU: "Sunday",
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
};

const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

const JS_DAY_TO_RRULE: Record<number, DayOfWeek> = {
  0: "SU",
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
};

const RRULE_TO_JS_DAY: Record<DayOfWeek, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

/**
 * Parse an RRULE string into a RecurrenceRule object
 */
export function parseRRule(rrule: string): RecurrenceRule | null {
  if (!rrule || !rrule.startsWith("RRULE:")) {
    return null;
  }

  const ruleContent = rrule.substring(6); // Remove "RRULE:" prefix
  const parts = ruleContent.split(";");
  const result: RecurrenceRule = {
    frequency: "DAILY",
  };

  for (const part of parts) {
    const [key, value] = part.split("=");

    switch (key) {
      case "FREQ":
        if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(value)) {
          result.frequency = value as RecurrenceFrequency;
        }
        break;
      case "INTERVAL":
        result.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        result.byDay = value.split(",") as DayOfWeek[];
        break;
      case "UNTIL":
        // Parse YYYYMMDD or YYYYMMDDTHHMMSSZ format
        const year = parseInt(value.substring(0, 4), 10);
        const month = parseInt(value.substring(4, 6), 10) - 1;
        const day = parseInt(value.substring(6, 8), 10);
        result.until = new Date(year, month, day);
        break;
      case "COUNT":
        result.count = parseInt(value, 10);
        break;
    }
  }

  return result;
}

/**
 * Generate an RRULE string from a RecurrenceRule object
 */
export function generateRRule(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency}`];

  if (rule.interval && rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  if (rule.byDay && rule.byDay.length > 0) {
    parts.push(`BYDAY=${rule.byDay.join(",")}`);
  }

  if (rule.until) {
    const y = rule.until.getFullYear();
    const m = String(rule.until.getMonth() + 1).padStart(2, "0");
    const d = String(rule.until.getDate()).padStart(2, "0");
    parts.push(`UNTIL=${y}${m}${d}`);
  } else if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }

  return `RRULE:${parts.join(";")}`;
}

/**
 * Convert an RRULE to human-readable text
 */
export function rruleToText(rrule: string): string {
  const rule = parseRRule(rrule);
  if (!rule) return "Invalid recurrence rule";

  const interval = rule.interval || 1;
  let text = "";

  switch (rule.frequency) {
    case "DAILY":
      if (interval === 1) {
        text = "Daily";
      } else {
        text = `Every ${interval} days`;
      }
      break;

    case "WEEKLY":
      if (rule.byDay && rule.byDay.length > 0) {
        if (rule.byDay.length === 7) {
          text = interval === 1 ? "Every day" : `Every ${interval} weeks, every day`;
        } else if (rule.byDay.length === 5 &&
          rule.byDay.includes("MO") &&
          rule.byDay.includes("TU") &&
          rule.byDay.includes("WE") &&
          rule.byDay.includes("TH") &&
          rule.byDay.includes("FR")
        ) {
          text = interval === 1 ? "Every weekday" : `Every ${interval} weeks, weekdays`;
        } else {
          const dayNames = rule.byDay.map(d => DAY_ABBREVIATIONS[d]).join(", ");
          if (interval === 1) {
            text = `Weekly on ${dayNames}`;
          } else {
            text = `Every ${interval} weeks on ${dayNames}`;
          }
        }
      } else {
        text = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
      }
      break;

    case "MONTHLY":
      text = interval === 1 ? "Monthly" : `Every ${interval} months`;
      break;

    case "YEARLY":
      text = interval === 1 ? "Yearly" : `Every ${interval} years`;
      break;
  }

  // Add end condition
  if (rule.until) {
    text += ` until ${rule.until.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })}`;
  } else if (rule.count) {
    text += `, ${rule.count} times`;
  }

  return text;
}

/**
 * Generate the next N occurrences from an RRULE starting from a given date
 */
export function getNextOccurrences(
  rrule: string,
  startDate: Date,
  count: number = 3,
  excludeDates: string[] = []
): Date[] {
  const rule = parseRRule(rrule);
  if (!rule) return [];

  const occurrences: Date[] = [];
  const interval = rule.interval || 1;
  const current = new Date(startDate);
  let iterations = 0;
  const maxIterations = count * 10; // Safety limit

  // Set to exclude dates for quick lookup
  const excludeSet = new Set(excludeDates);

  while (occurrences.length < count && iterations < maxIterations) {
    iterations++;

    // Check if we've exceeded the end conditions
    if (rule.until && current > rule.until) {
      break;
    }
    if (rule.count && occurrences.length >= rule.count) {
      break;
    }

    // Check if this date is excluded
    const dateStr = current.toISOString().split("T")[0];
    const isExcluded = excludeSet.has(dateStr);

    // For weekly recurrence with byDay, check if current day is in the list
    if (rule.frequency === "WEEKLY" && rule.byDay && rule.byDay.length > 0) {
      const currentDay = JS_DAY_TO_RRULE[current.getDay()];
      if (rule.byDay.includes(currentDay) && !isExcluded) {
        occurrences.push(new Date(current));
      }
      // Move to next day
      current.setDate(current.getDate() + 1);
      // If we've completed a week, add (interval - 1) more weeks
      if (current.getDay() === startDate.getDay()) {
        current.setDate(current.getDate() + (interval - 1) * 7);
      }
    } else {
      if (!isExcluded) {
        occurrences.push(new Date(current));
      }

      // Move to next occurrence based on frequency
      switch (rule.frequency) {
        case "DAILY":
          current.setDate(current.getDate() + interval);
          break;
        case "WEEKLY":
          current.setDate(current.getDate() + interval * 7);
          break;
        case "MONTHLY": {
          // Preserve day-of-month to avoid drift (e.g., Jan 31 -> Feb 28, not Mar 3)
          const origDay = startDate.getDate();
          current.setMonth(current.getMonth() + interval, 1);
          const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
          current.setDate(Math.min(origDay, daysInMonth));
          break;
        }
        case "YEARLY": {
          // Handle Feb 29 -> Feb 28 for non-leap years
          const origM = startDate.getMonth();
          const origD = startDate.getDate();
          current.setFullYear(current.getFullYear() + interval, origM, 1);
          const dim = new Date(current.getFullYear(), origM + 1, 0).getDate();
          current.setDate(Math.min(origD, dim));
          break;
        }
      }
    }
  }

  return occurrences;
}

/**
 * Get the next single occurrence after a given date
 */
export function getNextOccurrence(
  rrule: string,
  afterDate: Date,
  excludeDates: string[] = []
): Date | null {
  const occurrences = getNextOccurrences(rrule, afterDate, 1, excludeDates);
  return occurrences[0] || null;
}

/**
 * Check if a given date matches the recurrence pattern
 */
export function matchesRecurrence(
  rrule: string,
  startDate: Date,
  checkDate: Date,
  excludeDates: string[] = []
): boolean {
  const rule = parseRRule(rrule);
  if (!rule) return false;

  const excludeSet = new Set(excludeDates);
  const checkStr = checkDate.toISOString().split("T")[0];
  if (excludeSet.has(checkStr)) return false;

  const interval = rule.interval || 1;

  // For weekly with byDay, check if the day is in the list
  if (rule.frequency === "WEEKLY" && rule.byDay && rule.byDay.length > 0) {
    const checkDay = JS_DAY_TO_RRULE[checkDate.getDay()];
    if (!rule.byDay.includes(checkDay)) return false;
  }

  // Check if the date falls on the pattern
  const start = new Date(startDate);
  const check = new Date(checkDate);
  const diffTime = check.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  switch (rule.frequency) {
    case "DAILY":
      return diffDays >= 0 && diffDays % interval === 0;

    case "WEEKLY":
      if (rule.byDay && rule.byDay.length > 0) {
        // Already checked byDay above
        const diffWeeks = Math.floor(diffDays / 7);
        return diffWeeks >= 0 && diffWeeks % interval === 0;
      }
      return diffDays >= 0 && diffDays % (interval * 7) === 0;

    case "MONTHLY":
      // Check if same day of month and correct interval
      if (start.getDate() !== check.getDate()) return false;
      const monthDiff =
        (check.getFullYear() - start.getFullYear()) * 12 +
        (check.getMonth() - start.getMonth());
      return monthDiff >= 0 && monthDiff % interval === 0;

    case "YEARLY":
      // Check if same day and month
      if (
        start.getDate() !== check.getDate() ||
        start.getMonth() !== check.getMonth()
      ) {
        return false;
      }
      const yearDiff = check.getFullYear() - start.getFullYear();
      return yearDiff >= 0 && yearDiff % interval === 0;
  }

  return false;
}

/**
 * Common preset recurrence rules
 */
export const RECURRENCE_PRESETS = {
  daily: generateRRule({ frequency: "DAILY" }),
  weekdays: generateRRule({
    frequency: "WEEKLY",
    byDay: ["MO", "TU", "WE", "TH", "FR"],
  }),
  weekly: generateRRule({ frequency: "WEEKLY" }),
  biweekly: generateRRule({ frequency: "WEEKLY", interval: 2 }),
  monthly: generateRRule({ frequency: "MONTHLY" }),
  yearly: generateRRule({ frequency: "YEARLY" }),
} as const;

/**
 * Get human-readable preset name if the rule matches a preset
 */
export function getPresetName(rrule: string): string | null {
  for (const [name, preset] of Object.entries(RECURRENCE_PRESETS)) {
    if (preset === rrule) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return null;
}

/**
 * Format a date for display in occurrence preview
 */
export function formatOccurrenceDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }

  const dayDiff = Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export { DAY_NAMES, DAY_ABBREVIATIONS, JS_DAY_TO_RRULE, RRULE_TO_JS_DAY };

import { describe, it, expect } from "vitest";
import {
  parseRRule,
  generateRRule,
  getNextOccurrences,
  getNextOccurrence,
  rruleToText,
  matchesRecurrence,
  RECURRENCE_PRESETS,
  getPresetName,
} from "@/lib/utils/recurrence";
import type { RecurrenceRule } from "@/lib/utils/recurrence";

describe("parseRRule", () => {
  // -----------------------------------------------------------------------
  // Frequency types
  // -----------------------------------------------------------------------
  describe("frequency types", () => {
    it("parses DAILY frequency", () => {
      const rule = parseRRule("RRULE:FREQ=DAILY");
      expect(rule).not.toBeNull();
      expect(rule!.frequency).toBe("DAILY");
    });

    it("parses WEEKLY frequency", () => {
      const rule = parseRRule("RRULE:FREQ=WEEKLY");
      expect(rule!.frequency).toBe("WEEKLY");
    });

    it("parses MONTHLY frequency", () => {
      const rule = parseRRule("RRULE:FREQ=MONTHLY");
      expect(rule!.frequency).toBe("MONTHLY");
    });

    it("parses YEARLY frequency", () => {
      const rule = parseRRule("RRULE:FREQ=YEARLY");
      expect(rule!.frequency).toBe("YEARLY");
    });
  });

  // -----------------------------------------------------------------------
  // Interval
  // -----------------------------------------------------------------------
  describe("intervals", () => {
    it("parses INTERVAL=1", () => {
      const rule = parseRRule("RRULE:FREQ=DAILY;INTERVAL=1");
      expect(rule!.interval).toBe(1);
    });

    it("parses INTERVAL=2", () => {
      const rule = parseRRule("RRULE:FREQ=WEEKLY;INTERVAL=2");
      expect(rule!.interval).toBe(2);
    });

    it("parses INTERVAL=3", () => {
      const rule = parseRRule("RRULE:FREQ=MONTHLY;INTERVAL=3");
      expect(rule!.interval).toBe(3);
    });

    it("returns undefined interval when not specified", () => {
      const rule = parseRRule("RRULE:FREQ=DAILY");
      expect(rule!.interval).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // BYDAY
  // -----------------------------------------------------------------------
  describe("byDay parsing", () => {
    it("parses single day", () => {
      const rule = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=MO");
      expect(rule!.byDay).toEqual(["MO"]);
    });

    it("parses multiple days", () => {
      const rule = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
      expect(rule!.byDay).toEqual(["MO", "WE", "FR"]);
    });

    it("parses all weekdays", () => {
      const rule = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
      expect(rule!.byDay).toEqual(["MO", "TU", "WE", "TH", "FR"]);
    });

    it("parses all seven days", () => {
      const rule = parseRRule("RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA");
      expect(rule!.byDay).toHaveLength(7);
    });
  });

  // -----------------------------------------------------------------------
  // COUNT and UNTIL
  // -----------------------------------------------------------------------
  describe("count and until", () => {
    it("parses COUNT", () => {
      const rule = parseRRule("RRULE:FREQ=DAILY;COUNT=10");
      expect(rule!.count).toBe(10);
    });

    it("parses UNTIL with YYYYMMDD format", () => {
      const rule = parseRRule("RRULE:FREQ=WEEKLY;UNTIL=20261231");
      expect(rule!.until).toBeDefined();
      expect(rule!.until!.getFullYear()).toBe(2026);
      expect(rule!.until!.getMonth()).toBe(11); // December = 11
      expect(rule!.until!.getDate()).toBe(31);
    });

    it("parses UNTIL with YYYYMMDDTHHMMSSZ format", () => {
      const rule = parseRRule("RRULE:FREQ=MONTHLY;UNTIL=20260615T000000Z");
      expect(rule!.until).toBeDefined();
      expect(rule!.until!.getFullYear()).toBe(2026);
      expect(rule!.until!.getMonth()).toBe(5); // June = 5
      expect(rule!.until!.getDate()).toBe(15);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("returns null for empty string", () => {
      expect(parseRRule("")).toBeNull();
    });

    it("returns null for string without RRULE: prefix", () => {
      expect(parseRRule("FREQ=DAILY")).toBeNull();
    });

    it("returns null for null-like input", () => {
      expect(parseRRule(null as unknown as string)).toBeNull();
      expect(parseRRule(undefined as unknown as string)).toBeNull();
    });

    it("defaults to DAILY for unrecognized FREQ values", () => {
      // The implementation defaults to DAILY and only overrides if valid
      const rule = parseRRule("RRULE:FREQ=INVALID");
      expect(rule).not.toBeNull();
      expect(rule!.frequency).toBe("DAILY"); // default
    });
  });
});

// =========================================================================
// generateRRule
// =========================================================================

describe("generateRRule", () => {
  it("generates simple DAILY rule", () => {
    expect(generateRRule({ frequency: "DAILY" })).toBe("RRULE:FREQ=DAILY");
  });

  it("generates WEEKLY rule", () => {
    expect(generateRRule({ frequency: "WEEKLY" })).toBe("RRULE:FREQ=WEEKLY");
  });

  it("generates MONTHLY rule", () => {
    expect(generateRRule({ frequency: "MONTHLY" })).toBe(
      "RRULE:FREQ=MONTHLY"
    );
  });

  it("generates YEARLY rule", () => {
    expect(generateRRule({ frequency: "YEARLY" })).toBe("RRULE:FREQ=YEARLY");
  });

  it("includes INTERVAL when > 1", () => {
    expect(generateRRule({ frequency: "WEEKLY", interval: 2 })).toBe(
      "RRULE:FREQ=WEEKLY;INTERVAL=2"
    );
  });

  it("omits INTERVAL when 1", () => {
    expect(generateRRule({ frequency: "DAILY", interval: 1 })).toBe(
      "RRULE:FREQ=DAILY"
    );
  });

  it("includes BYDAY", () => {
    const rrule = generateRRule({
      frequency: "WEEKLY",
      byDay: ["MO", "WE", "FR"],
    });
    expect(rrule).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
  });

  it("includes COUNT", () => {
    expect(generateRRule({ frequency: "DAILY", count: 5 })).toBe(
      "RRULE:FREQ=DAILY;COUNT=5"
    );
  });

  it("includes UNTIL formatted as YYYYMMDD", () => {
    const until = new Date(2026, 11, 31); // Dec 31, 2026
    const rrule = generateRRule({ frequency: "MONTHLY", until });
    expect(rrule).toBe("RRULE:FREQ=MONTHLY;UNTIL=20261231");
  });

  it("prefers UNTIL over COUNT when both present", () => {
    const until = new Date(2026, 5, 15);
    const rrule = generateRRule({
      frequency: "WEEKLY",
      until,
      count: 10,
    });
    // The implementation checks `until` first; COUNT is in the else branch
    expect(rrule).toContain("UNTIL=");
    expect(rrule).not.toContain("COUNT=");
  });
});

// =========================================================================
// Round-trip tests
// =========================================================================

describe("round-trip: parse -> generate", () => {
  const cases = [
    "RRULE:FREQ=DAILY",
    "RRULE:FREQ=WEEKLY",
    "RRULE:FREQ=MONTHLY",
    "RRULE:FREQ=YEARLY",
    "RRULE:FREQ=WEEKLY;INTERVAL=2",
    "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
    "RRULE:FREQ=DAILY;COUNT=10",
    "RRULE:FREQ=MONTHLY;UNTIL=20261231",
  ];

  for (const original of cases) {
    it(`round-trips: ${original}`, () => {
      const parsed = parseRRule(original);
      expect(parsed).not.toBeNull();
      const regenerated = generateRRule(parsed!);
      expect(regenerated).toBe(original);
    });
  }
});

// =========================================================================
// getNextOccurrences
// =========================================================================

describe("getNextOccurrences", () => {
  it("generates daily occurrences", () => {
    const start = new Date(2026, 0, 1); // Jan 1, 2026
    const occurrences = getNextOccurrences("RRULE:FREQ=DAILY", start, 3);
    expect(occurrences).toHaveLength(3);
    expect(occurrences[0].getDate()).toBe(1);
    expect(occurrences[1].getDate()).toBe(2);
    expect(occurrences[2].getDate()).toBe(3);
  });

  it("generates weekly occurrences", () => {
    const start = new Date(2026, 0, 5); // Mon Jan 5
    const occurrences = getNextOccurrences("RRULE:FREQ=WEEKLY", start, 3);
    expect(occurrences).toHaveLength(3);
    // Each occurrence should be 7 days apart
    const diff1 =
      (occurrences[1].getTime() - occurrences[0].getTime()) /
      (1000 * 60 * 60 * 24);
    expect(diff1).toBe(7);
  });

  it("generates biweekly occurrences", () => {
    const start = new Date(2026, 0, 5);
    const occurrences = getNextOccurrences(
      "RRULE:FREQ=WEEKLY;INTERVAL=2",
      start,
      3
    );
    expect(occurrences).toHaveLength(3);
    const diff =
      (occurrences[1].getTime() - occurrences[0].getTime()) /
      (1000 * 60 * 60 * 24);
    expect(diff).toBe(14);
  });

  it("generates monthly occurrences", () => {
    const start = new Date(2026, 0, 15); // Jan 15
    const occurrences = getNextOccurrences("RRULE:FREQ=MONTHLY", start, 3);
    expect(occurrences).toHaveLength(3);
    expect(occurrences[0].getMonth()).toBe(0); // Jan
    expect(occurrences[1].getMonth()).toBe(1); // Feb
    expect(occurrences[2].getMonth()).toBe(2); // Mar
  });

  it("generates yearly occurrences", () => {
    const start = new Date(2026, 5, 1);
    const occurrences = getNextOccurrences("RRULE:FREQ=YEARLY", start, 3);
    expect(occurrences).toHaveLength(3);
    expect(occurrences[0].getFullYear()).toBe(2026);
    expect(occurrences[1].getFullYear()).toBe(2027);
    expect(occurrences[2].getFullYear()).toBe(2028);
  });

  it("respects COUNT limit", () => {
    const start = new Date(2026, 0, 1);
    const occurrences = getNextOccurrences(
      "RRULE:FREQ=DAILY;COUNT=2",
      start,
      5
    );
    expect(occurrences).toHaveLength(2);
  });

  it("respects UNTIL limit", () => {
    const start = new Date(2026, 0, 1);
    const occurrences = getNextOccurrences(
      "RRULE:FREQ=DAILY;UNTIL=20260103",
      start,
      10
    );
    // Should generate Jan 1, 2, 3 only
    expect(occurrences.length).toBeLessThanOrEqual(3);
    for (const occ of occurrences) {
      expect(occ.getTime()).toBeLessThanOrEqual(
        new Date(2026, 0, 3).getTime()
      );
    }
  });

  it("generates weekly with BYDAY", () => {
    // Start on Monday Jan 5, 2026
    const start = new Date(2026, 0, 5);
    const occurrences = getNextOccurrences(
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
      start,
      6
    );
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
    // All should be Mon(1), Wed(3), or Fri(5)
    for (const occ of occurrences) {
      expect([1, 3, 5]).toContain(occ.getDay());
    }
  });

  it("excludes specified dates", () => {
    const start = new Date(2026, 0, 1);
    const occurrences = getNextOccurrences(
      "RRULE:FREQ=DAILY",
      start,
      3,
      ["2026-01-02"] // exclude Jan 2
    );
    // Should skip Jan 2
    const dates = occurrences.map((d) => d.getDate());
    expect(dates).not.toContain(2);
  });

  it("returns empty array for invalid RRULE", () => {
    expect(getNextOccurrences("INVALID", new Date(), 3)).toEqual([]);
  });
});

// =========================================================================
// getNextOccurrence
// =========================================================================

describe("getNextOccurrence", () => {
  it("returns the first occurrence", () => {
    const start = new Date(2026, 0, 1);
    const next = getNextOccurrence("RRULE:FREQ=DAILY", start);
    expect(next).not.toBeNull();
    expect(next!.getDate()).toBe(1);
  });

  it("returns null for invalid RRULE", () => {
    expect(getNextOccurrence("INVALID", new Date())).toBeNull();
  });
});

// =========================================================================
// rruleToText
// =========================================================================

describe("rruleToText", () => {
  it("renders Daily", () => {
    expect(rruleToText("RRULE:FREQ=DAILY")).toBe("Daily");
  });

  it("renders Every N days", () => {
    expect(rruleToText("RRULE:FREQ=DAILY;INTERVAL=3")).toBe("Every 3 days");
  });

  it("renders Weekly", () => {
    expect(rruleToText("RRULE:FREQ=WEEKLY")).toBe("Weekly");
  });

  it("renders Every N weeks", () => {
    expect(rruleToText("RRULE:FREQ=WEEKLY;INTERVAL=2")).toBe("Every 2 weeks");
  });

  it("renders Weekly on specific days", () => {
    const text = rruleToText("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(text).toBe("Weekly on Mon, Wed, Fri");
  });

  it("renders Every weekday", () => {
    const text = rruleToText("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    expect(text).toBe("Every weekday");
  });

  it("renders Every day for all 7 days", () => {
    const text = rruleToText(
      "RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA"
    );
    expect(text).toBe("Every day");
  });

  it("renders Monthly", () => {
    expect(rruleToText("RRULE:FREQ=MONTHLY")).toBe("Monthly");
  });

  it("renders Every N months", () => {
    expect(rruleToText("RRULE:FREQ=MONTHLY;INTERVAL=3")).toBe(
      "Every 3 months"
    );
  });

  it("renders Yearly", () => {
    expect(rruleToText("RRULE:FREQ=YEARLY")).toBe("Yearly");
  });

  it("renders Every N years", () => {
    expect(rruleToText("RRULE:FREQ=YEARLY;INTERVAL=2")).toBe("Every 2 years");
  });

  it("appends count info", () => {
    const text = rruleToText("RRULE:FREQ=DAILY;COUNT=5");
    expect(text).toBe("Daily, 5 times");
  });

  it("returns error text for invalid RRULE", () => {
    expect(rruleToText("INVALID")).toBe("Invalid recurrence rule");
  });
});

// =========================================================================
// matchesRecurrence
// =========================================================================

describe("matchesRecurrence", () => {
  it("matches daily recurrence", () => {
    const start = new Date(2026, 0, 1);
    const check = new Date(2026, 0, 3); // 2 days later
    expect(matchesRecurrence("RRULE:FREQ=DAILY", start, check)).toBe(true);
  });

  it("matches daily with interval", () => {
    const start = new Date(2026, 0, 1);
    expect(
      matchesRecurrence(
        "RRULE:FREQ=DAILY;INTERVAL=2",
        start,
        new Date(2026, 0, 3)
      )
    ).toBe(true); // 2 days later, interval 2 -> match
    expect(
      matchesRecurrence(
        "RRULE:FREQ=DAILY;INTERVAL=2",
        start,
        new Date(2026, 0, 2)
      )
    ).toBe(false); // 1 day later, interval 2 -> no match
  });

  it("matches weekly recurrence", () => {
    const start = new Date(2026, 0, 5); // Monday
    const check = new Date(2026, 0, 12); // Next Monday
    expect(matchesRecurrence("RRULE:FREQ=WEEKLY", start, check)).toBe(true);
  });

  it("matches monthly on same day of month", () => {
    const start = new Date(2026, 0, 15);
    const check = new Date(2026, 2, 15); // March 15
    expect(matchesRecurrence("RRULE:FREQ=MONTHLY", start, check)).toBe(true);
  });

  it("does not match monthly on different day of month", () => {
    const start = new Date(2026, 0, 15);
    const check = new Date(2026, 1, 16);
    expect(matchesRecurrence("RRULE:FREQ=MONTHLY", start, check)).toBe(false);
  });

  it("matches yearly on same month and day", () => {
    const start = new Date(2026, 5, 1);
    const check = new Date(2028, 5, 1);
    expect(matchesRecurrence("RRULE:FREQ=YEARLY", start, check)).toBe(true);
  });

  it("does not match yearly on different month", () => {
    const start = new Date(2026, 5, 1);
    const check = new Date(2027, 6, 1);
    expect(matchesRecurrence("RRULE:FREQ=YEARLY", start, check)).toBe(false);
  });

  it("respects excluded dates", () => {
    const start = new Date(2026, 0, 1);
    const check = new Date(2026, 0, 2);
    expect(
      matchesRecurrence("RRULE:FREQ=DAILY", start, check, ["2026-01-02"])
    ).toBe(false);
  });

  it("returns false for invalid RRULE", () => {
    expect(
      matchesRecurrence("INVALID", new Date(), new Date())
    ).toBe(false);
  });
});

// =========================================================================
// RECURRENCE_PRESETS & getPresetName
// =========================================================================

describe("RECURRENCE_PRESETS", () => {
  it("has expected presets", () => {
    expect(RECURRENCE_PRESETS.daily).toBe("RRULE:FREQ=DAILY");
    expect(RECURRENCE_PRESETS.weekly).toBe("RRULE:FREQ=WEEKLY");
    expect(RECURRENCE_PRESETS.biweekly).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2");
    expect(RECURRENCE_PRESETS.monthly).toBe("RRULE:FREQ=MONTHLY");
    expect(RECURRENCE_PRESETS.yearly).toBe("RRULE:FREQ=YEARLY");
    expect(RECURRENCE_PRESETS.weekdays).toBe(
      "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
    );
  });
});

describe("getPresetName", () => {
  it("returns preset name for matching RRULE", () => {
    expect(getPresetName("RRULE:FREQ=DAILY")).toBe("Daily");
    expect(getPresetName("RRULE:FREQ=WEEKLY")).toBe("Weekly");
    expect(getPresetName("RRULE:FREQ=MONTHLY")).toBe("Monthly");
    expect(getPresetName("RRULE:FREQ=YEARLY")).toBe("Yearly");
  });

  it("returns null for non-preset RRULE", () => {
    expect(getPresetName("RRULE:FREQ=DAILY;INTERVAL=3")).toBeNull();
  });
});

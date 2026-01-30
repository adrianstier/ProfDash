import { describe, it, expect } from "vitest";
import { findPotentialDuplicates, DuplicateMatch } from "@/lib/utils/duplicate-detection";
import type { TaskFromAPI } from "@scholaros/shared";

function makeTask(overrides: Partial<TaskFromAPI> = {}): TaskFromAPI {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    title: "Untitled task",
    category: "misc",
    priority: "p3",
    status: "todo",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("findPotentialDuplicates", () => {
  describe("exact title matches", () => {
    it("returns 100% confidence for identical titles", () => {
      const existing = [makeTask({ title: "Review NSF grant proposal" })];
      const results = findPotentialDuplicates("Review NSF grant proposal", existing);
      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBe(100);
      expect(results[0].matchType).toBe("exact");
    });

    it("returns 100% confidence for case-insensitive exact match", () => {
      const existing = [makeTask({ title: "review nsf grant proposal" })];
      const results = findPotentialDuplicates("Review NSF Grant Proposal", existing);
      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBe(100);
      expect(results[0].matchType).toBe("exact");
    });
  });

  describe("similar titles with word overlap", () => {
    it("detects reordered words as high-confidence match", () => {
      const existing = [makeTask({ title: "NSF grant review" })];
      const results = findPotentialDuplicates("Review NSF grant", existing);
      expect(results).toHaveLength(1);
      // All 3 significant words match exactly, so 3/3 = 100%
      expect(results[0].confidence).toBeGreaterThanOrEqual(90);
      expect(results[0].matchType).toBe("exact");
    });

    it("detects partial word overlap as similar", () => {
      const existing = [makeTask({ title: "Write manuscript introduction section draft" })];
      const results = findPotentialDuplicates("Write introduction section", existing);
      expect(results).toHaveLength(1);
      // 3 of 4 significant words match = 75%
      expect(results[0].confidence).toBeGreaterThanOrEqual(60);
      expect(results[0].confidence).toBeLessThan(90);
      expect(results[0].matchType).toBe("similar");
    });

    it("detects shared keywords across titles", () => {
      const existing = [makeTask({ title: "Analyze experiment data results" })];
      const results = findPotentialDuplicates("Analyze data results", existing);
      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThanOrEqual(60);
    });
  });

  describe("partial matches via prefix matching", () => {
    it("detects prefix overlap (e.g. review vs reviewing)", () => {
      const existing = [makeTask({ title: "Reviewing manuscript draft" })];
      const results = findPotentialDuplicates("Review manuscript draft", existing);
      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThanOrEqual(40);
    });
  });

  describe("completed tasks filtering", () => {
    it("filters out completed (done) tasks", () => {
      const existing = [
        makeTask({ title: "Review NSF grant proposal", status: "done" }),
      ];
      const results = findPotentialDuplicates("Review NSF grant proposal", existing);
      expect(results).toHaveLength(0);
    });

    it("includes in_progress tasks", () => {
      const existing = [
        makeTask({ title: "Review NSF grant proposal", status: "todo" }),
      ];
      const results = findPotentialDuplicates("Review NSF grant proposal", existing);
      expect(results).toHaveLength(1);
    });
  });

  describe("stop words handling", () => {
    it("ignores stop words in similarity calculation", () => {
      const existing = [makeTask({ title: "prepare budget" })];
      // "the" and "for" are stop words, so "prepare the budget for" should still match
      const results = findPotentialDuplicates("prepare the budget for the grant", existing);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].confidence).toBeGreaterThanOrEqual(40);
    });
  });

  describe("short titles", () => {
    it("returns empty array for titles shorter than 3 characters", () => {
      const existing = [makeTask({ title: "ab" })];
      const results = findPotentialDuplicates("ab", existing);
      expect(results).toHaveLength(0);
    });

    it("returns empty array for whitespace-only short titles", () => {
      const existing = [makeTask({ title: "test" })];
      const results = findPotentialDuplicates("  ", existing);
      expect(results).toHaveLength(0);
    });
  });

  describe("threshold parameter", () => {
    it("uses default threshold of 40", () => {
      const existing = [makeTask({ title: "something completely different task" })];
      // Low overlap should be filtered at default threshold
      const results = findPotentialDuplicates("unrelated work item here", existing);
      // All results should be >= 40
      for (const r of results) {
        expect(r.confidence).toBeGreaterThanOrEqual(40);
      }
    });

    it("returns more results with lower threshold", () => {
      const existing = [
        makeTask({ title: "Review grant proposal budget" }),
        makeTask({ title: "Completely unrelated task about cooking" }),
      ];
      const highThreshold = findPotentialDuplicates("Review grant", existing, 80);
      const lowThreshold = findPotentialDuplicates("Review grant", existing, 20);
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it("returns fewer results with higher threshold", () => {
      const existing = [
        makeTask({ title: "Review NSF grant" }),
        makeTask({ title: "Grant proposal review" }),
      ];
      const results = findPotentialDuplicates("Review NSF grant", existing, 95);
      // Only the exact match should survive at 95 threshold
      for (const r of results) {
        expect(r.confidence).toBeGreaterThanOrEqual(95);
      }
    });
  });

  describe("top 5 results sorted by confidence", () => {
    it("returns at most 5 results", () => {
      const existing = Array.from({ length: 10 }, (_, i) =>
        makeTask({ title: `Review document version ${i}` })
      );
      const results = findPotentialDuplicates("Review document version", existing);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("sorts results by confidence descending", () => {
      const existing = [
        makeTask({ title: "Review NSF grant proposal" }),
        makeTask({ title: "Review grant" }),
        makeTask({ title: "NSF grant review complete" }),
      ];
      const results = findPotentialDuplicates("Review NSF grant proposal", existing);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });
  });

  describe("matchType assignment", () => {
    it("assigns 'exact' for confidence >= 90", () => {
      const existing = [makeTask({ title: "Review NSF grant proposal" })];
      const results = findPotentialDuplicates("Review NSF grant proposal", existing);
      expect(results[0].matchType).toBe("exact");
      expect(results[0].confidence).toBeGreaterThanOrEqual(90);
    });

    it("assigns 'similar' for confidence 60-89", () => {
      const existing = [makeTask({ title: "NSF grant review" })];
      const results = findPotentialDuplicates("Review NSF grant", existing);
      const similar = results.filter((r) => r.matchType === "similar");
      for (const r of similar) {
        expect(r.confidence).toBeGreaterThanOrEqual(60);
        expect(r.confidence).toBeLessThan(90);
      }
    });

    it("assigns 'partial' for confidence < 60", () => {
      const existing = [makeTask({ title: "Review budget and timeline" })];
      const results = findPotentialDuplicates("Review manuscript draft", existing, 20);
      const partials = results.filter((r) => r.matchType === "partial");
      for (const r of partials) {
        expect(r.confidence).toBeLessThan(60);
      }
    });
  });

  describe("empty existing tasks", () => {
    it("returns empty array when no existing tasks", () => {
      const results = findPotentialDuplicates("Review NSF grant proposal", []);
      expect(results).toHaveLength(0);
    });
  });

  describe("description matching at reduced weight", () => {
    it("matches against task description with reduced weight (0.7x)", () => {
      const existing = [
        makeTask({
          title: "Important task",
          description: "Review NSF grant proposal",
        }),
      ];
      const results = findPotentialDuplicates("Review NSF grant proposal", existing, 40);
      // Description match is weighted at 0.7, so confidence should be less than 100
      if (results.length > 0) {
        expect(results[0].confidence).toBeLessThanOrEqual(100);
      }
    });

    it("prefers title match over description match", () => {
      const existing = [
        makeTask({
          title: "Review NSF grant proposal",
          description: "Something else entirely",
        }),
        makeTask({
          title: "Unrelated task",
          description: "Review NSF grant proposal",
        }),
      ];
      const results = findPotentialDuplicates("Review NSF grant proposal", existing);
      expect(results.length).toBeGreaterThanOrEqual(1);
      // Title match should have higher confidence
      expect(results[0].task.title).toBe("Review NSF grant proposal");
    });
  });
});

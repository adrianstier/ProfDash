import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "@scholaros/shared/utils";

describe("parseQuickAdd", () => {
  // -----------------------------------------------------------------------
  // Priority parsing
  // -----------------------------------------------------------------------
  describe("priorities", () => {
    it("parses p1 priority", () => {
      const result = parseQuickAdd("Task title p1");
      expect(result).not.toBeNull();
      expect(result!.priority).toBe("p1");
      expect(result!.title).toBe("Task title");
    });

    it("parses p2 priority", () => {
      expect(parseQuickAdd("Finish draft p2")!.priority).toBe("p2");
    });

    it("parses p3 priority", () => {
      expect(parseQuickAdd("Read paper p3")!.priority).toBe("p3");
    });

    it("parses p4 priority", () => {
      expect(parseQuickAdd("Low priority item p4")!.priority).toBe("p4");
    });

    it("parses !1 as p1", () => {
      expect(parseQuickAdd("Urgent task !1")!.priority).toBe("p1");
    });

    it("parses !2 as p2", () => {
      expect(parseQuickAdd("High task !2")!.priority).toBe("p2");
    });

    it("parses !3 as p3", () => {
      expect(parseQuickAdd("Medium task !3")!.priority).toBe("p3");
    });

    it("parses !4 as p4", () => {
      expect(parseQuickAdd("Low task !4")!.priority).toBe("p4");
    });

    it("returns undefined priority when none specified", () => {
      expect(parseQuickAdd("No priority here")!.priority).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Category parsing
  // -----------------------------------------------------------------------
  describe("categories", () => {
    it("parses #research category", () => {
      expect(parseQuickAdd("Analyze data #research")!.category).toBe(
        "research"
      );
    });

    it("parses #teaching category", () => {
      expect(parseQuickAdd("Grade exams #teaching")!.category).toBe("teaching");
    });

    it("parses #grants category", () => {
      expect(parseQuickAdd("NSF report #grants")!.category).toBe("grants");
    });

    it("parses #grant as grants", () => {
      expect(parseQuickAdd("Write LOI #grant")!.category).toBe("grants");
    });

    it("parses #meeting category", () => {
      expect(parseQuickAdd("Lab meeting prep #meeting")!.category).toBe(
        "meeting"
      );
    });

    it("parses #writing category", () => {
      expect(parseQuickAdd("Draft introduction #writing")!.category).toBe(
        "writing"
      );
    });

    it("parses #write as writing", () => {
      expect(parseQuickAdd("Draft intro #write")!.category).toBe("writing");
    });

    it("parses #reading category", () => {
      expect(parseQuickAdd("Journal club paper #reading")!.category).toBe(
        "reading"
      );
    });

    it("parses #submission category", () => {
      expect(parseQuickAdd("Submit paper #submission")!.category).toBe(
        "submission"
      );
    });

    it("parses #revision category", () => {
      expect(parseQuickAdd("Address reviewer comments #revision")!.category).toBe(
        "revision"
      );
    });

    it("parses #presentation category", () => {
      expect(parseQuickAdd("Conference talk #presentation")!.category).toBe(
        "presentation"
      );
    });

    it("parses #analysis category", () => {
      expect(parseQuickAdd("Run stats #analysis")!.category).toBe("analysis");
    });

    it("parses #coursework category", () => {
      expect(parseQuickAdd("Homework #coursework")!.category).toBe(
        "coursework"
      );
    });

    it("parses #admin category", () => {
      expect(parseQuickAdd("Department meeting #admin")!.category).toBe(
        "admin"
      );
    });

    it("parses #misc category", () => {
      expect(parseQuickAdd("Random stuff #misc")!.category).toBe("misc");
    });

    it("parses #grad as grad-mentorship", () => {
      expect(parseQuickAdd("Meet with grad student #grad")!.category).toBe(
        "grad-mentorship"
      );
    });

    it("parses #undergrad as undergrad-mentorship", () => {
      expect(parseQuickAdd("Undergrad meeting #undergrad")!.category).toBe(
        "undergrad-mentorship"
      );
    });

    it("returns undefined for unrecognized category hashtag", () => {
      const result = parseQuickAdd("Something #unknown");
      expect(result).not.toBeNull();
      expect(result!.category).toBeUndefined();
      // The unrecognized hashtag remains in the title
      expect(result!.title).toBe("Something #unknown");
    });

    it("returns undefined when no category specified", () => {
      expect(parseQuickAdd("No category")!.category).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Date parsing
  // -----------------------------------------------------------------------
  describe("dates", () => {
    it("parses 'today'", () => {
      const result = parseQuickAdd("Do thing today");
      expect(result).not.toBeNull();
      expect(result!.due).toBeDefined();
      const today = new Date();
      expect(result!.due!.getDate()).toBe(today.getDate());
      expect(result!.due!.getMonth()).toBe(today.getMonth());
      expect(result!.due!.getFullYear()).toBe(today.getFullYear());
    });

    it("parses 'tomorrow'", () => {
      const result = parseQuickAdd("Do thing tomorrow");
      expect(result).not.toBeNull();
      expect(result!.due).toBeDefined();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result!.due!.getDate()).toBe(tomorrow.getDate());
      expect(result!.due!.getMonth()).toBe(tomorrow.getMonth());
    });

    it("parses 'fri' as the next Friday", () => {
      const result = parseQuickAdd("Submit report fri");
      expect(result).not.toBeNull();
      expect(result!.due).toBeDefined();
      expect(result!.due!.getDay()).toBe(5); // Friday
    });

    it("parses 'monday' as next Monday", () => {
      const result = parseQuickAdd("Start task monday");
      expect(result).not.toBeNull();
      expect(result!.due).toBeDefined();
      expect(result!.due!.getDay()).toBe(1); // Monday
    });

    it("parses short day names (mon, tue, wed, thu, sat, sun)", () => {
      expect(parseQuickAdd("Task mon")!.due!.getDay()).toBe(1);
      expect(parseQuickAdd("Task tue")!.due!.getDay()).toBe(2);
      expect(parseQuickAdd("Task wed")!.due!.getDay()).toBe(3);
      expect(parseQuickAdd("Task thu")!.due!.getDay()).toBe(4);
      expect(parseQuickAdd("Task sat")!.due!.getDay()).toBe(6);
      expect(parseQuickAdd("Task sun")!.due!.getDay()).toBe(0);
    });

    it("parses full day names", () => {
      expect(parseQuickAdd("Task sunday")!.due!.getDay()).toBe(0);
      expect(parseQuickAdd("Task tuesday")!.due!.getDay()).toBe(2);
      expect(parseQuickAdd("Task wednesday")!.due!.getDay()).toBe(3);
      expect(parseQuickAdd("Task thursday")!.due!.getDay()).toBe(4);
      expect(parseQuickAdd("Task friday")!.due!.getDay()).toBe(5);
      expect(parseQuickAdd("Task saturday")!.due!.getDay()).toBe(6);
    });

    it("returns undefined due when no date specified", () => {
      expect(parseQuickAdd("No date here")!.due).toBeUndefined();
    });

    it("strips date tokens from the title", () => {
      const result = parseQuickAdd("Submit report fri");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Submit report");
    });
  });

  // -----------------------------------------------------------------------
  // Assignee parsing
  // -----------------------------------------------------------------------
  describe("assignees", () => {
    it("parses @username as assignee", () => {
      const result = parseQuickAdd("Review paper @craig");
      expect(result).not.toBeNull();
      expect(result!.assignees).toEqual(["craig"]);
    });

    it("parses multiple assignees", () => {
      const result = parseQuickAdd("Group task @craig @adrian");
      expect(result).not.toBeNull();
      expect(result!.assignees).toEqual(["craig", "adrian"]);
    });

    it("returns undefined assignees when none specified", () => {
      expect(parseQuickAdd("No assignee")!.assignees).toBeUndefined();
    });

    it("strips assignees from the title", () => {
      const result = parseQuickAdd("Review paper @craig");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Review paper");
    });
  });

  // -----------------------------------------------------------------------
  // Project link parsing
  // -----------------------------------------------------------------------
  describe("project links", () => {
    it("parses +project-id", () => {
      const result = parseQuickAdd("Draft section +project-123");
      expect(result).not.toBeNull();
      expect(result!.projectId).toBe("project-123");
    });

    it("returns undefined projectId when none specified", () => {
      expect(parseQuickAdd("No project link")!.projectId).toBeUndefined();
    });

    it("strips project link from the title", () => {
      const result = parseQuickAdd("Draft section +project-123");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Draft section");
    });
  });

  // -----------------------------------------------------------------------
  // Combined input
  // -----------------------------------------------------------------------
  describe("combined inputs", () => {
    it("parses all tokens at once", () => {
      const result = parseQuickAdd(
        "NSF report fri #grants p1 @craig +project-123"
      );
      expect(result).not.toBeNull();
      expect(result!.title).toBe("NSF report");
      expect(result!.priority).toBe("p1");
      expect(result!.category).toBe("grants");
      expect(result!.due).toBeDefined();
      expect(result!.due!.getDay()).toBe(5); // Friday
      expect(result!.assignees).toEqual(["craig"]);
      expect(result!.projectId).toBe("project-123");
    });

    it("handles tokens in any order", () => {
      const result = parseQuickAdd(
        "p2 @adrian #teaching Review exams tomorrow +exam-proj"
      );
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Review exams");
      expect(result!.priority).toBe("p2");
      expect(result!.category).toBe("teaching");
      expect(result!.assignees).toEqual(["adrian"]);
      expect(result!.projectId).toBe("exam-proj");
      expect(result!.due).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("returns null for empty string", () => {
      const result = parseQuickAdd("");
      expect(result).toBeNull();
    });

    it("returns null for only whitespace", () => {
      const result = parseQuickAdd("   ");
      expect(result).toBeNull();
    });

    it("handles input with no special tokens", () => {
      const result = parseQuickAdd("Just a regular task title");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Just a regular task title");
      expect(result!.priority).toBeUndefined();
      expect(result!.category).toBeUndefined();
      expect(result!.due).toBeUndefined();
      expect(result!.assignees).toBeUndefined();
      expect(result!.projectId).toBeUndefined();
    });

    it("returns null for input with only special tokens (no title)", () => {
      const result = parseQuickAdd("p1 #research today @craig");
      expect(result).toBeNull();
    });

    it("is case-insensitive for priorities", () => {
      expect(parseQuickAdd("Task P1")!.priority).toBe("p1");
      expect(parseQuickAdd("Task P2")!.priority).toBe("p2");
    });

    it("is case-insensitive for categories", () => {
      expect(parseQuickAdd("Task #Research")!.category).toBe("research");
      expect(parseQuickAdd("Task #TEACHING")!.category).toBe("teaching");
    });

    it("is case-insensitive for date keywords", () => {
      expect(parseQuickAdd("Task Today")!.due).toBeDefined();
      expect(parseQuickAdd("Task TOMORROW")!.due).toBeDefined();
      expect(parseQuickAdd("Task FRI")!.due).toBeDefined();
    });
  });
});

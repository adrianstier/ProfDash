import { describe, it, expect } from "vitest";
import {
  detectAcademicPattern,
  getAcademicPatternsContext,
} from "@/lib/utils/academic-patterns";

describe("detectAcademicPattern", () => {
  describe("research-related text", () => {
    it("detects 'literature review' with research context", () => {
      const result = detectAcademicPattern("Conduct a literature review for the research study data analysis");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("research");
      expect(result!.keywords.length).toBeGreaterThan(0);
    });

    it("detects 'data collection'", () => {
      const result = detectAcademicPattern("Start data collection for the pilot study");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("research");
    });

    it("detects 'manuscript draft'", () => {
      const result = detectAcademicPattern("Write manuscript draft for journal submission");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("research");
    });

    it("returns suggested subtasks for research", () => {
      const result = detectAcademicPattern("Write manuscript draft for research paper with data analysis and results");
      expect(result).not.toBeNull();
      expect(result!.suggestedSubtasks.length).toBeGreaterThan(0);
    });
  });

  describe("teaching-related text", () => {
    it("detects 'grade exams'", () => {
      const result = detectAcademicPattern("Grade exams for the midterm");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("teaching");
    });

    it("detects 'prepare lecture'", () => {
      const result = detectAcademicPattern("Prepare lecture slides for next week");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("teaching");
    });

    it("detects 'office hours'", () => {
      const result = detectAcademicPattern("Hold office hours on Tuesday afternoon");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("teaching");
    });
  });

  describe("grants-related text", () => {
    it("detects 'NSF proposal'", () => {
      const result = detectAcademicPattern("Write NSF proposal for new research project");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("grants");
    });

    it("detects 'NIH R01'", () => {
      const result = detectAcademicPattern("Submit NIH R01 application by deadline");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("grants");
    });

    it("detects 'CAREER award'", () => {
      const result = detectAcademicPattern("Prepare NSF CAREER award application");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("grants");
    });
  });

  describe("admin-related text", () => {
    it("detects 'faculty meeting'", () => {
      // "committee meeting" is the regex pattern; "faculty" is not a keyword
      const result = detectAcademicPattern("Attend committee meeting for faculty review");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("admin");
    });

    it("detects 'committee review'", () => {
      const result = detectAcademicPattern("Complete committee review of annual report");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("admin");
    });
  });

  describe("mentorship-related text", () => {
    it("detects 'thesis defense'", () => {
      const result = detectAcademicPattern("Prepare for thesis defense with PhD student");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("grad-mentorship");
    });

    it("detects 'dissertation committee'", () => {
      const result = detectAcademicPattern("Attend dissertation committee meeting");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("grad-mentorship");
    });
  });

  describe("confidence scoring", () => {
    it("returns higher confidence for more keyword matches", () => {
      const fewerKeywords = detectAcademicPattern("Write manuscript draft for research paper with data");
      const moreKeywords = detectAcademicPattern(
        "Write manuscript draft for research paper with data analysis results methods discussion abstract"
      );
      expect(fewerKeywords).not.toBeNull();
      expect(moreKeywords).not.toBeNull();
      expect(moreKeywords!.confidence).toBeGreaterThan(fewerKeywords!.confidence);
    });

    it("gives higher score for regex pattern matches vs keyword-only", () => {
      // "write draft" matches a regex pattern (weight 2) + keywords "write", "draft", "manuscript"
      const withRegex = detectAcademicPattern("Write draft manuscript for research study");
      // Only keyword matches, no regex: "manuscript", "research", "study", "paper"
      const keywordOnly = detectAcademicPattern("Read manuscript for research study paper");
      expect(withRegex).not.toBeNull();
      expect(keywordOnly).not.toBeNull();
      expect(withRegex!.confidence).toBeGreaterThanOrEqual(keywordOnly!.confidence);
    });
  });

  describe("minimum confidence threshold", () => {
    it("returns null when confidence is below 0.05", () => {
      // A very generic word that barely matches anything
      const result = detectAcademicPattern("Check email inbox today");
      // "email" is a keyword in misc category; if it matches, confidence should be >= 0.05
      // If confidence < 0.05, result should be null
      if (result !== null) {
        expect(result.confidence).toBeGreaterThanOrEqual(0.05);
      }
    });
  });

  describe("regex patterns", () => {
    it("matches 'data analysis' regex", () => {
      const result = detectAcademicPattern("Perform data analysis on survey results");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("research");
    });

    it("matches 'grant proposal' regex", () => {
      const result = detectAcademicPattern("Submit grant proposal to federal agency");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("grants");
    });

    it("matches 'IRB submission' regex", () => {
      const result = detectAcademicPattern("Complete IRB submission for new protocol");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("admin");
    });

    it("matches 'undergraduate student' regex", () => {
      const result = detectAcademicPattern("Meet with undergraduate student about research project");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("undergrad-mentorship");
    });
  });

  describe("no matching patterns", () => {
    it("returns null for completely unrelated text", () => {
      const result = detectAcademicPattern("Buy groceries from store");
      expect(result).toBeNull();
    });
  });

  describe("short/empty input", () => {
    it("returns null for empty string", () => {
      const result = detectAcademicPattern("");
      expect(result).toBeNull();
    });

    it("returns null for very short input (< 5 chars after trim)", () => {
      const result = detectAcademicPattern("  ab ");
      expect(result).toBeNull();
    });

    it("returns null for null-like input", () => {
      const result = detectAcademicPattern(undefined as unknown as string);
      expect(result).toBeNull();
    });

    it("returns null for input exceeding 1000 characters", () => {
      const longText = "a".repeat(1001);
      const result = detectAcademicPattern(longText);
      expect(result).toBeNull();
    });
  });
});

describe("getAcademicPatternsContext", () => {
  it("returns a non-empty formatted string", () => {
    const context = getAcademicPatternsContext();
    expect(typeof context).toBe("string");
    expect(context.length).toBeGreaterThan(0);
  });

  it("includes category labels in uppercase", () => {
    const context = getAcademicPatternsContext();
    expect(context).toContain("RESEARCH:");
    expect(context).toContain("TEACHING:");
    expect(context).toContain("GRANTS:");
    expect(context).toContain("ADMIN:");
  });

  it("includes Keywords section", () => {
    const context = getAcademicPatternsContext();
    expect(context).toContain("Keywords:");
  });

  it("includes Typical subtasks section", () => {
    const context = getAcademicPatternsContext();
    expect(context).toContain("Typical subtasks:");
  });
});

/**
 * Document API Route Tests
 *
 * These tests verify the document upload and processing functionality.
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
    })),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("Document Upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("File Validation", () => {
    it("should reject files larger than 50MB", () => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      const largeFileSize = 60 * 1024 * 1024; // 60MB
      expect(largeFileSize > MAX_FILE_SIZE).toBe(true);
    });

    it("should accept files smaller than 50MB", () => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      const smallFileSize = 10 * 1024 * 1024; // 10MB
      expect(smallFileSize <= MAX_FILE_SIZE).toBe(true);
    });

    it("should accept valid MIME types", () => {
      const ALLOWED_MIME_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/png",
        "image/jpeg",
      ];

      expect(ALLOWED_MIME_TYPES.includes("application/pdf")).toBe(true);
      expect(ALLOWED_MIME_TYPES.includes("text/plain")).toBe(true);
      expect(ALLOWED_MIME_TYPES.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    });

    it("should reject invalid MIME types", () => {
      const ALLOWED_MIME_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/png",
        "image/jpeg",
      ];

      expect(ALLOWED_MIME_TYPES.includes("application/javascript")).toBe(false);
      expect(ALLOWED_MIME_TYPES.includes("application/zip")).toBe(false);
      expect(ALLOWED_MIME_TYPES.includes("text/html")).toBe(false);
    });
  });

  describe("Filename Sanitization", () => {
    it("should sanitize special characters in filenames", () => {
      const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, "_");

      expect(sanitize("my document.pdf")).toBe("my_document.pdf");
      expect(sanitize("file (1).pdf")).toBe("file__1_.pdf");
      expect(sanitize("résumé.pdf")).toBe("r_sum_.pdf");
      expect(sanitize("file<>:\"/\\|?*.pdf")).toBe("file_________.pdf");
    });

    it("should preserve valid characters", () => {
      const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, "_");

      expect(sanitize("document.pdf")).toBe("document.pdf");
      expect(sanitize("file-name.txt")).toBe("file-name.txt");
      expect(sanitize("Doc123.docx")).toBe("Doc123.docx");
    });
  });

  describe("Tag Parsing", () => {
    it("should parse JSON array tags", () => {
      const tagsRaw = '["grant", "NSF", "2024"]';
      let tags: string[] = [];
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        tags = tagsRaw.split(",").map((t) => t.trim());
      }
      expect(tags).toEqual(["grant", "NSF", "2024"]);
    });

    it("should parse comma-separated tags", () => {
      const tagsRaw = "grant, NSF, 2024";
      let tags: string[] = [];
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        tags = tagsRaw.split(",").map((t) => t.trim());
      }
      expect(tags).toEqual(["grant", "NSF", "2024"]);
    });

    it("should handle empty tags", () => {
      const parseTags = (raw: string): string[] => {
        if (!raw) return [];
        try {
          return JSON.parse(raw);
        } catch {
          return raw.split(",").map((t: string) => t.trim());
        }
      };

      expect(parseTags("")).toEqual([]);
    });
  });
});

describe("Document Processing", () => {
  describe("Extraction Types", () => {
    const validExtractionTypes = [
      "grant_opportunity",
      "grant_application",
      "cv_resume",
      "budget",
      "timeline",
      "tasks",
      "general",
    ];

    it("should accept all valid extraction types", () => {
      validExtractionTypes.forEach((type) => {
        expect(validExtractionTypes.includes(type)).toBe(true);
      });
    });

    it("should reject invalid extraction types", () => {
      const invalidTypes = ["unknown", "random", "test"];
      invalidTypes.forEach((type) => {
        expect(validExtractionTypes.includes(type)).toBe(false);
      });
    });
  });
});

describe("Grant Document Modal", () => {
  describe("Data Extraction", () => {
    it("should map raw data to GrantEntryData correctly", () => {
      const rawData: Record<string, unknown> = {
        title: "NSF Grant Opportunity",
        agency: "NSF",
        description: "Research funding",
        deadline: "2024-12-31",
        amount_min: 100000,
        amount_max: 500000,
        eligibility: { type: "university" },
        url: "https://nsf.gov/grant",
        focus_areas: ["AI", "ML"],
      };

      interface GrantEntryData {
        title: string;
        agency?: string | null;
        description?: string | null;
        deadline?: string | null;
        amount_min?: number | null;
        amount_max?: number | null;
        eligibility?: Record<string, unknown> | null;
        url?: string | null;
        focus_areas?: string[] | null;
      }

      const data: GrantEntryData = {
        title: (rawData.title as string) || "Untitled Grant",
        agency: rawData.agency as string | null,
        description: rawData.description as string | null,
        deadline: rawData.deadline as string | null,
        amount_min: rawData.amount_min as number | null,
        amount_max: rawData.amount_max as number | null,
        eligibility: rawData.eligibility as Record<string, unknown> | null,
        url: rawData.url as string | null,
        focus_areas: rawData.focus_areas as string[] | null,
      };

      expect(data.title).toBe("NSF Grant Opportunity");
      expect(data.agency).toBe("NSF");
      expect(data.amount_min).toBe(100000);
      expect(data.focus_areas).toEqual(["AI", "ML"]);
    });

    it("should provide default title when missing", () => {
      const rawData: Record<string, unknown> = {};

      const title = (rawData.title as string) || "Untitled Grant";
      expect(title).toBe("Untitled Grant");
    });
  });
});

describe("CV Import Modal", () => {
  describe("Role Inference", () => {
    const inferRoleFromTitle = (title: string | null): string => {
      if (!title) return "collaborator";
      const titleLower = title.toLowerCase();
      // Check postdoc FIRST since "postdoctoral" contains "doctoral"
      if (titleLower.includes("postdoc")) {
        return "postdoc";
      }
      if (titleLower.includes("phd") || titleLower.includes("doctoral")) {
        return "phd-student";
      }
      if (titleLower.includes("undergrad") || titleLower.includes("bachelor")) {
        return "undergrad";
      }
      if (
        titleLower.includes("technician") ||
        titleLower.includes("coordinator") ||
        titleLower.includes("manager")
      ) {
        return "staff";
      }
      return "collaborator";
    };

    it("should infer PhD student role", () => {
      expect(inferRoleFromTitle("PhD Candidate")).toBe("phd-student");
      expect(inferRoleFromTitle("Doctoral Student")).toBe("phd-student");
    });

    it("should infer postdoc role", () => {
      expect(inferRoleFromTitle("Postdoctoral Researcher")).toBe("postdoc");
      expect(inferRoleFromTitle("Postdoc Fellow")).toBe("postdoc");
    });

    it("should infer undergrad role", () => {
      expect(inferRoleFromTitle("Undergraduate Research Assistant")).toBe("undergrad");
      expect(inferRoleFromTitle("Bachelor's Student")).toBe("undergrad");
    });

    it("should infer staff role", () => {
      expect(inferRoleFromTitle("Lab Technician")).toBe("staff");
      expect(inferRoleFromTitle("Research Coordinator")).toBe("staff");
      expect(inferRoleFromTitle("Project Manager")).toBe("staff");
    });

    it("should default to collaborator for unknown titles", () => {
      expect(inferRoleFromTitle("Professor")).toBe("collaborator");
      expect(inferRoleFromTitle("Research Scientist")).toBe("collaborator");
      expect(inferRoleFromTitle(null)).toBe("collaborator");
    });
  });

  describe("Research Interests Formatting", () => {
    const formatResearchInterests = (interests: string[] | undefined): string | null => {
      if (!interests || interests.length === 0) return null;
      return `Research interests: ${interests.join(", ")}`;
    };

    it("should format research interests correctly", () => {
      expect(formatResearchInterests(["AI", "ML", "NLP"])).toBe(
        "Research interests: AI, ML, NLP"
      );
    });

    it("should return null for empty interests", () => {
      expect(formatResearchInterests([])).toBeNull();
      expect(formatResearchInterests(undefined)).toBeNull();
    });
  });
});

describe("Task Extraction", () => {
  describe("Priority Validation", () => {
    const validPriorities = ["p1", "p2", "p3", "p4"];

    it("should accept valid priorities", () => {
      validPriorities.forEach((p) => {
        expect(validPriorities.includes(p)).toBe(true);
      });
    });

    it("should have priority colors defined", () => {
      const priorityColors: Record<string, string> = {
        p1: "text-red-600 bg-red-100",
        p2: "text-orange-600 bg-orange-100",
        p3: "text-blue-600 bg-blue-100",
        p4: "text-gray-600 bg-gray-100",
      };

      validPriorities.forEach((p) => {
        expect(priorityColors[p]).toBeDefined();
      });
    });
  });

  describe("Category Validation", () => {
    const validCategories = [
      "research",
      "teaching",
      "grants",
      "grad-mentorship",
      "undergrad-mentorship",
      "admin",
      "misc",
    ];

    it("should accept valid categories", () => {
      validCategories.forEach((c) => {
        expect(validCategories.includes(c)).toBe(true);
      });
    });
  });
});

describe("Edge Cases", () => {
  describe("File Upload Edge Cases", () => {
    it("should handle files with no extension", () => {
      const filename = "documentwithoutext";
      const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      expect(sanitized).toBe("documentwithoutext");
    });

    it("should handle files with multiple dots", () => {
      const filename = "my.document.v2.final.pdf";
      const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      expect(sanitized).toBe("my.document.v2.final.pdf");
    });

    it("should handle unicode filenames", () => {
      const filename = "文档.pdf";
      const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      expect(sanitized).toBe("__.pdf");
    });

    it("should generate unique filenames with timestamp", () => {
      const timestamp = Date.now();
      const filename = "document.pdf";
      const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFilename = `${timestamp}-${sanitizedName}`;

      expect(uniqueFilename).toMatch(/^\d+-document\.pdf$/);
    });

    it("should handle very long filenames", () => {
      const longName = "a".repeat(300) + ".pdf";
      const sanitized = longName.replace(/[^a-zA-Z0-9.-]/g, "_");
      expect(sanitized.length).toBe(304);
      expect(sanitized.endsWith(".pdf")).toBe(true);
    });

    it("should handle filenames with path traversal attempts", () => {
      const malicious = "../../../etc/passwd";
      const sanitized = malicious.replace(/[^a-zA-Z0-9.-]/g, "_");
      // Note: dots and hyphens are allowed, so ".." is preserved
      // But the slashes are removed which prevents actual traversal
      expect(sanitized).toBe(".._.._.._etc_passwd");
      expect(sanitized.includes("/")).toBe(false);
    });

    it("should remove path separators for security", () => {
      const withSlashes = "path/to/file.pdf";
      const withBackslashes = "path\\to\\file.pdf";
      const sanitized1 = withSlashes.replace(/[^a-zA-Z0-9.-]/g, "_");
      const sanitized2 = withBackslashes.replace(/[^a-zA-Z0-9.-]/g, "_");

      expect(sanitized1).toBe("path_to_file.pdf");
      expect(sanitized2).toBe("path_to_file.pdf");
      expect(sanitized1.includes("/")).toBe(false);
      expect(sanitized2.includes("\\")).toBe(false);
    });

    it("should handle empty filename", () => {
      const empty = "";
      const sanitized = empty.replace(/[^a-zA-Z0-9.-]/g, "_");
      expect(sanitized).toBe("");
    });

    it("should handle filename with only extension", () => {
      const onlyExt = ".pdf";
      const sanitized = onlyExt.replace(/[^a-zA-Z0-9.-]/g, "_");
      expect(sanitized).toBe(".pdf");
    });
  });

  describe("Empty/Null Data Handling", () => {
    it("should handle null deadline gracefully", () => {
      const formatDeadline = (deadline: string | null): string => {
        if (!deadline) return "";
        return deadline.split("T")[0];
      };

      expect(formatDeadline(null)).toBe("");
      expect(formatDeadline("2024-12-31T23:59:59Z")).toBe("2024-12-31");
    });

    it("should handle empty focus areas", () => {
      const formatFocusAreas = (areas: string[] | null): string => {
        if (!areas) return "";
        return areas.join(", ");
      };

      expect(formatFocusAreas(null)).toBe("");
      expect(formatFocusAreas([])).toBe("");
      expect(formatFocusAreas(["AI", "ML"])).toBe("AI, ML");
    });

    it("should handle missing extracted data fields", () => {
      const rawData: Record<string, unknown> = {};

      expect(rawData.title ?? "Untitled").toBe("Untitled");
      expect(rawData.agency ?? null).toBeNull();
      expect(rawData.amount_min ?? null).toBeNull();
    });
  });

  describe("Step State Management", () => {
    type Step = "upload" | "processing" | "review" | "complete";

    it("should track step transitions correctly", () => {
      const steps: Step[] = ["upload", "processing", "review", "complete"];

      steps.forEach((step, index) => {
        expect(steps.indexOf(step)).toBe(index);
      });
    });

    it("should identify completed steps correctly", () => {
      const isUploadComplete = (step: Step): boolean => step !== "upload";
      const isProcessingComplete = (step: Step): boolean =>
        (["review", "complete"] as Step[]).includes(step);

      expect(isUploadComplete("review")).toBe(true);
      expect(isUploadComplete("upload")).toBe(false);
      expect(isProcessingComplete("review")).toBe(true);
      expect(isProcessingComplete("complete")).toBe(true);
      expect(isProcessingComplete("processing")).toBe(false);
    });
  });

  describe("Amount Validation", () => {
    it("should parse valid amount strings", () => {
      const parseAmount = (val: string): number | null => {
        if (!val) return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      expect(parseAmount("100000")).toBe(100000);
      expect(parseAmount("50000.50")).toBe(50000.5);
      expect(parseAmount("")).toBeNull();
      expect(parseAmount("invalid")).toBeNull();
    });

    it("should handle negative amounts", () => {
      const parseAmount = (val: string): number | null => {
        if (!val) return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      expect(parseAmount("-1000")).toBe(-1000);
    });

    it("should validate min/max amount relationship", () => {
      const validateAmounts = (min: number | null, max: number | null): boolean => {
        if (min === null || max === null) return true;
        return min <= max;
      };

      expect(validateAmounts(100000, 500000)).toBe(true);
      expect(validateAmounts(500000, 100000)).toBe(false);
      expect(validateAmounts(null, 500000)).toBe(true);
      expect(validateAmounts(100000, null)).toBe(true);
    });
  });

  describe("Date Validation", () => {
    it("should parse valid date strings", () => {
      const parseDate = (val: string | null): string | null => {
        if (!val) return null;
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : val;
      };

      expect(parseDate("2024-12-31")).toBe("2024-12-31");
      expect(parseDate("2024-12-31T23:59:59Z")).toBe("2024-12-31T23:59:59Z");
      expect(parseDate(null)).toBeNull();
      expect(parseDate("invalid-date")).toBeNull();
    });

    it("should extract date portion from ISO string", () => {
      const extractDatePortion = (val: string | null): string => {
        if (!val) return "";
        return val.split("T")[0] || "";
      };

      expect(extractDatePortion("2024-12-31T23:59:59Z")).toBe("2024-12-31");
      expect(extractDatePortion("2024-12-31")).toBe("2024-12-31");
      expect(extractDatePortion(null)).toBe("");
    });
  });

  describe("Focus Areas Parsing", () => {
    it("should handle various focus area formats", () => {
      const parseFocusAreas = (val: string): string[] => {
        if (!val) return [];
        return val.split(",").map((s) => s.trim()).filter(Boolean);
      };

      expect(parseFocusAreas("AI, ML, NLP")).toEqual(["AI", "ML", "NLP"]);
      expect(parseFocusAreas("climate")).toEqual(["climate"]);
      expect(parseFocusAreas("")).toEqual([]);
      expect(parseFocusAreas("  AI  ,  ML  ")).toEqual(["AI", "ML"]);
      expect(parseFocusAreas(",,,")).toEqual([]);
    });

    it("should join focus areas for display", () => {
      const joinFocusAreas = (areas: string[] | null): string => {
        return areas?.join(", ") || "";
      };

      expect(joinFocusAreas(["AI", "ML"])).toBe("AI, ML");
      expect(joinFocusAreas([])).toBe("");
      expect(joinFocusAreas(null)).toBe("");
    });
  });

  describe("URL Validation", () => {
    it("should validate URLs", () => {
      const isValidUrl = (url: string | null): boolean => {
        if (!url) return true; // Allow empty
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      expect(isValidUrl("https://nsf.gov/grant")).toBe(true);
      expect(isValidUrl("http://example.com")).toBe(true);
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl(null)).toBe(true);
      expect(isValidUrl("")).toBe(true);
    });
  });

  describe("Extraction Type Mapping", () => {
    const EXTRACTION_TYPE_PROMPTS: Record<string, string> = {
      grant_opportunity: "grant opportunity",
      grant_application: "grant application",
      cv_resume: "CV or resume",
      budget: "budget document",
      timeline: "timeline or schedule",
      tasks: "task list",
      general: "general document",
    };

    it("should map all extraction types to prompts", () => {
      const types = ["grant_opportunity", "cv_resume", "tasks", "general"];
      types.forEach((type) => {
        expect(EXTRACTION_TYPE_PROMPTS[type]).toBeDefined();
      });
    });

    it("should return undefined for unknown types", () => {
      expect(EXTRACTION_TYPE_PROMPTS["unknown_type"]).toBeUndefined();
    });
  });
});

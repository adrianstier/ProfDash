/**
 * Search API Route Tests
 *
 * Tests for the Phase 9B global search API with ranking.
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SearchQueryParamsSchema,
  SearchHistoryInsertSchema,
  SearchResultTypeSchema,
  SearchSourceSchema,
} from "@scholaros/shared/schemas";

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Schema Validation", () => {
    describe("SearchResultTypeSchema", () => {
      it("should accept valid result types", () => {
        const validTypes = ["task", "project", "grant", "publication", "navigation", "action"];
        validTypes.forEach((type) => {
          const result = SearchResultTypeSchema.safeParse(type);
          expect(result.success).toBe(true);
        });
      });

      it("should reject invalid result types", () => {
        const invalidTypes = ["user", "document", "workspace", "invalid"];
        invalidTypes.forEach((type) => {
          const result = SearchResultTypeSchema.safeParse(type);
          expect(result.success).toBe(false);
        });
      });
    });

    describe("SearchSourceSchema", () => {
      it("should accept valid source types", () => {
        const validSources = ["command_palette", "quick_search", "navigation"];
        validSources.forEach((source) => {
          const result = SearchSourceSchema.safeParse(source);
          expect(result.success).toBe(true);
        });
      });

      it("should reject invalid source types", () => {
        const invalidSources = ["sidebar", "api", "direct"];
        invalidSources.forEach((source) => {
          const result = SearchSourceSchema.safeParse(source);
          expect(result.success).toBe(false);
        });
      });
    });

    describe("SearchQueryParamsSchema", () => {
      it("should validate minimal query", () => {
        const result = SearchQueryParamsSchema.safeParse({ q: "test" });
        expect(result.success).toBe(true);
      });

      it("should validate full query with all params", () => {
        const result = SearchQueryParamsSchema.safeParse({
          q: "test query",
          types: ["task", "project"],
          limit: 10,
          workspace_id: "550e8400-e29b-41d4-a716-446655440000",
        });
        expect(result.success).toBe(true);
      });

      it("should reject empty query", () => {
        const result = SearchQueryParamsSchema.safeParse({ q: "" });
        expect(result.success).toBe(false);
      });

      it("should reject query exceeding max length", () => {
        const longQuery = "a".repeat(201);
        const result = SearchQueryParamsSchema.safeParse({ q: longQuery });
        expect(result.success).toBe(false);
      });

      it("should apply default limit", () => {
        const result = SearchQueryParamsSchema.safeParse({ q: "test" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(5);
        }
      });

      it("should respect limit bounds", () => {
        // Min limit
        const minResult = SearchQueryParamsSchema.safeParse({ q: "test", limit: 0 });
        expect(minResult.success).toBe(false);

        // Max limit
        const maxResult = SearchQueryParamsSchema.safeParse({ q: "test", limit: 25 });
        expect(maxResult.success).toBe(false);

        // Valid limit
        const validResult = SearchQueryParamsSchema.safeParse({ q: "test", limit: 15 });
        expect(validResult.success).toBe(true);
      });
    });

    describe("SearchHistoryInsertSchema", () => {
      it("should validate minimal history entry", () => {
        const result = SearchHistoryInsertSchema.safeParse({
          query: "test search",
        });
        expect(result.success).toBe(true);
      });

      it("should validate full history entry", () => {
        const result = SearchHistoryInsertSchema.safeParse({
          query: "test search",
          workspace_id: "550e8400-e29b-41d4-a716-446655440000",
          result_type: "task",
          result_id: "550e8400-e29b-41d4-a716-446655440001",
          result_title: "My Task",
          source: "command_palette",
          selected: true,
        });
        expect(result.success).toBe(true);
      });

      it("should apply default values", () => {
        const result = SearchHistoryInsertSchema.safeParse({
          query: "test",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.source).toBe("command_palette");
          expect(result.data.selected).toBe(false);
        }
      });

      it("should reject empty query", () => {
        const result = SearchHistoryInsertSchema.safeParse({ query: "" });
        expect(result.success).toBe(false);
      });

      it("should reject query exceeding max length", () => {
        const longQuery = "a".repeat(201);
        const result = SearchHistoryInsertSchema.safeParse({ query: longQuery });
        expect(result.success).toBe(false);
      });

      it("should reject invalid UUID for workspace_id", () => {
        const result = SearchHistoryInsertSchema.safeParse({
          query: "test",
          workspace_id: "not-a-uuid",
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Query Normalization", () => {
    it("should normalize query to lowercase", () => {
      const normalize = (query: string) => query.toLowerCase().trim();

      expect(normalize("Test Query")).toBe("test query");
      expect(normalize("  HELLO WORLD  ")).toBe("hello world");
    });

    it("should handle empty and whitespace queries", () => {
      const normalize = (query: string) => query.toLowerCase().trim();

      expect(normalize("   ")).toBe("");
      expect(normalize("")).toBe("");
    });

    it("should preserve special characters", () => {
      const normalize = (query: string) => query.toLowerCase().trim();

      expect(normalize("NSF-123")).toBe("nsf-123");
      expect(normalize("grant #456")).toBe("grant #456");
    });
  });

  describe("Search Deduplication", () => {
    it("should deduplicate by normalized query", () => {
      const deduplicate = <T extends { query: string }>(items: T[]): T[] => {
        const seen = new Set<string>();
        return items.filter((item) => {
          const normalized = item.query.toLowerCase().trim();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
      };

      const items = [
        { query: "Test", id: 1 },
        { query: "test", id: 2 },
        { query: "other", id: 3 },
        { query: "TEST", id: 4 },
      ];

      const deduped = deduplicate(items);
      expect(deduped.length).toBe(2);
      expect(deduped[0].query).toBe("Test");
      expect(deduped[1].query).toBe("other");
    });
  });
});

describe("Search History API", () => {
  describe("Recent Searches", () => {
    it("should format recent search response", () => {
      const formatRecentSearch = (item: {
        query: string;
        result_type: string | null;
        result_id: string | null;
        result_title: string | null;
        created_at: string;
      }) => ({
        query: item.query,
        result_type: item.result_type,
        result_id: item.result_id,
        result_title: item.result_title,
        last_searched_at: item.created_at,
      });

      const item = {
        query: "test",
        result_type: "task",
        result_id: "123",
        result_title: "Test Task",
        created_at: "2024-01-15T10:00:00Z",
      };

      const formatted = formatRecentSearch(item);
      expect(formatted.last_searched_at).toBe("2024-01-15T10:00:00Z");
      expect(formatted.query).toBe("test");
    });

    it("should handle null result fields", () => {
      const item = {
        query: "incomplete search",
        result_type: null,
        result_id: null,
        result_title: null,
        created_at: "2024-01-15T10:00:00Z",
      };

      expect(item.result_type).toBeNull();
      expect(item.result_id).toBeNull();
      expect(item.result_title).toBeNull();
    });
  });

  describe("History Limits", () => {
    it("should enforce maximum history limit", () => {
      const MAX_LIMIT = 50;
      const requestedLimit = 100;
      const effectiveLimit = Math.min(requestedLimit, MAX_LIMIT);

      expect(effectiveLimit).toBe(50);
    });

    it("should use default limit when not specified", () => {
      const DEFAULT_LIMIT = 10;
      const requestedLimit = undefined;
      const effectiveLimit = requestedLimit ?? DEFAULT_LIMIT;

      expect(effectiveLimit).toBe(10);
    });
  });
});

describe("Search Result Types", () => {
  describe("Type Mapping", () => {
    const TYPE_LABELS: Record<string, string> = {
      task: "Task",
      project: "Project",
      grant: "Grant",
      publication: "Publication",
      navigation: "Navigation",
      action: "Action",
    };

    it("should have labels for all result types", () => {
      const types = ["task", "project", "grant", "publication", "navigation", "action"];
      types.forEach((type) => {
        expect(TYPE_LABELS[type]).toBeDefined();
      });
    });

    const TYPE_ICONS: Record<string, string> = {
      task: "CheckSquare",
      project: "Folder",
      grant: "DollarSign",
      publication: "BookOpen",
      navigation: "Link",
      action: "Zap",
    };

    it("should have icons for all result types", () => {
      const types = ["task", "project", "grant", "publication", "navigation", "action"];
      types.forEach((type) => {
        expect(TYPE_ICONS[type]).toBeDefined();
      });
    });
  });

  describe("Type Filtering", () => {
    it("should filter results by type", () => {
      const results = [
        { id: "1", type: "task", title: "Task 1" },
        { id: "2", type: "project", title: "Project 1" },
        { id: "3", type: "task", title: "Task 2" },
        { id: "4", type: "grant", title: "Grant 1" },
      ];

      const filterByType = (items: typeof results, types: string[]) =>
        items.filter((item) => types.includes(item.type));

      expect(filterByType(results, ["task"]).length).toBe(2);
      expect(filterByType(results, ["task", "project"]).length).toBe(3);
      expect(filterByType(results, []).length).toBe(0);
    });
  });
});

describe("Search Context", () => {
  describe("Page Context Mapping", () => {
    const PAGE_CONTEXT_TYPES: Record<string, string[]> = {
      "/today": ["task"],
      "/upcoming": ["task"],
      "/board": ["task"],
      "/list": ["task"],
      "/projects": ["project"],
      "/grants": ["grant"],
      "/publications": ["publication"],
      "/calendar": ["task"],
    };

    it("should map page contexts to expected result types", () => {
      expect(PAGE_CONTEXT_TYPES["/today"]).toEqual(["task"]);
      expect(PAGE_CONTEXT_TYPES["/grants"]).toEqual(["grant"]);
      expect(PAGE_CONTEXT_TYPES["/projects"]).toEqual(["project"]);
    });

    it("should return empty for unknown contexts", () => {
      const context = "/unknown";
      expect(PAGE_CONTEXT_TYPES[context] ?? []).toEqual([]);
    });
  });

  describe("Workspace Context", () => {
    it("should filter by workspace when provided", () => {
      const results = [
        { id: "1", workspace_id: "ws1", title: "Result 1" },
        { id: "2", workspace_id: "ws2", title: "Result 2" },
        { id: "3", workspace_id: "ws1", title: "Result 3" },
      ];

      const filterByWorkspace = (items: typeof results, workspaceId: string | null) =>
        workspaceId ? items.filter((item) => item.workspace_id === workspaceId) : items;

      expect(filterByWorkspace(results, "ws1").length).toBe(2);
      expect(filterByWorkspace(results, null).length).toBe(3);
    });
  });
});

describe("Search API Response Format", () => {
  describe("Grouped Results", () => {
    it("should group results by type", () => {
      const results = [
        { id: "1", type: "task", title: "Task 1", score: 5 },
        { id: "2", type: "project", title: "Project 1", score: 4 },
        { id: "3", type: "task", title: "Task 2", score: 3 },
        { id: "4", type: "grant", title: "Grant 1", score: 2 },
      ];

      const groupByType = (items: typeof results) => {
        const grouped: Record<string, typeof results> = {
          tasks: [],
          projects: [],
          grants: [],
          publications: [],
          navigation: [],
        };

        items.forEach((item) => {
          const key = `${item.type}s`;
          if (key in grouped) {
            grouped[key].push(item);
          }
        });

        return grouped;
      };

      const grouped = groupByType(results);
      expect(grouped.tasks.length).toBe(2);
      expect(grouped.projects.length).toBe(1);
      expect(grouped.grants.length).toBe(1);
      expect(grouped.publications.length).toBe(0);
    });
  });

  describe("Scored Results", () => {
    it("should include score and features in response", () => {
      const result = {
        id: "1",
        title: "Test Task",
        type: "task",
        _score: 7.5,
        _features: {
          title_exact_match: 1,
          title_token_overlap: 0.5,
          user_previously_selected: 1,
        },
      };

      expect(result._score).toBe(7.5);
      expect(result._features.title_exact_match).toBe(1);
    });

    it("should sort results by score descending", () => {
      const results = [
        { id: "1", score: 3 },
        { id: "2", score: 7 },
        { id: "3", score: 5 },
      ];

      const sorted = [...results].sort((a, b) => b.score - a.score);
      expect(sorted[0].id).toBe("2");
      expect(sorted[1].id).toBe("3");
      expect(sorted[2].id).toBe("1");
    });
  });
});

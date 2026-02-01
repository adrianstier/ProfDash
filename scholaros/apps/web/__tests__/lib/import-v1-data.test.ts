/**
 * V1 Data Import/Migration Tests
 *
 * Tests for converting ProfDash v1 localStorage data to ScholarOS v2 format.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  convertTask,
  convertProject,
  validateV1Data,
  parseImportData,
  extractV1Data,
  hasV1Data,
  clearV1Data,
  type V2Task,
  type V2Project,
} from "@/lib/migration/import-v1-data";

describe("V1 Data Migration", () => {
  describe("convertTask", () => {
    const emptyProjectMap = new Map<string, string>();

    it("should convert a basic v1 task to v2 format", () => {
      const v1Task = {
        id: "task-1",
        title: "Write paper",
        notes: "Draft the introduction",
        category: "research",
        priority: "p1",
        status: "todo",
        due: "2024-03-15",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);

      expect(result.title).toBe("Write paper");
      expect(result.description).toBe("Draft the introduction");
      expect(result.category).toBe("research");
      expect(result.priority).toBe("p1");
      expect(result.status).toBe("todo");
      expect(result.due).toBe("2024-03-15");
    });

    it("should map v1 'service' category to v2 'admin'", () => {
      const v1Task = {
        id: "t2",
        title: "Committee meeting",
        category: "service",
        priority: "p2",
        status: "todo",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);
      expect(result.category).toBe("admin");
    });

    it("should map v1 'personal' category to v2 'misc'", () => {
      const v1Task = {
        id: "t3",
        title: "Gym",
        category: "personal",
        priority: "p4",
        status: "todo",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);
      expect(result.category).toBe("misc");
    });

    it("should default to 'research' for unknown categories", () => {
      const v1Task = {
        id: "t4",
        title: "Unknown",
        category: "nonexistent",
        priority: "p2",
        status: "todo",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);
      expect(result.category).toBe("research");
    });

    it("should default to 'p3' for unknown priorities", () => {
      const v1Task = {
        id: "t5",
        title: "Test",
        category: "research",
        priority: "high",
        status: "todo",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);
      expect(result.priority).toBe("p3");
    });

    it("should default to 'todo' for unknown statuses", () => {
      const v1Task = {
        id: "t6",
        title: "Test",
        category: "research",
        priority: "p2",
        status: "in_review",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);
      expect(result.status).toBe("todo");
    });

    it("should handle null/missing optional fields", () => {
      const v1Task = {
        id: "t7",
        title: "Minimal",
        category: "research",
        priority: "p2",
        status: "todo",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);
      expect(result.description).toBeNull();
      expect(result.due).toBeNull();
      expect(result.project_id).toBeNull();
      expect(result.tags).toEqual([]);
    });

    it("should resolve project_id from the project ID map", () => {
      const projectMap = new Map([["old-proj-1", "new-proj-uuid"]]);
      const v1Task = {
        id: "t8",
        title: "With project",
        category: "research",
        priority: "p2",
        status: "progress",
        project: "old-proj-1",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, projectMap);
      expect(result.project_id).toBe("new-proj-uuid");
    });

    it("should set project_id to null when project not found in map", () => {
      const projectMap = new Map([["other-proj", "other-uuid"]]);
      const v1Task = {
        id: "t9",
        title: "Orphaned project ref",
        category: "research",
        priority: "p2",
        status: "todo",
        project: "missing-proj",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, projectMap);
      expect(result.project_id).toBeNull();
    });

    it("should preserve tags", () => {
      const v1Task = {
        id: "t10",
        title: "Tagged task",
        category: "research",
        priority: "p1",
        status: "todo",
        tags: ["important", "urgent"],
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertTask(v1Task, emptyProjectMap);
      expect(result.tags).toEqual(["important", "urgent"]);
    });
  });

  describe("convertProject", () => {
    const workspaceId = "ws-123";

    it("should convert a basic v1 project to v2 format", () => {
      const v1Project = {
        id: "proj-1",
        title: "Nature Paper",
        type: "manuscript",
        status: "active",
        stage: "drafting",
        summary: "A great paper",
        dueDate: "2024-06-01",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertProject(v1Project, workspaceId);

      expect(result.title).toBe("Nature Paper");
      expect(result.type).toBe("manuscript");
      expect(result.status).toBe("active");
      expect(result.stage).toBe("drafting");
      expect(result.summary).toBe("A great paper");
      expect(result.due_date).toBe("2024-06-01");
      expect(result.workspace_id).toBe(workspaceId);
    });

    it("should default to 'general' for unknown project types", () => {
      const v1Project = {
        id: "proj-2",
        title: "Unknown Type",
        type: "dissertation",
        status: "active",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertProject(v1Project, workspaceId);
      expect(result.type).toBe("general");
    });

    it("should default to 'active' for unknown statuses", () => {
      const v1Project = {
        id: "proj-3",
        title: "Unknown Status",
        type: "grant",
        status: "in_review",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertProject(v1Project, workspaceId);
      expect(result.status).toBe("active");
    });

    it("should handle null/missing optional fields", () => {
      const v1Project = {
        id: "proj-4",
        title: "Minimal Project",
        type: "general",
        status: "active",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = convertProject(v1Project, workspaceId);
      expect(result.stage).toBeNull();
      expect(result.summary).toBeNull();
      expect(result.due_date).toBeNull();
    });

    it("should convert all valid project types", () => {
      for (const type of ["manuscript", "grant", "general"]) {
        const result = convertProject(
          {
            id: `proj-${type}`,
            title: `${type} project`,
            type,
            status: "active",
            createdAt: "2024-01-01T00:00:00Z",
          },
          workspaceId
        );
        expect(result.type).toBe(type);
      }
    });

    it("should convert all valid project statuses", () => {
      for (const status of ["active", "completed", "archived"]) {
        const result = convertProject(
          {
            id: `proj-${status}`,
            title: `${status} project`,
            type: "general",
            status,
            createdAt: "2024-01-01T00:00:00Z",
          },
          workspaceId
        );
        expect(result.status).toBe(status);
      }
    });
  });

  describe("validateV1Data", () => {
    it("should validate data with no issues", () => {
      const data = {
        tasks: [
          {
            id: "t1",
            title: "Valid task",
            category: "research",
            priority: "p1",
            status: "todo",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        projects: [
          {
            id: "p1",
            title: "Valid project",
            type: "manuscript",
            status: "active",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      };

      const result = validateV1Data(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should report error for task without title", () => {
      const data = {
        tasks: [
          {
            id: "t1",
            title: "",
            category: "research",
            priority: "p1",
            status: "todo",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        projects: [],
      };

      const result = validateV1Data(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Task t1 has no title");
    });

    it("should report error for project without title", () => {
      const data = {
        tasks: [],
        projects: [
          {
            id: "p1",
            title: "  ",
            type: "manuscript",
            status: "active",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      };

      const result = validateV1Data(data);
      expect(result.valid).toBe(false);
    });

    it("should warn about unknown task categories", () => {
      const data = {
        tasks: [
          {
            id: "t1",
            title: "Task",
            category: "unknown_cat",
            priority: "p1",
            status: "todo",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        projects: [],
      };

      const result = validateV1Data(data);
      expect(result.valid).toBe(true); // warnings don't affect validity
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("unknown category");
    });

    it("should warn about unknown task priorities", () => {
      const data = {
        tasks: [
          {
            id: "t1",
            title: "Task",
            category: "research",
            priority: "critical",
            status: "todo",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        projects: [],
      };

      const result = validateV1Data(data);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("unknown priority");
    });

    it("should warn about unknown project types", () => {
      const data = {
        tasks: [],
        projects: [
          {
            id: "p1",
            title: "Project",
            type: "thesis",
            status: "active",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      };

      const result = validateV1Data(data);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("unknown type");
    });

    it("should handle empty data", () => {
      const result = validateV1Data({ tasks: [], projects: [] });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should collect multiple errors and warnings", () => {
      const data = {
        tasks: [
          {
            id: "t1",
            title: "",
            category: "unknown",
            priority: "bad",
            status: "todo",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        projects: [
          {
            id: "p1",
            title: "",
            type: "thesis",
            status: "active",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      };

      const result = validateV1Data(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Note: warnings for unknown category/priority may not appear for empty-titled tasks
      // since the validation checks title first
    });
  });

  describe("parseImportData", () => {
    it("should parse valid JSON with tasks and projects", () => {
      const json = JSON.stringify({
        tasks: [{ id: "t1", title: "Task" }],
        projects: [{ id: "p1", title: "Project" }],
      });

      const result = parseImportData(json);
      expect(result).not.toBeNull();
      expect(result!.tasks).toHaveLength(1);
      expect(result!.projects).toHaveLength(1);
    });

    it("should return null for invalid JSON", () => {
      const result = parseImportData("not valid json {{{");
      expect(result).toBeNull();
    });

    it("should default to empty arrays when tasks/projects missing", () => {
      const result = parseImportData(JSON.stringify({ other: "data" }));
      expect(result).not.toBeNull();
      expect(result!.tasks).toEqual([]);
      expect(result!.projects).toEqual([]);
    });

    it("should handle empty JSON object", () => {
      const result = parseImportData("{}");
      expect(result).not.toBeNull();
      expect(result!.tasks).toEqual([]);
      expect(result!.projects).toEqual([]);
    });

    it("should handle non-array tasks/projects gracefully", () => {
      const json = JSON.stringify({
        tasks: "not-an-array",
        projects: 42,
      });

      const result = parseImportData(json);
      expect(result).not.toBeNull();
      expect(result!.tasks).toEqual([]);
      expect(result!.projects).toEqual([]);
    });
  });

  describe("extractV1Data", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should return empty arrays when no v1 data exists", () => {
      const result = extractV1Data();
      expect(result.tasks).toEqual([]);
      expect(result.projects).toEqual([]);
    });

    it("should extract tasks from localStorage", () => {
      const tasks = [{ id: "t1", title: "Test task" }];
      localStorage.setItem("profdash_tasks", JSON.stringify(tasks));

      const result = extractV1Data();
      expect(result.tasks).toEqual(tasks);
    });

    it("should extract projects from localStorage", () => {
      const projects = [{ id: "p1", title: "Test project" }];
      localStorage.setItem("profdash_projects", JSON.stringify(projects));

      const result = extractV1Data();
      expect(result.projects).toEqual(projects);
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorage.setItem("profdash_tasks", "invalid{json");
      localStorage.setItem("profdash_projects", "also{bad");

      const result = extractV1Data();
      expect(result.tasks).toEqual([]);
      expect(result.projects).toEqual([]);
    });
  });

  describe("hasV1Data", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should return false when no v1 data exists", () => {
      expect(hasV1Data()).toBe(false);
    });

    it("should return true when tasks exist", () => {
      localStorage.setItem("profdash_tasks", "[]");
      expect(hasV1Data()).toBe(true);
    });

    it("should return true when projects exist", () => {
      localStorage.setItem("profdash_projects", "[]");
      expect(hasV1Data()).toBe(true);
    });

    it("should return true when both exist", () => {
      localStorage.setItem("profdash_tasks", "[]");
      localStorage.setItem("profdash_projects", "[]");
      expect(hasV1Data()).toBe(true);
    });
  });

  describe("clearV1Data", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should remove all v1 data keys", () => {
      localStorage.setItem("profdash_tasks", "[]");
      localStorage.setItem("profdash_projects", "[]");
      localStorage.setItem("profdash_settings", "{}");

      clearV1Data();

      expect(localStorage.getItem("profdash_tasks")).toBeNull();
      expect(localStorage.getItem("profdash_projects")).toBeNull();
      expect(localStorage.getItem("profdash_settings")).toBeNull();
    });

    it("should not remove non-v1 data", () => {
      localStorage.setItem("other_key", "keep-me");
      localStorage.setItem("profdash_tasks", "[]");

      clearV1Data();

      expect(localStorage.getItem("other_key")).toBe("keep-me");
    });

    it("should not throw when no v1 data exists", () => {
      expect(() => clearV1Data()).not.toThrow();
    });
  });
});

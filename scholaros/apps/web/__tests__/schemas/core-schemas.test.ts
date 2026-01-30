import { describe, it, expect } from "vitest";
import {
  TaskCategorySchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  SubtaskSchema,
  ProjectTypeSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  PublicationSchema,
  CreatePublicationSchema,
  UpdatePublicationSchema,
} from "@scholaros/shared/schemas";

describe("TaskCategorySchema", () => {
  const validCategories = [
    "research", "teaching", "grants", "grad-mentorship", "undergrad-mentorship",
    "admin", "misc", "meeting", "analysis", "submission", "revision",
    "presentation", "writing", "reading", "coursework",
  ];

  it.each(validCategories)("accepts valid category '%s'", (category) => {
    expect(TaskCategorySchema.parse(category)).toBe(category);
  });

  it("rejects invalid category", () => {
    expect(() => TaskCategorySchema.parse("invalid")).toThrow();
    expect(() => TaskCategorySchema.parse("")).toThrow();
    expect(() => TaskCategorySchema.parse(123)).toThrow();
  });
});

describe("TaskPrioritySchema", () => {
  it.each(["p1", "p2", "p3", "p4"])("accepts '%s'", (p) => {
    expect(TaskPrioritySchema.parse(p)).toBe(p);
  });

  it("rejects invalid priority", () => {
    expect(() => TaskPrioritySchema.parse("p5")).toThrow();
    expect(() => TaskPrioritySchema.parse("high")).toThrow();
    expect(() => TaskPrioritySchema.parse(1)).toThrow();
  });
});

describe("TaskStatusSchema", () => {
  it.each(["todo", "progress", "done"])("accepts '%s'", (s) => {
    expect(TaskStatusSchema.parse(s)).toBe(s);
  });

  it("rejects invalid status", () => {
    expect(() => TaskStatusSchema.parse("in_progress")).toThrow();
    expect(() => TaskStatusSchema.parse("completed")).toThrow();
    expect(() => TaskStatusSchema.parse("")).toThrow();
  });
});

describe("CreateTaskSchema", () => {
  it("accepts valid task with title only (defaults applied)", () => {
    const result = CreateTaskSchema.parse({ title: "Write paper" });
    expect(result.title).toBe("Write paper");
    expect(result.category).toBe("misc");
    expect(result.priority).toBe("p3");
    expect(result.status).toBe("todo");
  });

  it("accepts valid task with all optional fields", () => {
    const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const result = CreateTaskSchema.parse({
      title: "Review grant",
      description: "Review the NSF grant proposal",
      category: "grants",
      priority: "p1",
      status: "todo",
      due: "2025-06-15",
      project_id: uuid,
      workspace_id: uuid,
      assignees: [uuid],
      tags: ["urgent"],
    });
    expect(result.title).toBe("Review grant");
    expect(result.category).toBe("grants");
    expect(result.priority).toBe("p1");
    expect(result.project_id).toBe(uuid);
  });

  it("rejects missing title", () => {
    expect(() => CreateTaskSchema.parse({})).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => CreateTaskSchema.parse({ title: "" })).toThrow();
  });

  it("rejects title over 500 characters", () => {
    expect(() => CreateTaskSchema.parse({ title: "a".repeat(501) })).toThrow();
  });

  it("accepts title at exactly 500 characters", () => {
    const result = CreateTaskSchema.parse({ title: "a".repeat(500) });
    expect(result.title).toHaveLength(500);
  });
});

describe("UpdateTaskSchema", () => {
  it("accepts partial updates", () => {
    const result = UpdateTaskSchema.parse({ title: "Updated title" });
    expect(result.title).toBe("Updated title");
  });

  it("accepts empty object (all fields optional)", () => {
    const result = UpdateTaskSchema.parse({});
    expect(result).toBeDefined();
  });

  it("accepts updating only priority", () => {
    const result = UpdateTaskSchema.parse({ priority: "p1" });
    expect(result.priority).toBe("p1");
  });
});

describe("SubtaskSchema", () => {
  it("accepts valid subtask with text and completed", () => {
    const result = SubtaskSchema.parse({
      id: "abc-123",
      text: "Write introduction",
      completed: true,
    });
    expect(result.text).toBe("Write introduction");
    expect(result.completed).toBe(true);
  });

  it("defaults completed to false", () => {
    const result = SubtaskSchema.parse({ id: "abc", text: "Some subtask" });
    expect(result.completed).toBe(false);
  });

  it("rejects text over 500 chars", () => {
    expect(() =>
      SubtaskSchema.parse({ id: "abc", text: "a".repeat(501), completed: false })
    ).toThrow();
  });

  it("rejects empty text", () => {
    expect(() =>
      SubtaskSchema.parse({ id: "abc", text: "", completed: false })
    ).toThrow();
  });

  it("accepts optional priority", () => {
    const result = SubtaskSchema.parse({
      id: "abc",
      text: "Do thing",
      completed: false,
      priority: "p2",
    });
    expect(result.priority).toBe("p2");
  });

  it("accepts optional estimatedMinutes within range", () => {
    const result = SubtaskSchema.parse({
      id: "abc",
      text: "Do thing",
      completed: false,
      estimatedMinutes: 60,
    });
    expect(result.estimatedMinutes).toBe(60);
  });

  it("rejects estimatedMinutes below 1", () => {
    expect(() =>
      SubtaskSchema.parse({
        id: "abc",
        text: "Do thing",
        completed: false,
        estimatedMinutes: 0,
      })
    ).toThrow();
  });

  it("rejects estimatedMinutes above 480", () => {
    expect(() =>
      SubtaskSchema.parse({
        id: "abc",
        text: "Do thing",
        completed: false,
        estimatedMinutes: 481,
      })
    ).toThrow();
  });

  it("accepts estimatedMinutes at boundary values 1 and 480", () => {
    const min = SubtaskSchema.parse({
      id: "a",
      text: "Task",
      completed: false,
      estimatedMinutes: 1,
    });
    expect(min.estimatedMinutes).toBe(1);

    const max = SubtaskSchema.parse({
      id: "b",
      text: "Task",
      completed: false,
      estimatedMinutes: 480,
    });
    expect(max.estimatedMinutes).toBe(480);
  });
});

describe("ProjectTypeSchema", () => {
  it.each(["manuscript", "grant", "general", "research"])("accepts '%s'", (type) => {
    expect(ProjectTypeSchema.parse(type)).toBe(type);
  });

  it("rejects invalid type", () => {
    expect(() => ProjectTypeSchema.parse("thesis")).toThrow();
    expect(() => ProjectTypeSchema.parse("")).toThrow();
  });
});

describe("CreateProjectSchema", () => {
  const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("accepts valid project with required fields", () => {
    const result = CreateProjectSchema.parse({
      workspace_id: uuid,
      type: "manuscript",
      title: "My Research Paper",
    });
    expect(result.title).toBe("My Research Paper");
    expect(result.type).toBe("manuscript");
    expect(result.status).toBe("active");
  });

  it("accepts optional fields", () => {
    const result = CreateProjectSchema.parse({
      workspace_id: uuid,
      type: "grant",
      title: "NSF CAREER",
      summary: "A grant proposal",
      stage: "drafting",
      due_date: "2025-12-01",
      owner_id: uuid,
    });
    expect(result.summary).toBe("A grant proposal");
    expect(result.stage).toBe("drafting");
  });

  it("rejects missing workspace_id", () => {
    expect(() =>
      CreateProjectSchema.parse({ type: "general", title: "Test" })
    ).toThrow();
  });

  it("rejects missing title", () => {
    expect(() =>
      CreateProjectSchema.parse({ workspace_id: uuid, type: "general" })
    ).toThrow();
  });

  it("rejects missing type", () => {
    expect(() =>
      CreateProjectSchema.parse({ workspace_id: uuid, title: "Test" })
    ).toThrow();
  });
});

describe("UpdateProjectSchema", () => {
  it("accepts partial updates", () => {
    const result = UpdateProjectSchema.parse({ title: "Updated Title" });
    expect(result.title).toBe("Updated Title");
  });

  it("accepts empty object", () => {
    const result = UpdateProjectSchema.parse({});
    expect(result).toBeDefined();
  });

  it("does not require workspace_id (omitted from update)", () => {
    const result = UpdateProjectSchema.parse({ type: "research" });
    expect(result.type).toBe("research");
    expect((result as Record<string, unknown>).workspace_id).toBeUndefined();
  });
});

describe("PublicationSchema", () => {
  const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const now = new Date().toISOString();

  it("accepts valid publication", () => {
    const result = PublicationSchema.parse({
      id: uuid,
      user_id: uuid,
      title: "A Study on Machine Learning",
      publication_type: "journal-article",
      status: "published",
      year: 2024,
      created_at: now,
      updated_at: now,
    });
    expect(result.title).toBe("A Study on Machine Learning");
    expect(result.publication_type).toBe("journal-article");
  });

  it("rejects year below 1900", () => {
    expect(() =>
      PublicationSchema.parse({
        id: uuid,
        user_id: uuid,
        title: "Old paper",
        year: 1899,
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });

  it("rejects year above 2100", () => {
    expect(() =>
      PublicationSchema.parse({
        id: uuid,
        user_id: uuid,
        title: "Future paper",
        year: 2101,
        created_at: now,
        updated_at: now,
      })
    ).toThrow();
  });
});

describe("CreatePublicationSchema", () => {
  it("accepts valid publication creation", () => {
    const result = CreatePublicationSchema.parse({
      title: "New Paper",
      publication_type: "preprint",
      status: "drafting",
    });
    expect(result.title).toBe("New Paper");
    expect(result.publication_type).toBe("preprint");
  });

  it("applies defaults", () => {
    const result = CreatePublicationSchema.parse({ title: "Minimal" });
    expect(result.publication_type).toBe("journal-article");
    expect(result.status).toBe("idea");
  });

  it("rejects missing title", () => {
    expect(() => CreatePublicationSchema.parse({})).toThrow();
  });
});

describe("UpdatePublicationSchema", () => {
  it("accepts partial updates", () => {
    const result = UpdatePublicationSchema.parse({ status: "submitted" });
    expect(result.status).toBe("submitted");
  });

  it("accepts empty object", () => {
    const result = UpdatePublicationSchema.parse({});
    expect(result).toBeDefined();
  });
});

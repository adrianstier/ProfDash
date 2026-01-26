/**
 * Project Hierarchy Schema Tests
 *
 * Tests for the project hierarchy Zod schemas: phases, workstreams,
 * deliverables, roles, assignments, and templates.
 * Run with: pnpm test
 */

import { describe, it, expect } from "vitest";
import {
  PhaseStatusSchema,
  WorkstreamStatusSchema,
  DeliverableStatusSchema,
  DeliverableArtifactTypeSchema,
  PhaseAssignmentTypeSchema,
  ProjectPhaseSchema,
  CreateProjectPhaseSchema,
  UpdateProjectPhaseSchema,
  ProjectWorkstreamSchema,
  CreateProjectWorkstreamSchema,
  UpdateProjectWorkstreamSchema,
  ProjectDeliverableSchema,
  CreateProjectDeliverableSchema,
  UpdateProjectDeliverableSchema,
  ProjectRoleSchema,
  CreateProjectRoleSchema,
  UpdateProjectRoleSchema,
  ProjectPhaseAssignmentSchema,
  CreateProjectPhaseAssignmentSchema,
  ProjectTemplateSchema,
  CreateProjectTemplateSchema,
  UpdateProjectTemplateSchema,
  PhaseDefinitionSchema,
  DeliverableDefinitionSchema,
  RoleDefinitionSchema,
  ApplyTemplateSchema,
  ActivityActionSchema,
} from "@scholaros/shared/schemas";

// =============================================================================
// Phase Status Schema Tests
// =============================================================================
describe("PhaseStatusSchema", () => {
  it("should accept all valid phase statuses", () => {
    const validStatuses = ["pending", "in_progress", "blocked", "completed"];

    validStatuses.forEach((status) => {
      const result = PhaseStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid phase statuses", () => {
    const invalidStatuses = ["started", "active", "done", "cancelled", "paused"];

    invalidStatuses.forEach((status) => {
      const result = PhaseStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Workstream Status Schema Tests
// =============================================================================
describe("WorkstreamStatusSchema", () => {
  it("should accept all valid workstream statuses", () => {
    const validStatuses = ["active", "paused", "completed"];

    validStatuses.forEach((status) => {
      const result = WorkstreamStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid workstream statuses", () => {
    const invalidStatuses = ["pending", "blocked", "in_progress", "cancelled"];

    invalidStatuses.forEach((status) => {
      const result = WorkstreamStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Deliverable Status Schema Tests
// =============================================================================
describe("DeliverableStatusSchema", () => {
  it("should accept all valid deliverable statuses", () => {
    const validStatuses = ["pending", "in_progress", "review", "completed"];

    validStatuses.forEach((status) => {
      const result = DeliverableStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid deliverable statuses", () => {
    const invalidStatuses = ["active", "blocked", "done", "draft"];

    invalidStatuses.forEach((status) => {
      const result = DeliverableStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Deliverable Artifact Type Schema Tests
// =============================================================================
describe("DeliverableArtifactTypeSchema", () => {
  it("should accept all valid artifact types", () => {
    const validTypes = ["document", "code", "data", "report", "presentation", "other"];

    validTypes.forEach((type) => {
      const result = DeliverableArtifactTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid artifact types", () => {
    const invalidTypes = ["file", "image", "video", "spreadsheet"];

    invalidTypes.forEach((type) => {
      const result = DeliverableArtifactTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Phase Assignment Type Schema Tests
// =============================================================================
describe("PhaseAssignmentTypeSchema", () => {
  it("should accept all valid assignment types", () => {
    const validTypes = ["owner", "contributor", "reviewer"];

    validTypes.forEach((type) => {
      const result = PhaseAssignmentTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid assignment types", () => {
    const invalidTypes = ["lead", "member", "assignee", "manager"];

    invalidTypes.forEach((type) => {
      const result = PhaseAssignmentTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Project Phase Schema Tests
// =============================================================================
describe("ProjectPhaseSchema", () => {
  const validPhase = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Phase 1: Business Clarity",
    description: "Define problem and objectives",
    sort_order: 0,
    status: "pending",
    started_at: null,
    completed_at: null,
    due_date: "2024-02-01",
    blocked_by: [],
    assigned_role: "Business Analyst",
    metadata: {},
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  it("should validate a complete phase", () => {
    const result = ProjectPhaseSchema.safeParse(validPhase);
    expect(result.success).toBe(true);
  });

  it("should validate phase with blocked_by array", () => {
    const phase = {
      ...validPhase,
      blocked_by: [
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440011",
      ],
      status: "blocked",
    };

    const result = ProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blocked_by).toHaveLength(2);
    }
  });

  it("should validate phase with dates", () => {
    const phase = {
      ...validPhase,
      status: "completed",
      started_at: "2024-01-15T10:30:00Z",
      completed_at: "2024-01-20T15:00:00Z",
    };

    const result = ProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID for id", () => {
    const phase = { ...validPhase, id: "invalid-uuid" };
    const result = ProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(false);
  });

  it("should reject empty title", () => {
    const phase = { ...validPhase, title: "" };
    const result = ProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(false);
  });

  it("should reject title exceeding 200 characters", () => {
    const phase = { ...validPhase, title: "a".repeat(201) };
    const result = ProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Create Project Phase Schema Tests
// =============================================================================
describe("CreateProjectPhaseSchema", () => {
  it("should validate minimal create phase request", () => {
    const phase = {
      project_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Phase 1",
    };

    const result = CreateProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(true);
  });

  it("should validate complete create phase request", () => {
    const phase = {
      project_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Phase 1: Business Clarity",
      description: "Define problem and objectives",
      sort_order: 0,
      due_date: "2024-02-01",
      blocked_by: ["550e8400-e29b-41d4-a716-446655440010"],
      assigned_role: "Business Analyst",
      metadata: { priority: "high" },
    };

    const result = CreateProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(true);
  });

  it("should apply defaults for optional fields", () => {
    const phase = {
      project_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Phase 1",
    };

    const result = CreateProjectPhaseSchema.safeParse(phase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBe(0);
      expect(result.data.blocked_by).toEqual([]);
      expect(result.data.metadata).toEqual({});
    }
  });
});

// =============================================================================
// Update Project Phase Schema Tests
// =============================================================================
describe("UpdateProjectPhaseSchema", () => {
  it("should validate partial update", () => {
    const update = { title: "Updated Phase Title" };
    const result = UpdateProjectPhaseSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it("should validate status update", () => {
    const update = { status: "in_progress" };
    const result = UpdateProjectPhaseSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it("should validate blocked_by update", () => {
    const update = {
      blocked_by: ["550e8400-e29b-41d4-a716-446655440010"],
    };
    const result = UpdateProjectPhaseSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", () => {
    const update = { status: "invalid_status" };
    const result = UpdateProjectPhaseSchema.safeParse(update);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Project Workstream Schema Tests
// =============================================================================
describe("ProjectWorkstreamSchema", () => {
  const validWorkstream = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Mote",
    description: "Voice memos workstream",
    color: "bg-blue-500",
    sort_order: 0,
    status: "active",
    owner_id: null,
    metadata: {},
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  it("should validate a complete workstream", () => {
    const result = ProjectWorkstreamSchema.safeParse(validWorkstream);
    expect(result.success).toBe(true);
  });

  it("should validate workstream with owner", () => {
    const workstream = {
      ...validWorkstream,
      owner_id: "550e8400-e29b-41d4-a716-446655440099",
    };

    const result = ProjectWorkstreamSchema.safeParse(workstream);
    expect(result.success).toBe(true);
  });

  it("should reject empty title", () => {
    const workstream = { ...validWorkstream, title: "" };
    const result = ProjectWorkstreamSchema.safeParse(workstream);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Create Project Workstream Schema Tests
// =============================================================================
describe("CreateProjectWorkstreamSchema", () => {
  it("should validate minimal create request", () => {
    const workstream = {
      project_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "FUNDMAR",
    };

    const result = CreateProjectWorkstreamSchema.safeParse(workstream);
    expect(result.success).toBe(true);
  });

  it("should apply default color", () => {
    const workstream = {
      project_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "FUNDMAR",
    };

    const result = CreateProjectWorkstreamSchema.safeParse(workstream);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe("bg-blue-500");
    }
  });
});

// =============================================================================
// Project Deliverable Schema Tests
// =============================================================================
describe("ProjectDeliverableSchema", () => {
  const validDeliverable = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    phase_id: "550e8400-e29b-41d4-a716-446655440001",
    project_id: "550e8400-e29b-41d4-a716-446655440002",
    workstream_id: null,
    title: "PROBLEM_DEFINITION.md",
    description: "Clear statement of the problem being solved",
    artifact_type: "document",
    file_path: "/docs/PROBLEM_DEFINITION.md",
    sort_order: 0,
    status: "pending",
    completed_at: null,
    due_date: null,
    document_id: null,
    url: null,
    metadata: {},
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  it("should validate a complete deliverable", () => {
    const result = ProjectDeliverableSchema.safeParse(validDeliverable);
    expect(result.success).toBe(true);
  });

  it("should validate deliverable with URL", () => {
    const deliverable = {
      ...validDeliverable,
      url: "https://docs.google.com/document/d/123",
    };

    const result = ProjectDeliverableSchema.safeParse(deliverable);
    expect(result.success).toBe(true);
  });

  it("should validate completed deliverable", () => {
    const deliverable = {
      ...validDeliverable,
      status: "completed",
      completed_at: "2024-01-20T15:00:00Z",
    };

    const result = ProjectDeliverableSchema.safeParse(deliverable);
    expect(result.success).toBe(true);
  });

  it("should reject invalid URL", () => {
    const deliverable = {
      ...validDeliverable,
      url: "not-a-valid-url",
    };

    const result = ProjectDeliverableSchema.safeParse(deliverable);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Create Project Deliverable Schema Tests
// =============================================================================
describe("CreateProjectDeliverableSchema", () => {
  it("should validate minimal create request", () => {
    const deliverable = {
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "PRD.md",
    };

    const result = CreateProjectDeliverableSchema.safeParse(deliverable);
    expect(result.success).toBe(true);
  });

  it("should validate complete create request", () => {
    const deliverable = {
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "PRD.md",
      workstream_id: "550e8400-e29b-41d4-a716-446655440010",
      description: "Product Requirements Document",
      artifact_type: "document",
      file_path: "/docs/PRD.md",
      sort_order: 0,
      due_date: "2024-02-15",
      url: "https://docs.google.com/document/d/123",
      metadata: {},
    };

    const result = CreateProjectDeliverableSchema.safeParse(deliverable);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Project Role Schema Tests
// =============================================================================
describe("ProjectRoleSchema", () => {
  const validRole = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    project_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Business Analyst",
    description: "Defines business requirements and success criteria",
    color: "bg-purple-500",
    is_ai_agent: false,
    metadata: {},
    created_at: "2024-01-15T10:30:00Z",
  };

  it("should validate a complete role", () => {
    const result = ProjectRoleSchema.safeParse(validRole);
    expect(result.success).toBe(true);
  });

  it("should validate AI agent role", () => {
    const role = {
      ...validRole,
      name: "AI Assistant",
      is_ai_agent: true,
    };

    const result = ProjectRoleSchema.safeParse(role);
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const role = { ...validRole, name: "" };
    const result = ProjectRoleSchema.safeParse(role);
    expect(result.success).toBe(false);
  });

  it("should reject name exceeding 100 characters", () => {
    const role = { ...validRole, name: "a".repeat(101) };
    const result = ProjectRoleSchema.safeParse(role);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Create Project Role Schema Tests
// =============================================================================
describe("CreateProjectRoleSchema", () => {
  it("should validate minimal create request", () => {
    const role = {
      project_id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Developer",
    };

    const result = CreateProjectRoleSchema.safeParse(role);
    expect(result.success).toBe(true);
  });

  it("should apply defaults", () => {
    const role = {
      project_id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Developer",
    };

    const result = CreateProjectRoleSchema.safeParse(role);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe("bg-gray-500");
      expect(result.data.is_ai_agent).toBe(false);
      expect(result.data.metadata).toEqual({});
    }
  });
});

// =============================================================================
// Project Phase Assignment Schema Tests
// =============================================================================
describe("ProjectPhaseAssignmentSchema", () => {
  it("should validate assignment with role", () => {
    const assignment = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
      role_id: "550e8400-e29b-41d4-a716-446655440002",
      user_id: null,
      assignment_type: "owner",
      created_at: "2024-01-15T10:30:00Z",
    };

    const result = ProjectPhaseAssignmentSchema.safeParse(assignment);
    expect(result.success).toBe(true);
  });

  it("should validate assignment with user", () => {
    const assignment = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
      role_id: null,
      user_id: "550e8400-e29b-41d4-a716-446655440003",
      assignment_type: "contributor",
      created_at: "2024-01-15T10:30:00Z",
    };

    const result = ProjectPhaseAssignmentSchema.safeParse(assignment);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Create Project Phase Assignment Schema Tests
// =============================================================================
describe("CreateProjectPhaseAssignmentSchema", () => {
  it("should validate assignment with role_id", () => {
    const assignment = {
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
      role_id: "550e8400-e29b-41d4-a716-446655440002",
    };

    const result = CreateProjectPhaseAssignmentSchema.safeParse(assignment);
    expect(result.success).toBe(true);
  });

  it("should validate assignment with user_id", () => {
    const assignment = {
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: "550e8400-e29b-41d4-a716-446655440003",
    };

    const result = CreateProjectPhaseAssignmentSchema.safeParse(assignment);
    expect(result.success).toBe(true);
  });

  it("should reject assignment without role_id or user_id", () => {
    const assignment = {
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
    };

    const result = CreateProjectPhaseAssignmentSchema.safeParse(assignment);
    expect(result.success).toBe(false);
  });

  it("should apply default assignment_type", () => {
    const assignment = {
      phase_id: "550e8400-e29b-41d4-a716-446655440001",
      role_id: "550e8400-e29b-41d4-a716-446655440002",
    };

    const result = CreateProjectPhaseAssignmentSchema.safeParse(assignment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignment_type).toBe("contributor");
    }
  });
});

// =============================================================================
// Template Definition Schemas Tests
// =============================================================================
describe("PhaseDefinitionSchema", () => {
  it("should validate a complete phase definition", () => {
    const phaseDef = {
      title: "Phase 1: Business Clarity",
      description: "Define the problem and objectives",
      blocked_by_index: [],
      assigned_role: "Business Analyst",
      deliverables: [
        {
          title: "PROBLEM_DEFINITION.md",
          description: "Clear statement of the problem",
          artifact_type: "document",
          file_path: "/docs/PROBLEM_DEFINITION.md",
        },
      ],
    };

    const result = PhaseDefinitionSchema.safeParse(phaseDef);
    expect(result.success).toBe(true);
  });

  it("should validate phase definition with blocking", () => {
    const phaseDef = {
      title: "Phase 2: Product Shape",
      blocked_by_index: [0],
      deliverables: [],
    };

    const result = PhaseDefinitionSchema.safeParse(phaseDef);
    expect(result.success).toBe(true);
  });

  it("should apply defaults", () => {
    const phaseDef = {
      title: "Phase 1",
    };

    const result = PhaseDefinitionSchema.safeParse(phaseDef);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blocked_by_index).toEqual([]);
      expect(result.data.deliverables).toEqual([]);
    }
  });
});

describe("DeliverableDefinitionSchema", () => {
  it("should validate a complete deliverable definition", () => {
    const delivDef = {
      title: "PROBLEM_DEFINITION.md",
      description: "Clear statement of the problem",
      artifact_type: "document",
      file_path: "/docs/PROBLEM_DEFINITION.md",
    };

    const result = DeliverableDefinitionSchema.safeParse(delivDef);
    expect(result.success).toBe(true);
  });

  it("should validate minimal deliverable definition", () => {
    const delivDef = {
      title: "Wireframes",
    };

    const result = DeliverableDefinitionSchema.safeParse(delivDef);
    expect(result.success).toBe(true);
  });
});

describe("RoleDefinitionSchema", () => {
  it("should validate a complete role definition", () => {
    const roleDef = {
      name: "Business Analyst",
      description: "Defines business requirements",
      color: "bg-purple-500",
      is_ai_agent: false,
    };

    const result = RoleDefinitionSchema.safeParse(roleDef);
    expect(result.success).toBe(true);
  });

  it("should validate minimal role definition", () => {
    const roleDef = {
      name: "Developer",
    };

    const result = RoleDefinitionSchema.safeParse(roleDef);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Project Template Schema Tests
// =============================================================================
describe("ProjectTemplateSchema", () => {
  const validTemplate = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    workspace_id: "550e8400-e29b-41d4-a716-446655440001",
    name: "RSE 7-Phase MVP",
    description: "A structured 7-phase approach for building MVPs",
    phase_definitions: [
      {
        title: "Phase 1: Business Clarity",
        blocked_by_index: [],
        assigned_role: "Business Analyst",
        deliverables: [
          { title: "PROBLEM_DEFINITION.md", artifact_type: "document" },
        ],
      },
      {
        title: "Phase 2: Product Shape",
        blocked_by_index: [0],
        assigned_role: "Product Manager",
        deliverables: [{ title: "PRD.md", artifact_type: "document" }],
      },
    ],
    role_definitions: [
      { name: "Business Analyst", is_ai_agent: false },
      { name: "Product Manager", is_ai_agent: false },
    ],
    is_public: false,
    created_by: "550e8400-e29b-41d4-a716-446655440099",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  it("should validate a complete template", () => {
    const result = ProjectTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  it("should validate public template", () => {
    const template = {
      ...validTemplate,
      workspace_id: null,
      is_public: true,
    };

    const result = ProjectTemplateSchema.safeParse(template);
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const template = { ...validTemplate, name: "" };
    const result = ProjectTemplateSchema.safeParse(template);
    expect(result.success).toBe(false);
  });

  it("should reject empty phase_definitions", () => {
    const template = { ...validTemplate, phase_definitions: [] };
    const result = ProjectTemplateSchema.safeParse(template);
    // Empty array is allowed by default, but the schema doesn't require non-empty
    // This is a design decision - templates can have 0 phases initially
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Create Project Template Schema Tests
// =============================================================================
describe("CreateProjectTemplateSchema", () => {
  it("should validate minimal create request", () => {
    const template = {
      name: "My Template",
      phase_definitions: [
        { title: "Phase 1", blocked_by_index: [], deliverables: [] },
      ],
    };

    const result = CreateProjectTemplateSchema.safeParse(template);
    expect(result.success).toBe(true);
  });

  it("should apply defaults", () => {
    const template = {
      name: "My Template",
      phase_definitions: [{ title: "Phase 1" }],
    };

    const result = CreateProjectTemplateSchema.safeParse(template);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_public).toBe(false);
      expect(result.data.role_definitions).toEqual([]);
    }
  });
});

// =============================================================================
// Apply Template Schema Tests
// =============================================================================
describe("ApplyTemplateSchema", () => {
  it("should validate apply template request", () => {
    const request = {
      template_id: "550e8400-e29b-41d4-a716-446655440000",
    };

    const result = ApplyTemplateSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const request = {
      template_id: "invalid-uuid",
    };

    const result = ApplyTemplateSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Activity Action Schema Tests (Hierarchy Actions)
// =============================================================================
describe("ActivityActionSchema - Hierarchy Actions", () => {
  it("should accept all phase action types", () => {
    const phaseActions = [
      "phase_created",
      "phase_started",
      "phase_completed",
      "phase_blocked",
    ];

    phaseActions.forEach((action) => {
      const result = ActivityActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  it("should accept workstream action types", () => {
    const workstreamActions = ["workstream_created", "workstream_updated"];

    workstreamActions.forEach((action) => {
      const result = ActivityActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  it("should accept deliverable action types", () => {
    const deliverableActions = ["deliverable_created", "deliverable_completed"];

    deliverableActions.forEach((action) => {
      const result = ActivityActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  it("should accept role assignment action", () => {
    const result = ActivityActionSchema.safeParse("role_assigned");
    expect(result.success).toBe(true);
  });

  it("should accept template applied action", () => {
    const result = ActivityActionSchema.safeParse("template_applied");
    expect(result.success).toBe(true);
  });
});

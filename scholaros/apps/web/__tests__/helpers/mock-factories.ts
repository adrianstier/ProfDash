/**
 * Mock Factory Functions
 *
 * Provides factory functions to create valid mock objects for testing.
 * Each factory returns a realistic default object that can be overridden
 * with partial values.
 */

import type {
  Task,
  TaskFromAPI,
  Project,
  Workspace,
  Profile,
  Experiment,
  Permit,
} from "@scholaros/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _counter = 0;

function uuid(): string {
  _counter += 1;
  const hex = _counter.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function dateNow(): Date {
  return new Date();
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: uuid(),
    user_id: uuid(),
    workspace_id: uuid(),
    title: "Review NSF grant proposal",
    description: "Review the latest draft of the NSF grant proposal and provide feedback",
    category: "research",
    priority: "p2",
    status: "todo",
    due: new Date("2026-02-15"),
    project_id: null,
    assignees: [],
    tags: [],
    completed_at: null,
    is_recurring: false,
    recurrence_rule: null,
    recurrence_parent_id: null,
    recurrence_date: null,
    recurrence_exceptions: [],
    subtasks: [],
    created_at: dateNow(),
    updated_at: dateNow(),
    ...overrides,
  };
}

/**
 * Create a mock task matching the TaskFromAPI shape (dates as ISO strings).
 */
export function createMockTaskFromAPI(
  overrides?: Partial<TaskFromAPI>
): TaskFromAPI {
  return {
    id: uuid(),
    user_id: uuid(),
    workspace_id: uuid(),
    title: "Review NSF grant proposal",
    description: "Review the latest draft",
    category: "research",
    priority: "p2",
    status: "todo",
    due: "2026-02-15T00:00:00.000Z",
    project_id: null,
    assignees: [],
    tags: [],
    completed_at: null,
    is_recurring: false,
    recurrence_rule: null,
    recurrence_parent_id: null,
    recurrence_date: null,
    recurrence_exceptions: [],
    subtasks: [],
    created_at: isoNow(),
    updated_at: isoNow(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: uuid(),
    workspace_id: uuid(),
    type: "manuscript",
    title: "Climate change effects on coral reefs",
    summary: "Investigating bleaching patterns across Pacific atolls",
    status: "active",
    stage: "drafting",
    due_date: new Date("2026-06-01"),
    owner_id: uuid(),
    metadata: {},
    created_at: dateNow(),
    updated_at: dateNow(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export function createMockWorkspace(overrides?: Partial<Workspace>): Workspace {
  return {
    id: uuid(),
    name: "Marine Biology Lab",
    slug: "marine-biology-lab",
    settings: {},
    created_by: uuid(),
    created_at: dateNow(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function createMockProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: uuid(),
    email: "professor@university.edu",
    full_name: "Dr. Jane Smith",
    institution: "State University",
    department: "Marine Biology",
    title: "Associate Professor",
    avatar_url: null,
    created_at: dateNow(),
    updated_at: dateNow(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Experiment
// ---------------------------------------------------------------------------

export function createMockExperiment(
  overrides?: Partial<Experiment>
): Experiment {
  return {
    id: uuid(),
    project_id: uuid(),
    workspace_id: uuid(),
    title: "Coral bleaching thermal stress trial",
    code: "EXP-001",
    description: "Controlled thermal stress experiment on staghorn coral",
    site_id: null,
    status: "planning",
    lead_id: null,
    start_date: new Date("2026-03-01"),
    end_date: new Date("2026-09-01"),
    fieldwork_start: new Date("2026-04-15"),
    fieldwork_end: new Date("2026-06-15"),
    protocols: [{ name: "Thermal stress protocol", version: "1.2" }],
    equipment_needs: [{ item: "Temperature logger", quantity: 10 }],
    sample_targets: { coral_fragments: 200, water_samples: 50 },
    hypothesis:
      "Increased water temperature accelerates bleaching in staghorn coral",
    objectives: [
      "Measure bleaching rates at different temperatures",
      "Collect tissue samples for DNA analysis",
    ],
    color: "#3B82F6",
    sort_order: 0,
    metadata: {},
    created_at: dateNow(),
    updated_at: dateNow(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Permit
// ---------------------------------------------------------------------------

export function createMockPermit(overrides?: Partial<Permit>): Permit {
  return {
    id: uuid(),
    workspace_id: uuid(),
    project_id: null,
    experiment_id: null,
    site_id: null,
    permit_type: "IACUC",
    permit_number: "IACUC-2026-0042",
    title: "Marine vertebrate research protocol",
    issuing_authority: "University IACUC Committee",
    pi_name: "Dr. Jane Smith",
    start_date: new Date("2026-01-01"),
    expiration_date: new Date("2027-01-01"),
    status: "active",
    renewal_reminder_days: 60,
    documents: [],
    notes: null,
    conditions: null,
    coverage_scope: null,
    linked_permits: [],
    metadata: {},
    created_at: dateNow(),
    updated_at: dateNow(),
    ...overrides,
  };
}

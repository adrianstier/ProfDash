import { vi } from "vitest";
import type {
  PhaseWithDetails,
  WorkstreamWithStats,
  DeliverableWithRelations,
} from "@/lib/hooks/use-project-hierarchy";

// Mock data factories
export function createMockPhase(
  overrides: Partial<PhaseWithDetails> = {}
): PhaseWithDetails {
  return {
    id: crypto.randomUUID(),
    project_id: "project-1",
    title: "Test Phase",
    description: null,
    sort_order: 0,
    status: "pending",
    started_at: null,
    completed_at: null,
    due_date: null,
    blocked_by: [],
    assigned_role: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deliverables: [],
    assignments: [],
    ...overrides,
  };
}

export function createMockWorkstream(
  overrides: Partial<WorkstreamWithStats> = {}
): WorkstreamWithStats {
  return {
    id: crypto.randomUUID(),
    project_id: "project-1",
    title: "Test Workstream",
    description: null,
    color: "bg-blue-500",
    sort_order: 0,
    status: "active",
    owner_id: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: null,
    task_count: 0,
    completed_task_count: 0,
    overdue_task_count: 0,
    ...overrides,
  };
}

export function createMockDeliverable(
  overrides: Partial<DeliverableWithRelations> = {}
): DeliverableWithRelations {
  return {
    id: crypto.randomUUID(),
    phase_id: "phase-1",
    project_id: "project-1",
    workstream_id: null,
    title: "Test Deliverable",
    description: null,
    artifact_type: "document",
    file_path: null,
    sort_order: 0,
    status: "pending",
    completed_at: null,
    due_date: null,
    document_id: null,
    url: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    workstream: null,
    document: null,
    ...overrides,
  };
}

// Create mock hook implementations
export function createMockQueryResult<T>(data: T, overrides = {}) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

export function createMockMutation(overrides = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  };
}

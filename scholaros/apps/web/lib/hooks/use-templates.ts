"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectTemplateFromAPI,
  PhaseDefinition,
  RoleDefinition,
} from "@scholaros/shared";

// Extended type with creator info
export interface TemplateWithCreator extends ProjectTemplateFromAPI {
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// =============================================================================
// TEMPLATES
// =============================================================================

async function fetchTemplates(workspaceId?: string | null): Promise<TemplateWithCreator[]> {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspace_id", workspaceId);

  const response = await fetch(`/api/templates?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch templates");
  }

  return response.json();
}

async function createTemplate(data: {
  workspace_id?: string | null;
  name: string;
  description?: string | null;
  phase_definitions: PhaseDefinition[];
  role_definitions?: RoleDefinition[];
  is_public?: boolean;
}): Promise<TemplateWithCreator> {
  const response = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create template");
  }

  return response.json();
}

async function updateTemplate({
  templateId,
  ...updates
}: {
  templateId: string;
  name?: string;
  description?: string | null;
  phase_definitions?: PhaseDefinition[];
  role_definitions?: RoleDefinition[];
  is_public?: boolean;
}): Promise<TemplateWithCreator> {
  const params = new URLSearchParams({ id: templateId });
  const response = await fetch(`/api/templates?${params.toString()}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update template");
  }

  return response.json();
}

async function deleteTemplate(templateId: string): Promise<void> {
  const params = new URLSearchParams({ id: templateId });
  const response = await fetch(`/api/templates?${params.toString()}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete template");
  }
}

// Hook: Fetch templates
export function useTemplates(workspaceId?: string | null) {
  return useQuery({
    queryKey: ["templates", workspaceId],
    queryFn: () => fetchTemplates(workspaceId),
  });
}

// Hook: Create template
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

// Hook: Update template
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

// Hook: Delete template
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

// =============================================================================
// RSE 7-PHASE MVP TEMPLATE (Pre-defined)
// =============================================================================

export const RSE_7_PHASE_TEMPLATE: {
  name: string;
  description: string;
  phase_definitions: PhaseDefinition[];
  role_definitions: RoleDefinition[];
} = {
  name: "RSE 7-Phase MVP",
  description:
    "A structured 7-phase approach for building MVPs with business clarity, product shape, UX design, architecture, coding, QA, and pilot deployment.",
  phase_definitions: [
    {
      title: "Phase 1: Business Clarity",
      description:
        "Define the problem, business objectives, success metrics, and scope boundaries.",
      blocked_by_index: [],
      assigned_role: "Business Analyst",
      deliverables: [
        {
          title: "PROBLEM_DEFINITION.md",
          description: "Clear statement of the problem being solved",
          artifact_type: "document",
          file_path: "/docs/PROBLEM_DEFINITION.md",
        },
        {
          title: "BUSINESS_OBJECTIVES.md",
          description: "Measurable business goals for the project",
          artifact_type: "document",
          file_path: "/docs/BUSINESS_OBJECTIVES.md",
        },
        {
          title: "SUCCESS_METRICS.md",
          description: "KPIs and metrics to measure success",
          artifact_type: "document",
          file_path: "/docs/SUCCESS_METRICS.md",
        },
        {
          title: "OUT_OF_SCOPE.md",
          description: "Explicit list of what is NOT included",
          artifact_type: "document",
          file_path: "/docs/OUT_OF_SCOPE.md",
        },
      ],
    },
    {
      title: "Phase 2: Product Shape",
      description:
        "Define product requirements, feature boundaries, and user personas.",
      blocked_by_index: [0],
      assigned_role: "Product Manager",
      deliverables: [
        {
          title: "PRD.md",
          description: "Product Requirements Document",
          artifact_type: "document",
          file_path: "/docs/PRD.md",
        },
        {
          title: "MVP_FEATURE_BOUNDARY.md",
          description: "Explicit scope of MVP features",
          artifact_type: "document",
          file_path: "/docs/MVP_FEATURE_BOUNDARY.md",
        },
        {
          title: "WEEKLY_BRIEF_SPEC.md",
          description: "Weekly brief specification format",
          artifact_type: "document",
          file_path: "/docs/WEEKLY_BRIEF_SPEC.md",
        },
        {
          title: "USER_PERSONAS.md",
          description: "Target user definitions",
          artifact_type: "document",
          file_path: "/docs/USER_PERSONAS.md",
        },
      ],
    },
    {
      title: "Phase 3: UX Design",
      description: "Create wireframes, user flows, and UI component designs.",
      blocked_by_index: [1],
      assigned_role: "UX Engineer",
      deliverables: [
        {
          title: "Wireframes",
          description: "Low-fidelity wireframes for all screens",
          artifact_type: "document",
        },
        {
          title: "User Flow Diagrams",
          description: "User journey and interaction flows",
          artifact_type: "document",
        },
        {
          title: "UI Component Specs",
          description: "Component library specifications",
          artifact_type: "document",
        },
        {
          title: "Design System",
          description: "Colors, typography, spacing guidelines",
          artifact_type: "document",
        },
      ],
    },
    {
      title: "Phase 4: Architecture",
      description: "Design system architecture, data models, and API contracts.",
      blocked_by_index: [1, 2],
      assigned_role: "Tech Lead",
      deliverables: [
        {
          title: "ARCHITECTURE.md",
          description: "System architecture document",
          artifact_type: "document",
          file_path: "/docs/ARCHITECTURE.md",
        },
        {
          title: "DATA_MODEL.md",
          description: "Database schema and entity relationships",
          artifact_type: "document",
          file_path: "/docs/DATA_MODEL.md",
        },
        {
          title: "API_CONTRACTS.md",
          description: "API endpoint specifications",
          artifact_type: "document",
          file_path: "/docs/API_CONTRACTS.md",
        },
        {
          title: "TECH_STACK.md",
          description: "Technology choices and rationale",
          artifact_type: "document",
          file_path: "/docs/TECH_STACK.md",
        },
      ],
    },
    {
      title: "Phase 5: Coding",
      description: "Implement features according to architecture and design specs.",
      blocked_by_index: [3],
      assigned_role: "Developer",
      deliverables: [
        {
          title: "Core Features",
          description: "Implementation of core MVP features",
          artifact_type: "code",
        },
        {
          title: "API Implementation",
          description: "Backend API endpoints",
          artifact_type: "code",
        },
        {
          title: "Frontend Implementation",
          description: "UI components and pages",
          artifact_type: "code",
        },
        {
          title: "Integration Tests",
          description: "Tests for feature integration",
          artifact_type: "code",
        },
      ],
    },
    {
      title: "Phase 6: QA & Testing",
      description: "Comprehensive testing, bug fixes, and quality assurance.",
      blocked_by_index: [4],
      assigned_role: "QA Engineer",
      deliverables: [
        {
          title: "Test Plan",
          description: "Comprehensive test strategy document",
          artifact_type: "document",
        },
        {
          title: "Test Results",
          description: "Test execution results and coverage",
          artifact_type: "report",
        },
        {
          title: "Bug Reports",
          description: "Documented issues and resolutions",
          artifact_type: "document",
        },
        {
          title: "Performance Report",
          description: "Load testing and performance metrics",
          artifact_type: "report",
        },
      ],
    },
    {
      title: "Phase 7: Pilot Deployment",
      description: "Deploy to production and monitor with pilot users.",
      blocked_by_index: [5],
      assigned_role: "DevOps",
      deliverables: [
        {
          title: "Deployment Runbook",
          description: "Step-by-step deployment guide",
          artifact_type: "document",
          file_path: "/docs/DEPLOYMENT.md",
        },
        {
          title: "Monitoring Setup",
          description: "Logging, alerting, and monitoring configuration",
          artifact_type: "code",
        },
        {
          title: "Pilot User Guide",
          description: "Documentation for pilot users",
          artifact_type: "document",
        },
        {
          title: "Launch Checklist",
          description: "Pre-launch verification checklist",
          artifact_type: "document",
        },
      ],
    },
  ],
  role_definitions: [
    {
      name: "Business Analyst",
      description: "Defines business requirements and success criteria",
      color: "bg-purple-500",
      is_ai_agent: false,
    },
    {
      name: "Product Manager",
      description: "Owns product vision and feature prioritization",
      color: "bg-blue-500",
      is_ai_agent: false,
    },
    {
      name: "UX Engineer",
      description: "Designs user experience and interfaces",
      color: "bg-pink-500",
      is_ai_agent: false,
    },
    {
      name: "Tech Lead",
      description: "Defines architecture and technical direction",
      color: "bg-green-500",
      is_ai_agent: false,
    },
    {
      name: "Developer",
      description: "Implements features and writes code",
      color: "bg-yellow-500",
      is_ai_agent: false,
    },
    {
      name: "QA Engineer",
      description: "Tests functionality and ensures quality",
      color: "bg-orange-500",
      is_ai_agent: false,
    },
    {
      name: "DevOps",
      description: "Manages deployment and infrastructure",
      color: "bg-red-500",
      is_ai_agent: false,
    },
  ],
};

// Helper to seed the RSE template if needed
export function useCreateRSETemplate() {
  const createTemplate = useCreateTemplate();

  return {
    ...createTemplate,
    mutate: (workspaceId?: string | null) => {
      createTemplate.mutate({
        workspace_id: workspaceId,
        ...RSE_7_PHASE_TEMPLATE,
        is_public: false,
      });
    },
    mutateAsync: async (workspaceId?: string | null) => {
      return createTemplate.mutateAsync({
        workspace_id: workspaceId,
        ...RSE_7_PHASE_TEMPLATE,
        is_public: false,
      });
    },
  };
}

import { z } from "zod";

// Re-export analytics schemas
export * from "./analytics";

// Re-export research schemas
export * from "./research";

// Subtask schema (stored as JSONB array on tasks)
export const SubtaskSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(500),
  completed: z.boolean().default(false),
  priority: z.enum(["p1", "p2", "p3", "p4"]).optional(),
  estimatedMinutes: z.number().min(1).max(480).optional(),
});

// Task schemas
export const TaskPrioritySchema = z.enum(["p1", "p2", "p3", "p4"]);
export const TaskStatusSchema = z.enum(["todo", "progress", "done"]);
export const TaskCategorySchema = z.enum([
  "research",
  "teaching",
  "grants",
  "grad-mentorship",
  "undergrad-mentorship",
  "admin",
  "misc",
  // Academic categories (ported from academic-to-do-app)
  "meeting",
  "analysis",
  "submission",
  "revision",
  "presentation",
  "writing",
  "reading",
  "coursework",
]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workspace_id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  category: TaskCategorySchema.default("misc"),
  priority: TaskPrioritySchema.default("p3"),
  status: TaskStatusSchema.default("todo"),
  due: z.coerce.date().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  assignees: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  completed_at: z.coerce.date().nullable().optional(),
  // Recurrence fields
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().nullable().optional(),
  recurrence_parent_id: z.string().uuid().nullable().optional(),
  recurrence_date: z.coerce.date().nullable().optional(),
  recurrence_exceptions: z.array(z.string()).default([]),
  subtasks: z.array(SubtaskSchema).default([]),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  category: TaskCategorySchema.default("misc"),
  priority: TaskPrioritySchema.default("p3"),
  status: TaskStatusSchema.default("todo"),
  due: z.coerce.date().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  workspace_id: z.string().uuid().nullable().optional(),
  assignees: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  // Recurrence fields
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().nullable().optional(),
  recurrence_parent_id: z.string().uuid().nullable().optional(),
  recurrence_date: z.coerce.date().nullable().optional(),
  recurrence_exceptions: z.array(z.string()).default([]),
  subtasks: z.array(SubtaskSchema).default([]),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

// Project schemas
export const ProjectTypeSchema = z.enum(["manuscript", "grant", "general", "research"]);
export const ProjectStatusSchema = z.enum(["active", "archived", "completed"]);

export const ManuscriptStageSchema = z.enum([
  "idea",
  "outline",
  "drafting",
  "internal-review",
  "submission",
  "revision",
  "accepted",
  "published",
]);

export const GrantStageSchema = z.enum([
  "discovery",
  "fit-assessment",
  "intent-loi",
  "drafting",
  "internal-routing",
  "submission",
  "awarded",
  "active",
  "closeout",
]);

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  type: ProjectTypeSchema,
  title: z.string().min(1).max(500),
  summary: z.string().nullable().optional(),
  status: ProjectStatusSchema.default("active"),
  stage: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateProjectSchema = z.object({
  workspace_id: z.string().uuid(),
  type: ProjectTypeSchema,
  title: z.string().min(1).max(500),
  summary: z.string().nullable().optional(),
  status: ProjectStatusSchema.default("active"),
  stage: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateProjectSchema = CreateProjectSchema.omit({ workspace_id: true }).partial();

// Project Milestone schemas
export const ProjectMilestoneSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  completed_at: z.coerce.date().nullable().optional(),
  sort_order: z.number().default(0),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateProjectMilestoneSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  sort_order: z.number().default(0),
});

export const UpdateProjectMilestoneSchema = CreateProjectMilestoneSchema.omit({ project_id: true }).partial();

// Project Note schemas
export const ProjectNoteSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1),
  is_pinned: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateProjectNoteSchema = z.object({
  project_id: z.string().uuid(),
  content: z.string().min(1),
  is_pinned: z.boolean().default(false),
});

export const UpdateProjectNoteSchema = z.object({
  content: z.string().min(1).optional(),
  is_pinned: z.boolean().optional(),
});

// Project Collaborator schemas
export const ProjectCollaboratorSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  role: z.string().nullable().optional(),
  is_external: z.boolean().default(false),
  created_at: z.coerce.date(),
});

export const CreateProjectCollaboratorSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  role: z.string().nullable().optional(),
  is_external: z.boolean().default(false),
});

// =============================================================================
// Project Hierarchy Schemas (Phases, Workstreams, Deliverables, Roles, Templates)
// =============================================================================

// Phase schemas
export const PhaseStatusSchema = z.enum(["pending", "in_progress", "blocked", "completed"]);

export const ProjectPhaseSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
  status: PhaseStatusSchema.default("pending"),
  started_at: z.coerce.date().nullable().optional(),
  completed_at: z.coerce.date().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  blocked_by: z.array(z.string().uuid()).default([]),
  assigned_role: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateProjectPhaseSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
  due_date: z.coerce.date().nullable().optional(),
  blocked_by: z.array(z.string().uuid()).default([]),
  assigned_role: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateProjectPhaseSchema = CreateProjectPhaseSchema.omit({ project_id: true }).partial().extend({
  status: PhaseStatusSchema.optional(),
});

// Workstream schemas
export const WorkstreamStatusSchema = z.enum(["active", "paused", "completed"]);

export const ProjectWorkstreamSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  color: z.string().default("bg-blue-500"),
  sort_order: z.number().int().default(0),
  status: WorkstreamStatusSchema.default("active"),
  owner_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateProjectWorkstreamSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  color: z.string().default("bg-blue-500"),
  sort_order: z.number().int().default(0),
  owner_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateProjectWorkstreamSchema = CreateProjectWorkstreamSchema.omit({ project_id: true }).partial().extend({
  status: WorkstreamStatusSchema.optional(),
});

// Deliverable schemas
export const DeliverableStatusSchema = z.enum(["pending", "in_progress", "review", "completed"]);
export const DeliverableArtifactTypeSchema = z.enum(["document", "code", "data", "report", "presentation", "other"]);

export const ProjectDeliverableSchema = z.object({
  id: z.string().uuid(),
  phase_id: z.string().uuid(),
  project_id: z.string().uuid(),
  workstream_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  artifact_type: DeliverableArtifactTypeSchema.nullable().optional(),
  file_path: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
  status: DeliverableStatusSchema.default("pending"),
  completed_at: z.coerce.date().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  document_id: z.string().uuid().nullable().optional(),
  url: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateProjectDeliverableSchema = z.object({
  phase_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  workstream_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  artifact_type: DeliverableArtifactTypeSchema.nullable().optional(),
  file_path: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
  due_date: z.coerce.date().nullable().optional(),
  url: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateProjectDeliverableSchema = CreateProjectDeliverableSchema.omit({ phase_id: true }).partial().extend({
  status: DeliverableStatusSchema.optional(),
  document_id: z.string().uuid().nullable().optional(),
});

// Role schemas
export const ProjectRoleSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  color: z.string().default("bg-gray-500"),
  is_ai_agent: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
});

export const CreateProjectRoleSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  color: z.string().default("bg-gray-500"),
  is_ai_agent: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateProjectRoleSchema = CreateProjectRoleSchema.omit({ project_id: true }).partial();

// Phase Assignment schemas
export const PhaseAssignmentTypeSchema = z.enum(["owner", "contributor", "reviewer"]);

export const ProjectPhaseAssignmentSchema = z.object({
  id: z.string().uuid(),
  phase_id: z.string().uuid(),
  role_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  assignment_type: PhaseAssignmentTypeSchema.default("contributor"),
  created_at: z.coerce.date(),
});

export const CreateProjectPhaseAssignmentSchema = z.object({
  phase_id: z.string().uuid(),
  role_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  assignment_type: PhaseAssignmentTypeSchema.default("contributor"),
}).refine(
  (data) => data.role_id !== undefined || data.user_id !== undefined,
  { message: "Either role_id or user_id must be provided" }
);

// Template schemas
export const DeliverableDefinitionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  artifact_type: DeliverableArtifactTypeSchema.nullable().optional(),
  file_path: z.string().nullable().optional(),
});

export const PhaseDefinitionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  blocked_by_index: z.array(z.number().int().min(0)).default([]),
  assigned_role: z.string().nullable().optional(),
  deliverables: z.array(DeliverableDefinitionSchema).default([]),
});

export const RoleDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  is_ai_agent: z.boolean().optional(),
});

export const ProjectTemplateSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  phase_definitions: z.array(PhaseDefinitionSchema),
  role_definitions: z.array(RoleDefinitionSchema).default([]),
  is_public: z.boolean().default(false),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateProjectTemplateSchema = z.object({
  workspace_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  phase_definitions: z.array(PhaseDefinitionSchema),
  role_definitions: z.array(RoleDefinitionSchema).default([]),
  is_public: z.boolean().default(false),
});

export const UpdateProjectTemplateSchema = CreateProjectTemplateSchema.omit({ workspace_id: true }).partial();

// Apply template request schema
export const ApplyTemplateSchema = z.object({
  template_id: z.string().uuid(),
});

// Workspace schemas
export const WorkspaceRoleSchema = z.enum([
  "owner",
  "admin",
  "member",
  "limited",
]);

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  settings: z.record(z.unknown()).default({}),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.coerce.date(),
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes only"),
});

// Profile schemas
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  full_name: z.string().nullable().optional(),
  institution: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const UpdateProfileSchema = z.object({
  full_name: z.string().nullable().optional(),
  institution: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

// Publication schemas
export const PublicationStatusSchema = z.enum([
  "idea",
  "drafting",
  "internal-review",
  "submitted",
  "under-review",
  "revision",
  "accepted",
  "in-press",
  "published",
]);

export const PublicationTypeSchema = z.enum([
  "journal-article",
  "conference-paper",
  "book-chapter",
  "book",
  "preprint",
  "thesis",
  "report",
  "other",
]);

export const AuthorRoleSchema = z.enum([
  "first",
  "corresponding",
  "co-first",
  "middle",
  "last",
  "senior",
]);

export const PublicationSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(1000),
  abstract: z.string().nullable().optional(),
  publication_type: PublicationTypeSchema.default("journal-article"),
  status: PublicationStatusSchema.default("idea"),
  journal: z.string().nullable().optional(),
  volume: z.string().nullable().optional(),
  issue: z.string().nullable().optional(),
  pages: z.string().nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  doi: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  pmid: z.string().nullable().optional(),
  arxiv_id: z.string().nullable().optional(),
  orcid_work_id: z.string().nullable().optional(),
  submitted_at: z.coerce.date().nullable().optional(),
  accepted_at: z.coerce.date().nullable().optional(),
  published_at: z.coerce.date().nullable().optional(),
  target_journal: z.string().nullable().optional(),
  target_deadline: z.coerce.date().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  citation_count: z.number().int().default(0),
  citation_data: z.record(z.unknown()).default({}),
  bibtex: z.string().nullable().optional(),
  bibtex_key: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreatePublicationSchema = z.object({
  workspace_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(1000),
  abstract: z.string().nullable().optional(),
  publication_type: PublicationTypeSchema.default("journal-article"),
  status: PublicationStatusSchema.default("idea"),
  journal: z.string().nullable().optional(),
  volume: z.string().nullable().optional(),
  issue: z.string().nullable().optional(),
  pages: z.string().nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  doi: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  pmid: z.string().nullable().optional(),
  arxiv_id: z.string().nullable().optional(),
  target_journal: z.string().nullable().optional(),
  target_deadline: z.coerce.date().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  bibtex: z.string().nullable().optional(),
  bibtex_key: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdatePublicationSchema = CreatePublicationSchema.partial();

export const PublicationAuthorSchema = z.object({
  id: z.string().uuid(),
  publication_id: z.string().uuid(),
  personnel_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  affiliation: z.string().nullable().optional(),
  orcid: z.string().nullable().optional(),
  author_order: z.number().int().min(1).default(1),
  author_role: AuthorRoleSchema.default("middle"),
  is_corresponding: z.boolean().default(false),
  created_at: z.coerce.date(),
});

export const CreatePublicationAuthorSchema = z.object({
  publication_id: z.string().uuid(),
  personnel_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  affiliation: z.string().nullable().optional(),
  orcid: z.string().nullable().optional(),
  author_order: z.number().int().min(1).default(1),
  author_role: AuthorRoleSchema.default("middle"),
  is_corresponding: z.boolean().default(false),
});

// Export inferred types
export type TaskSchemaType = z.infer<typeof TaskSchema>;
export type SubtaskSchemaType = z.infer<typeof SubtaskSchema>;
export type CreateTaskSchemaType = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskSchemaType = z.infer<typeof UpdateTaskSchema>;
export type ProjectSchemaType = z.infer<typeof ProjectSchema>;
export type CreateProjectSchemaType = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectSchemaType = z.infer<typeof UpdateProjectSchema>;
export type ProjectMilestoneSchemaType = z.infer<typeof ProjectMilestoneSchema>;
export type CreateProjectMilestoneSchemaType = z.infer<typeof CreateProjectMilestoneSchema>;
export type UpdateProjectMilestoneSchemaType = z.infer<typeof UpdateProjectMilestoneSchema>;
export type ProjectNoteSchemaType = z.infer<typeof ProjectNoteSchema>;
export type CreateProjectNoteSchemaType = z.infer<typeof CreateProjectNoteSchema>;
export type UpdateProjectNoteSchemaType = z.infer<typeof UpdateProjectNoteSchema>;
export type ProjectCollaboratorSchemaType = z.infer<typeof ProjectCollaboratorSchema>;
export type CreateProjectCollaboratorSchemaType = z.infer<typeof CreateProjectCollaboratorSchema>;
export type WorkspaceSchemaType = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceSchemaType = z.infer<typeof CreateWorkspaceSchema>;
export type ProfileSchemaType = z.infer<typeof ProfileSchema>;
export type UpdateProfileSchemaType = z.infer<typeof UpdateProfileSchema>;
export type PublicationSchemaType = z.infer<typeof PublicationSchema>;
export type CreatePublicationSchemaType = z.infer<typeof CreatePublicationSchema>;
export type UpdatePublicationSchemaType = z.infer<typeof UpdatePublicationSchema>;
export type PublicationAuthorSchemaType = z.infer<typeof PublicationAuthorSchema>;
export type CreatePublicationAuthorSchemaType = z.infer<typeof CreatePublicationAuthorSchema>;

// Export inferred hierarchy types
export type ProjectPhaseSchemaType = z.infer<typeof ProjectPhaseSchema>;
export type CreateProjectPhaseSchemaType = z.infer<typeof CreateProjectPhaseSchema>;
export type UpdateProjectPhaseSchemaType = z.infer<typeof UpdateProjectPhaseSchema>;
export type ProjectWorkstreamSchemaType = z.infer<typeof ProjectWorkstreamSchema>;
export type CreateProjectWorkstreamSchemaType = z.infer<typeof CreateProjectWorkstreamSchema>;
export type UpdateProjectWorkstreamSchemaType = z.infer<typeof UpdateProjectWorkstreamSchema>;
export type ProjectDeliverableSchemaType = z.infer<typeof ProjectDeliverableSchema>;
export type CreateProjectDeliverableSchemaType = z.infer<typeof CreateProjectDeliverableSchema>;
export type UpdateProjectDeliverableSchemaType = z.infer<typeof UpdateProjectDeliverableSchema>;
export type ProjectRoleSchemaType = z.infer<typeof ProjectRoleSchema>;
export type CreateProjectRoleSchemaType = z.infer<typeof CreateProjectRoleSchema>;
export type UpdateProjectRoleSchemaType = z.infer<typeof UpdateProjectRoleSchema>;
export type ProjectPhaseAssignmentSchemaType = z.infer<typeof ProjectPhaseAssignmentSchema>;
export type CreateProjectPhaseAssignmentSchemaType = z.infer<typeof CreateProjectPhaseAssignmentSchema>;
export type PhaseDefinitionSchemaType = z.infer<typeof PhaseDefinitionSchema>;
export type DeliverableDefinitionSchemaType = z.infer<typeof DeliverableDefinitionSchema>;
export type RoleDefinitionSchemaType = z.infer<typeof RoleDefinitionSchema>;
export type ProjectTemplateSchemaType = z.infer<typeof ProjectTemplateSchema>;
export type CreateProjectTemplateSchemaType = z.infer<typeof CreateProjectTemplateSchema>;
export type UpdateProjectTemplateSchemaType = z.infer<typeof UpdateProjectTemplateSchema>;
export type ApplyTemplateSchemaType = z.infer<typeof ApplyTemplateSchema>;

// =============================================================================
// Task Template Schemas (academic task templates for quick creation)
// =============================================================================

export const TaskTemplateSubtaskSchema = z.object({
  text: z.string().min(1).max(500),
  priority: TaskPrioritySchema.default("p3"),
  estimated_minutes: z.number().min(1).max(480).optional(),
});

export const TaskTemplateSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  default_category: TaskCategorySchema.nullable().optional(),
  default_priority: TaskPrioritySchema.default("p3"),
  default_assigned_to: z.string().uuid().nullable().optional(),
  subtasks: z.array(TaskTemplateSubtaskSchema).default([]),
  is_shared: z.boolean().default(true),
  is_builtin: z.boolean().default(false),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateTaskTemplateSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  default_category: TaskCategorySchema.nullable().optional(),
  default_priority: TaskPrioritySchema.default("p3"),
  default_assigned_to: z.string().uuid().nullable().optional(),
  subtasks: z.array(TaskTemplateSubtaskSchema).default([]),
  is_shared: z.boolean().default(true),
});

export const UpdateTaskTemplateSchema = CreateTaskTemplateSchema.omit({ workspace_id: true }).partial();

// Export inferred task template types
export type TaskTemplateSchemaType = z.infer<typeof TaskTemplateSchema>;
export type CreateTaskTemplateSchemaType = z.infer<typeof CreateTaskTemplateSchema>;
export type UpdateTaskTemplateSchemaType = z.infer<typeof UpdateTaskTemplateSchema>;
export type TaskTemplateSubtaskSchemaType = z.infer<typeof TaskTemplateSubtaskSchema>;

// Chat and messaging schemas
export const MessageReactionTypeSchema = z.enum([
  "heart",
  "thumbsup",
  "thumbsdown",
  "haha",
  "exclamation",
  "question",
]);

export const PresenceStatusSchema = z.enum(["online", "away", "dnd", "offline"]);

export const MessageReactionSchema = z.object({
  user_id: z.string().uuid(),
  reaction: MessageReactionTypeSchema,
  created_at: z.string(),
});

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  text: z.string().min(1).max(10000),
  recipient_id: z.string().uuid().nullable(),
  related_task_id: z.string().uuid().nullable(),
  related_project_id: z.string().uuid().nullable(),
  reply_to_id: z.string().uuid().nullable(),
  reply_to_preview: z.string().nullable(),
  reply_to_user_id: z.string().uuid().nullable(),
  reactions: z.array(MessageReactionSchema).default([]),
  read_by: z.array(z.string().uuid()).default([]),
  mentions: z.array(z.string().uuid()).default([]),
  edited_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
  is_pinned: z.boolean().default(false),
  pinned_by: z.string().uuid().nullable(),
  pinned_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateMessageSchema = z.object({
  workspace_id: z.string().uuid(),
  text: z.string().min(1).max(10000),
  recipient_id: z.string().uuid().nullable().optional(),
  related_task_id: z.string().uuid().nullable().optional(),
  related_project_id: z.string().uuid().nullable().optional(),
  reply_to_id: z.string().uuid().nullable().optional(),
  mentions: z.array(z.string().uuid()).default([]),
});

export const UpdateMessageSchema = z.object({
  text: z.string().min(1).max(10000).optional(),
  is_pinned: z.boolean().optional(),
});

export const AddReactionSchema = z.object({
  reaction: MessageReactionTypeSchema,
});

// Activity schemas
export const ActivityActionSchema = z.enum([
  // Task actions
  "task_created",
  "task_updated",
  "task_deleted",
  "task_completed",
  "task_reopened",
  "task_assigned",
  "task_priority_changed",
  "task_due_date_changed",
  "task_status_changed",
  "subtask_added",
  "subtask_completed",
  "subtask_deleted",
  "notes_updated",
  // Project actions
  "project_created",
  "project_updated",
  "project_stage_changed",
  "project_milestone_completed",
  // Phase actions
  "phase_created",
  "phase_started",
  "phase_completed",
  "phase_blocked",
  // Workstream actions
  "workstream_created",
  "workstream_updated",
  // Deliverable actions
  "deliverable_created",
  "deliverable_completed",
  // Role actions
  "role_assigned",
  // Template actions
  "template_applied",
  // Chat actions
  "message_sent",
  "message_pinned",
  // AI actions
  "ai_tasks_extracted",
  "ai_task_enhanced",
  "ai_task_breakdown",
]);

export const ActivityEntrySchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: ActivityActionSchema,
  task_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  message_id: z.string().uuid().nullable(),
  entity_title: z.string().nullable(),
  details: z.record(z.unknown()).default({}),
  created_at: z.string(),
});

export const CreateActivitySchema = z.object({
  workspace_id: z.string().uuid(),
  action: ActivityActionSchema,
  task_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  message_id: z.string().uuid().nullable().optional(),
  entity_title: z.string().nullable().optional(),
  details: z.record(z.unknown()).default({}),
});

// User presence schemas
export const UserPresenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  status: PresenceStatusSchema,
  is_typing: z.boolean().default(false),
  typing_in_conversation: z.string().nullable(),
  last_seen: z.string(),
  last_active: z.string(),
  custom_status: z.string().nullable(),
});

export const UpdatePresenceSchema = z.object({
  status: PresenceStatusSchema.optional(),
  is_typing: z.boolean().optional(),
  typing_in_conversation: z.string().nullable().optional(),
  custom_status: z.string().nullable().optional(),
});

// AI Smart Parse schemas
export const SmartParseSubtaskSchema = z.object({
  text: z.string().min(1).max(500),
  priority: TaskPrioritySchema,
  estimated_minutes: z.number().min(5).max(480).optional(),
});

export const SmartParseResultSchema = z.object({
  main_task: z.object({
    title: z.string().min(1).max(500),
    description: z.string().optional(),
    category: TaskCategorySchema.optional(),
    priority: TaskPrioritySchema,
    due_date: z.string().optional(),
    assigned_to: z.string().optional(),
    project_id: z.string().uuid().optional(),
  }),
  subtasks: z.array(SmartParseSubtaskSchema).default([]),
  summary: z.string().max(500),
  was_complex: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const SmartParseRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  workspace_id: z.string().uuid(),
});

// Export inferred chat types
export type ChatMessageSchemaType = z.infer<typeof ChatMessageSchema>;
export type CreateMessageSchemaType = z.infer<typeof CreateMessageSchema>;
export type UpdateMessageSchemaType = z.infer<typeof UpdateMessageSchema>;
export type ActivityEntrySchemaType = z.infer<typeof ActivityEntrySchema>;
export type CreateActivitySchemaType = z.infer<typeof CreateActivitySchema>;
export type UserPresenceSchemaType = z.infer<typeof UserPresenceSchema>;
export type UpdatePresenceSchemaType = z.infer<typeof UpdatePresenceSchema>;
export type SmartParseResultSchemaType = z.infer<typeof SmartParseResultSchema>;
export type SmartParseRequestSchemaType = z.infer<typeof SmartParseRequestSchema>;

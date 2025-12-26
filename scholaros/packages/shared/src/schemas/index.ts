import { z } from "zod";

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
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

// Project schemas
export const ProjectTypeSchema = z.enum(["manuscript", "grant", "general"]);
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

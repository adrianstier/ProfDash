import { z } from "zod";

// Re-export analytics schemas
export * from "./analytics";

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
  "project_created",
  "project_updated",
  "project_stage_changed",
  "project_milestone_completed",
  "message_sent",
  "message_pinned",
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

// Re-export agent types
export * from "./agents";

// Re-export chat types
export * from "./chat";

// Re-export analytics types
export * from "./analytics";

// Re-export research types
export * from "./research";

// Subtask type (stored as JSONB array on tasks)
export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  priority?: TaskPriority;
  estimatedMinutes?: number;
}

// Task types
export type TaskPriority = "p1" | "p2" | "p3" | "p4";
export type TaskStatus = "todo" | "progress" | "done";
export type TaskCategory =
  | "research"
  | "teaching"
  | "grants"
  | "grad-mentorship"
  | "undergrad-mentorship"
  | "admin"
  | "misc"
  // Academic categories (ported from academic-to-do-app)
  | "meeting"
  | "analysis"
  | "submission"
  | "revision"
  | "presentation"
  | "writing"
  | "reading"
  | "coursework";

export interface Task {
  id: string;
  user_id: string;
  workspace_id?: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due?: Date | null;
  project_id?: string | null;
  assignees?: string[];
  tags?: string[];
  completed_at?: Date | null;
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  recurrence_parent_id?: string | null;
  recurrence_date?: Date | null;
  recurrence_exceptions?: string[];
  subtasks?: Subtask[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Task type for API responses where dates are serialized as ISO strings
 * Use this type when working with data from API endpoints
 */
export interface TaskFromAPI {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due?: string | null;
  project_id?: string | null;
  assignees?: string[];
  tags?: string[];
  completed_at?: string | null;
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  recurrence_parent_id?: string | null;
  recurrence_date?: string | null;
  recurrence_exceptions?: string[];
  subtasks?: Subtask[];
  created_at: string;
  updated_at: string;
}

export type CreateTask = Omit<Task, "id" | "created_at" | "updated_at">;
export type UpdateTask = Partial<CreateTask>;

// Task template types
export interface TaskTemplateSubtask {
  text: string;
  priority: TaskPriority;
  estimated_minutes?: number;
}

export interface TaskTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  default_category?: TaskCategory | null;
  default_priority: TaskPriority;
  default_assigned_to?: string | null;
  subtasks: TaskTemplateSubtask[];
  is_shared: boolean;
  is_builtin: boolean;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskTemplateFromAPI extends Omit<TaskTemplate, "created_at" | "updated_at"> {
  created_at: string;
  updated_at: string;
}

export type CreateTaskTemplate = Omit<TaskTemplate, "id" | "is_builtin" | "created_by" | "created_at" | "updated_at">;
export type UpdateTaskTemplate = Partial<Omit<CreateTaskTemplate, "workspace_id">>;

// Project types
export type ProjectType = "manuscript" | "grant" | "general" | "research";
export type ProjectStatus = "active" | "archived" | "completed";

export type ManuscriptStage =
  | "idea"
  | "outline"
  | "drafting"
  | "internal-review"
  | "submission"
  | "revision"
  | "accepted"
  | "published";

export type GrantStage =
  | "discovery"
  | "fit-assessment"
  | "intent-loi"
  | "drafting"
  | "internal-routing"
  | "submission"
  | "awarded"
  | "active"
  | "closeout";

export interface Project {
  id: string;
  workspace_id: string;
  type: ProjectType;
  title: string;
  summary?: string | null;
  status: ProjectStatus;
  stage?: ManuscriptStage | GrantStage | string;
  due_date?: Date | null;
  owner_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type CreateProject = Omit<Project, "id" | "created_at" | "updated_at">;
export type UpdateProject = Partial<CreateProject>;

// Project Milestone types
export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: Date | null;
  completed_at?: Date | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export type CreateProjectMilestone = Omit<ProjectMilestone, "id" | "created_at" | "updated_at">;
export type UpdateProjectMilestone = Partial<CreateProjectMilestone>;

// Project Note types
export interface ProjectNote {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export type CreateProjectNote = Omit<ProjectNote, "id" | "created_at" | "updated_at">;
export type UpdateProjectNote = Partial<CreateProjectNote>;

// Project Collaborator types
export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id?: string | null;
  name: string;
  email?: string | null;
  role?: string | null;
  is_external: boolean;
  created_at: Date;
}

export type CreateProjectCollaborator = Omit<ProjectCollaborator, "id" | "created_at">;

// Extended Project with relations
export interface ProjectWithDetails extends Project {
  milestones?: ProjectMilestone[];
  notes?: ProjectNote[];
  collaborators?: ProjectCollaborator[];
  tasks?: Task[];
  task_count?: number;
  completed_task_count?: number;
}

// =============================================================================
// Project Hierarchy Types (Phases, Workstreams, Deliverables, Roles, Templates)
// =============================================================================

// Phase types
export type PhaseStatus = "pending" | "in_progress" | "blocked" | "completed";

export interface ProjectPhase {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  status: PhaseStatus;
  started_at?: Date | null;
  completed_at?: Date | null;
  due_date?: Date | null;
  blocked_by: string[]; // Phase IDs that must complete first
  assigned_role?: string | null; // Primary role name
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectPhaseFromAPI
  extends Omit<ProjectPhase, "started_at" | "completed_at" | "due_date" | "created_at" | "updated_at"> {
  started_at?: string | null;
  completed_at?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateProjectPhase = Pick<ProjectPhase, "project_id" | "title"> &
  Partial<Pick<ProjectPhase, "description" | "sort_order" | "due_date" | "blocked_by" | "assigned_role" | "metadata">>;

export type UpdateProjectPhase = Partial<Omit<CreateProjectPhase, "project_id">> &
  Partial<Pick<ProjectPhase, "status">>;

// Workstream types
export type WorkstreamStatus = "active" | "paused" | "completed";

export interface ProjectWorkstream {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  color: string;
  sort_order: number;
  status: WorkstreamStatus;
  owner_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectWorkstreamFromAPI
  extends Omit<ProjectWorkstream, "created_at" | "updated_at"> {
  created_at: string;
  updated_at: string;
}

export type CreateProjectWorkstream = Pick<ProjectWorkstream, "project_id" | "title"> &
  Partial<Pick<ProjectWorkstream, "description" | "color" | "sort_order" | "owner_id" | "metadata">>;

export type UpdateProjectWorkstream = Partial<Omit<CreateProjectWorkstream, "project_id">> &
  Partial<Pick<ProjectWorkstream, "status">>;

// Deliverable types
export type DeliverableStatus = "pending" | "in_progress" | "review" | "completed";
export type DeliverableArtifactType = "document" | "code" | "data" | "report" | "presentation" | "other";

export interface ProjectDeliverable {
  id: string;
  phase_id: string;
  project_id: string;
  workstream_id?: string | null; // NULL = shared across workstreams
  title: string;
  description?: string | null;
  artifact_type?: DeliverableArtifactType | null;
  file_path?: string | null;
  sort_order: number;
  status: DeliverableStatus;
  completed_at?: Date | null;
  due_date?: Date | null;
  document_id?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectDeliverableFromAPI
  extends Omit<ProjectDeliverable, "completed_at" | "due_date" | "created_at" | "updated_at"> {
  completed_at?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateProjectDeliverable = Pick<ProjectDeliverable, "phase_id" | "title"> &
  Partial<Pick<ProjectDeliverable, "workstream_id" | "description" | "artifact_type" | "file_path" | "sort_order" | "due_date" | "url" | "metadata">>;

export type UpdateProjectDeliverable = Partial<Omit<CreateProjectDeliverable, "phase_id">> &
  Partial<Pick<ProjectDeliverable, "status" | "document_id">>;

// Role types
export interface ProjectRole {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  color: string;
  is_ai_agent: boolean;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface ProjectRoleFromAPI extends Omit<ProjectRole, "created_at"> {
  created_at: string;
}

export type CreateProjectRole = Pick<ProjectRole, "project_id" | "name"> &
  Partial<Pick<ProjectRole, "description" | "color" | "is_ai_agent" | "metadata">>;

export type UpdateProjectRole = Partial<Omit<CreateProjectRole, "project_id">>;

// Phase Assignment types
export type PhaseAssignmentType = "owner" | "contributor" | "reviewer";

export interface ProjectPhaseAssignment {
  id: string;
  phase_id: string;
  role_id?: string | null;
  user_id?: string | null;
  assignment_type: PhaseAssignmentType;
  created_at: Date;
}

export interface ProjectPhaseAssignmentFromAPI extends Omit<ProjectPhaseAssignment, "created_at"> {
  created_at: string;
  role?: ProjectRoleFromAPI | null;
  user?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export type CreateProjectPhaseAssignment = Pick<ProjectPhaseAssignment, "phase_id"> &
  Partial<Pick<ProjectPhaseAssignment, "role_id" | "user_id" | "assignment_type">>;

// Template types
export interface PhaseDefinition {
  title: string;
  description?: string | null;
  blocked_by_index: number[]; // Indexes of phases that must complete first
  assigned_role?: string | null;
  deliverables: DeliverableDefinition[];
}

export interface DeliverableDefinition {
  title: string;
  description?: string | null;
  artifact_type?: DeliverableArtifactType | null;
  file_path?: string | null;
}

export interface RoleDefinition {
  name: string;
  description?: string | null;
  color?: string;
  is_ai_agent?: boolean;
}

export interface ProjectTemplate {
  id: string;
  workspace_id?: string | null; // NULL = global template
  name: string;
  description?: string | null;
  phase_definitions: PhaseDefinition[];
  role_definitions: RoleDefinition[];
  is_public: boolean;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectTemplateFromAPI extends Omit<ProjectTemplate, "created_at" | "updated_at"> {
  created_at: string;
  updated_at: string;
}

export type CreateProjectTemplate = Pick<ProjectTemplate, "name" | "phase_definitions"> &
  Partial<Pick<ProjectTemplate, "workspace_id" | "description" | "role_definitions" | "is_public">>;

export type UpdateProjectTemplate = Partial<Omit<CreateProjectTemplate, "workspace_id">>;

// Extended types with relations
export interface ProjectPhaseWithDetails extends ProjectPhaseFromAPI {
  deliverables?: ProjectDeliverableFromAPI[];
  assignments?: ProjectPhaseAssignmentFromAPI[];
  tasks?: TaskFromAPI[];
  blocking_phases?: ProjectPhaseFromAPI[]; // Phases this one is waiting on
  blocked_phases?: ProjectPhaseFromAPI[]; // Phases waiting on this one
  deliverable_count?: number;
  completed_deliverable_count?: number;
}

export interface ProjectWorkstreamWithDetails extends ProjectWorkstreamFromAPI {
  task_count?: number;
  completed_task_count?: number;
  owner?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface ProjectWithHierarchy extends ProjectWithDetails {
  phases?: ProjectPhaseWithDetails[];
  workstreams?: ProjectWorkstreamWithDetails[];
  roles?: ProjectRoleFromAPI[];
}

// Workspace types
export type WorkspaceRole = "owner" | "admin" | "member" | "limited";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
  created_by?: string | null;
  created_at: Date;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by?: string | null;
  joined_at: Date;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string;
  expires_at: Date;
  created_at: Date;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  member_count?: number;
}

// User types
export interface Profile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  institution?: string | null;
  department?: string | null;
  title?: string | null;
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

// Grant opportunity types
export interface FundingOpportunity {
  id: string;
  external_id?: string | null;
  source: string;
  title: string;
  agency?: string | null;
  agency_code?: string | null;
  mechanism?: string | null;
  description?: string | null;
  eligibility?: Record<string, unknown>;
  deadline?: Date | null;
  posted_date?: Date | null;
  amount_min?: number | null;
  amount_max?: number | null;
  award_ceiling?: number | null;
  award_floor?: number | null;
  expected_awards?: number | null;
  cfda_numbers?: string[];
  opportunity_number?: string | null;
  opportunity_status?: string | null;
  funding_instrument_type?: string | null;
  category_funding_activity?: string | null;
  url?: string | null;
  raw_data?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type WatchlistStatus = "watching" | "applying" | "submitted" | "awarded" | "declined" | "archived";
export type WatchlistPriority = "low" | "medium" | "high";

export interface OpportunityWatchlist {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  project_id?: string | null;
  notes?: string | null;
  status: WatchlistStatus;
  fit_score?: number | null;
  fit_notes?: Record<string, unknown>;
  priority: WatchlistPriority;
  internal_deadline?: Date | null;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OpportunityWithWatchlist extends FundingOpportunity {
  watchlist?: OpportunityWatchlist;
}

export type AlertFrequency = "daily" | "weekly" | "monthly" | "none";

export interface SavedSearch {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  query: GrantSearchQuery;
  alert_frequency: AlertFrequency;
  last_alerted_at?: Date | null;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface GrantSearchQuery {
  keywords?: string;
  agency?: string;
  funding_type?: string;
  amount_min?: number;
  amount_max?: number;
  deadline_from?: string;
  deadline_to?: string;
  cfda_number?: string;
}

// Calendar types
export type CalendarProvider = "google";

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: Date | null;
  selected_calendars: string[];
  sync_enabled: boolean;
  last_sync_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  external_id: string;
  calendar_id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start_time: Date;
  end_time: Date;
  all_day: boolean;
  status?: string | null;
  raw_data?: Record<string, unknown>;
  synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  selected?: boolean;
}

// Personnel types
export type PersonnelRole =
  | "phd-student"
  | "postdoc"
  | "undergrad"
  | "staff"
  | "collaborator";

export interface Personnel {
  id: string;
  workspace_id?: string;
  user_id: string;
  name: string;
  role: PersonnelRole;
  year?: number | null;
  funding?: string | null;
  email?: string | null;
  last_meeting?: Date | null;
  milestones?: Record<string, unknown>[];
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

// Publication types
export type PublicationStatus =
  | "idea"
  | "drafting"
  | "internal-review"
  | "submitted"
  | "under-review"
  | "revision"
  | "accepted"
  | "in-press"
  | "published";

export type PublicationType =
  | "journal-article"
  | "conference-paper"
  | "book-chapter"
  | "book"
  | "preprint"
  | "thesis"
  | "report"
  | "other";

export type AuthorRole =
  | "first"
  | "corresponding"
  | "co-first"
  | "middle"
  | "last"
  | "senior";

export interface Publication {
  id: string;
  workspace_id?: string | null;
  user_id: string;
  title: string;
  abstract?: string | null;
  publication_type: PublicationType;
  status: PublicationStatus;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  year?: number | null;
  doi?: string | null;
  url?: string | null;
  pmid?: string | null;
  arxiv_id?: string | null;
  orcid_work_id?: string | null;
  submitted_at?: Date | null;
  accepted_at?: Date | null;
  published_at?: Date | null;
  target_journal?: string | null;
  target_deadline?: Date | null;
  keywords?: string[];
  citation_count?: number;
  citation_data?: Record<string, unknown>;
  bibtex?: string | null;
  bibtex_key?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface PublicationFromAPI extends Omit<Publication, "submitted_at" | "accepted_at" | "published_at" | "target_deadline" | "created_at" | "updated_at"> {
  submitted_at?: string | null;
  accepted_at?: string | null;
  published_at?: string | null;
  target_deadline?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreatePublication = Omit<Publication, "id" | "user_id" | "created_at" | "updated_at">;
export type UpdatePublication = Partial<CreatePublication>;

export interface PublicationAuthor {
  id: string;
  publication_id: string;
  personnel_id?: string | null;
  name: string;
  email?: string | null;
  affiliation?: string | null;
  orcid?: string | null;
  author_order: number;
  author_role: AuthorRole;
  is_corresponding: boolean;
  created_at: Date;
}

export type CreatePublicationAuthor = Omit<PublicationAuthor, "id" | "created_at">;

export interface PublicationProject {
  id: string;
  publication_id: string;
  project_id: string;
  created_at: Date;
}

export interface PublicationGrant {
  id: string;
  publication_id: string;
  project_id?: string | null;
  watchlist_id?: string | null;
  grant_number?: string | null;
  agency?: string | null;
  grant_title?: string | null;
  acknowledgment_text?: string | null;
  created_at: Date;
}

export interface PublicationFile {
  id: string;
  publication_id: string;
  document_id?: string | null;
  file_type: string;
  version: number;
  label?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  created_at: Date;
}

// Extended Publication with relations
export interface PublicationWithDetails extends Publication {
  authors?: PublicationAuthor[];
  projects?: PublicationProject[];
  grants?: PublicationGrant[];
  files?: PublicationFile[];
}

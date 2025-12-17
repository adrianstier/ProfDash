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
  | "misc";

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
  created_at: Date;
  updated_at: Date;
}

export type CreateTask = Omit<Task, "id" | "created_at" | "updated_at">;
export type UpdateTask = Partial<CreateTask>;

// Project types
export type ProjectType = "manuscript" | "grant" | "general";
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

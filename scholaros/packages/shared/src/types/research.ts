// =============================================================================
// Research Project Types
// Types for multi-experiment research projects with field sites, permits, and fieldwork
// =============================================================================

// -----------------------------------------------------------------------------
// Field Sites
// -----------------------------------------------------------------------------

export interface FieldSiteLocation {
  lat?: number;
  lng?: number;
  address?: string;
  country?: string;
  region?: string;
}

export interface FieldSiteContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface FieldSite {
  id: string;
  workspace_id: string;
  name: string;
  code?: string | null;
  location: FieldSiteLocation;
  timezone: string;
  description?: string | null;
  logistics_notes?: string | null;
  access_requirements: string[]; // ["IACUC", "collection", "CITES"]
  contacts: FieldSiteContact[];
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface FieldSiteFromAPI
  extends Omit<FieldSite, "created_at" | "updated_at"> {
  created_at: string;
  updated_at: string;
}

export type CreateFieldSite = Pick<FieldSite, "workspace_id" | "name"> &
  Partial<
    Pick<
      FieldSite,
      | "code"
      | "location"
      | "timezone"
      | "description"
      | "logistics_notes"
      | "access_requirements"
      | "contacts"
      | "is_active"
      | "metadata"
    >
  >;

export type UpdateFieldSite = Partial<Omit<CreateFieldSite, "workspace_id">>;

// -----------------------------------------------------------------------------
// Experiments
// -----------------------------------------------------------------------------

export type ExperimentStatus =
  | "planning"
  | "active"
  | "fieldwork"
  | "analysis"
  | "completed"
  | "on_hold";

export interface ExperimentProtocol {
  name: string;
  version?: string;
  url?: string;
}

export interface ExperimentEquipment {
  item: string;
  quantity?: number;
  notes?: string;
}

export interface Experiment {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  code?: string | null;
  description?: string | null;
  site_id?: string | null;
  status: ExperimentStatus;
  lead_id?: string | null;
  start_date?: Date | null;
  end_date?: Date | null;
  fieldwork_start?: Date | null;
  fieldwork_end?: Date | null;
  protocols: ExperimentProtocol[];
  equipment_needs: ExperimentEquipment[];
  sample_targets: Record<string, number>;
  hypothesis?: string | null;
  objectives: string[];
  color: string;
  sort_order: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ExperimentFromAPI
  extends Omit<
    Experiment,
    | "start_date"
    | "end_date"
    | "fieldwork_start"
    | "fieldwork_end"
    | "created_at"
    | "updated_at"
  > {
  start_date?: string | null;
  end_date?: string | null;
  fieldwork_start?: string | null;
  fieldwork_end?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateExperiment = Pick<
  Experiment,
  "project_id" | "workspace_id" | "title"
> &
  Partial<
    Pick<
      Experiment,
      | "code"
      | "description"
      | "site_id"
      | "status"
      | "lead_id"
      | "start_date"
      | "end_date"
      | "fieldwork_start"
      | "fieldwork_end"
      | "protocols"
      | "equipment_needs"
      | "sample_targets"
      | "hypothesis"
      | "objectives"
      | "color"
      | "sort_order"
      | "metadata"
    >
  >;

export type UpdateExperiment = Partial<
  Omit<CreateExperiment, "project_id" | "workspace_id">
>;

// Extended experiment with relations
export interface ExperimentWithDetails extends ExperimentFromAPI {
  site?: FieldSiteFromAPI | null;
  lead?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  team_count?: number;
  fieldwork_count?: number;
  task_count?: number;
}

// -----------------------------------------------------------------------------
// Permits
// -----------------------------------------------------------------------------

export type PermitType =
  | "IACUC"
  | "IBC"
  | "collection"
  | "CITES"
  | "export"
  | "import"
  | "IRB"
  | "MOU"
  | "institutional"
  | "other";

export type PermitStatus =
  | "pending"
  | "active"
  | "expired"
  | "renewal_pending"
  | "suspended";

export interface PermitDocument {
  name: string;
  url: string;
  uploaded_at?: string;
}

export interface Permit {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  experiment_id?: string | null;
  site_id?: string | null;
  permit_type: PermitType;
  permit_number?: string | null;
  title: string;
  issuing_authority?: string | null;
  pi_name?: string | null;
  start_date?: Date | null;
  expiration_date?: Date | null;
  status: PermitStatus;
  renewal_reminder_days: number;
  documents: PermitDocument[];
  notes?: string | null;
  conditions?: string | null;
  coverage_scope?: string | null;
  linked_permits: string[];
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface PermitFromAPI
  extends Omit<Permit, "start_date" | "expiration_date" | "created_at" | "updated_at"> {
  start_date?: string | null;
  expiration_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreatePermit = Pick<
  Permit,
  "workspace_id" | "permit_type" | "title"
> &
  Partial<
    Pick<
      Permit,
      | "project_id"
      | "experiment_id"
      | "site_id"
      | "permit_number"
      | "issuing_authority"
      | "pi_name"
      | "start_date"
      | "expiration_date"
      | "status"
      | "renewal_reminder_days"
      | "documents"
      | "notes"
      | "conditions"
      | "coverage_scope"
      | "linked_permits"
      | "metadata"
    >
  >;

export type UpdatePermit = Partial<Omit<CreatePermit, "workspace_id">>;

// Extended permit with relations
export interface PermitWithDetails extends PermitFromAPI {
  project?: { id: string; title: string } | null;
  experiment?: { id: string; title: string } | null;
  site?: { id: string; name: string } | null;
  days_until_expiration?: number | null;
}

// -----------------------------------------------------------------------------
// Experiment Team Assignments
// -----------------------------------------------------------------------------

export type ExperimentTeamRole =
  | "lead"
  | "co_lead"
  | "contributor"
  | "field_assistant"
  | "data_analyst"
  | "consultant";

export interface ExperimentTeamAssignment {
  id: string;
  experiment_id: string;
  personnel_id: string;
  role: ExperimentTeamRole;
  site_access: string[]; // field_site IDs
  start_date?: Date | null;
  end_date?: Date | null;
  time_commitment?: string | null;
  responsibilities?: string | null;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExperimentTeamAssignmentFromAPI
  extends Omit<
    ExperimentTeamAssignment,
    "start_date" | "end_date" | "created_at" | "updated_at"
  > {
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateExperimentTeamAssignment = Pick<
  ExperimentTeamAssignment,
  "experiment_id" | "personnel_id"
> &
  Partial<
    Pick<
      ExperimentTeamAssignment,
      | "role"
      | "site_access"
      | "start_date"
      | "end_date"
      | "time_commitment"
      | "responsibilities"
      | "notes"
    >
  >;

export type UpdateExperimentTeamAssignment = Partial<
  Omit<CreateExperimentTeamAssignment, "experiment_id" | "personnel_id">
>;

// Extended team assignment with relations
export interface ExperimentTeamAssignmentWithDetails
  extends ExperimentTeamAssignmentFromAPI {
  personnel?: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
  } | null;
  accessible_sites?: FieldSiteFromAPI[];
}

// -----------------------------------------------------------------------------
// Fieldwork Schedules
// -----------------------------------------------------------------------------

export type FieldworkStatus =
  | "planned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface EquipmentChecklistItem {
  item: string;
  packed: boolean;
  notes?: string;
}

export interface DailyScheduleEntry {
  date: string;
  activities: string[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  role?: string;
}

export interface FieldworkSchedule {
  id: string;
  experiment_id: string;
  site_id?: string | null;
  title: string;
  description?: string | null;
  start_date: Date;
  end_date: Date;
  status: FieldworkStatus;
  team_member_ids: string[]; // personnel_ids
  objectives: string[];
  logistics_notes?: string | null;
  travel_booked: boolean;
  accommodation_booked: boolean;
  permits_verified: boolean;
  equipment_checklist: EquipmentChecklistItem[];
  daily_schedule: DailyScheduleEntry[];
  weather_contingency?: string | null;
  emergency_contacts: EmergencyContact[];
  budget_estimate?: number | null;
  actual_cost?: number | null;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface FieldworkScheduleFromAPI
  extends Omit<FieldworkSchedule, "start_date" | "end_date" | "created_at" | "updated_at"> {
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export type CreateFieldworkSchedule = Pick<
  FieldworkSchedule,
  "experiment_id" | "title" | "start_date" | "end_date"
> &
  Partial<
    Pick<
      FieldworkSchedule,
      | "site_id"
      | "description"
      | "status"
      | "team_member_ids"
      | "objectives"
      | "logistics_notes"
      | "travel_booked"
      | "accommodation_booked"
      | "permits_verified"
      | "equipment_checklist"
      | "daily_schedule"
      | "weather_contingency"
      | "emergency_contacts"
      | "budget_estimate"
      | "metadata"
    >
  >;

export type UpdateFieldworkSchedule = Partial<
  Omit<CreateFieldworkSchedule, "experiment_id">
>;

// Extended fieldwork with relations
export interface FieldworkScheduleWithDetails extends FieldworkScheduleFromAPI {
  experiment?: {
    id: string;
    title: string;
    code?: string | null;
  } | null;
  site?: FieldSiteFromAPI | null;
  team_members?: Array<{
    id: string;
    name: string;
    email?: string | null;
  }>;
  days_until_start?: number;
}

// -----------------------------------------------------------------------------
// Research Project Dashboard Stats
// -----------------------------------------------------------------------------

export interface ResearchProjectStats {
  total_experiments: number;
  planning_count: number;
  active_count: number;
  fieldwork_count: number;
  analysis_count: number;
  completed_count: number;
  on_hold_count: number;
  total_team_members: number;
  upcoming_fieldwork_count: number;
  expiring_permits_count: number;
}

// Needs attention items for dashboard
export interface ResearchNeedsAttention {
  type: "permit_expiring" | "fieldwork_upcoming" | "experiment_blocked" | "data_overdue";
  title: string;
  description: string;
  entity_id: string;
  entity_type: "permit" | "fieldwork" | "experiment";
  urgency: "high" | "medium" | "low";
  due_date?: string | null;
}

// Upcoming fieldwork for dashboard
export interface UpcomingFieldwork {
  id: string;
  title: string;
  experiment_id: string;
  experiment_title: string;
  site_id?: string | null;
  site_name?: string | null;
  start_date: string;
  end_date: string;
  status: FieldworkStatus;
  days_until_start: number;
  experiment_count?: number; // How many experiments involved
}

// Expiring permit for dashboard
export interface ExpiringPermit {
  id: string;
  title: string;
  permit_type: PermitType;
  expiration_date: string;
  days_until_expiration: number;
  project_id?: string | null;
  experiment_id?: string | null;
  site_id?: string | null;
}

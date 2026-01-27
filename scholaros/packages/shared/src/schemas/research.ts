import { z } from "zod";

// =============================================================================
// Research Project Schemas
// Zod validation schemas for field sites, experiments, permits, and fieldwork
// =============================================================================

// -----------------------------------------------------------------------------
// Field Sites
// -----------------------------------------------------------------------------

export const FieldSiteLocationSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
});

export const FieldSiteContactSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const FieldSiteSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  code: z.string().max(20).nullable().optional(),
  location: FieldSiteLocationSchema.default({}),
  timezone: z.string().default("UTC"),
  description: z.string().nullable().optional(),
  logistics_notes: z.string().nullable().optional(),
  access_requirements: z.array(z.string()).default([]),
  contacts: z.array(FieldSiteContactSchema).default([]),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateFieldSiteSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  code: z.string().max(20).nullable().optional(),
  location: FieldSiteLocationSchema.default({}),
  timezone: z.string().default("UTC"),
  description: z.string().nullable().optional(),
  logistics_notes: z.string().nullable().optional(),
  access_requirements: z.array(z.string()).default([]),
  contacts: z.array(FieldSiteContactSchema).default([]),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateFieldSiteSchema = CreateFieldSiteSchema.omit({
  workspace_id: true,
}).partial();

// -----------------------------------------------------------------------------
// Experiments
// -----------------------------------------------------------------------------

export const ExperimentStatusSchema = z.enum([
  "planning",
  "active",
  "fieldwork",
  "analysis",
  "completed",
  "on_hold",
]);

export const ExperimentProtocolSchema = z.object({
  name: z.string().min(1).max(200),
  version: z.string().optional(),
  url: z.string().url().optional(),
});

export const ExperimentEquipmentSchema = z.object({
  item: z.string().min(1).max(200),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const ExperimentSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  code: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  status: ExperimentStatusSchema.default("planning"),
  lead_id: z.string().uuid().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  fieldwork_start: z.coerce.date().nullable().optional(),
  fieldwork_end: z.coerce.date().nullable().optional(),
  protocols: z.array(ExperimentProtocolSchema).default([]),
  equipment_needs: z.array(ExperimentEquipmentSchema).default([]),
  sample_targets: z.record(z.number()).default({}),
  hypothesis: z.string().nullable().optional(),
  objectives: z.array(z.string()).default([]),
  color: z.string().default("bg-blue-500"),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateExperimentSchema = z.object({
  project_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  code: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  status: ExperimentStatusSchema.default("planning"),
  lead_id: z.string().uuid().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  fieldwork_start: z.coerce.date().nullable().optional(),
  fieldwork_end: z.coerce.date().nullable().optional(),
  protocols: z.array(ExperimentProtocolSchema).default([]),
  equipment_needs: z.array(ExperimentEquipmentSchema).default([]),
  sample_targets: z.record(z.number()).default({}),
  hypothesis: z.string().nullable().optional(),
  objectives: z.array(z.string()).default([]),
  color: z.string().default("bg-blue-500"),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateExperimentSchema = CreateExperimentSchema.omit({
  project_id: true,
  workspace_id: true,
}).partial();

// -----------------------------------------------------------------------------
// Permits
// -----------------------------------------------------------------------------

export const PermitTypeSchema = z.enum([
  "IACUC",
  "IBC",
  "collection",
  "CITES",
  "export",
  "import",
  "IRB",
  "MOU",
  "institutional",
  "other",
]);

export const PermitStatusSchema = z.enum([
  "pending",
  "active",
  "expired",
  "renewal_pending",
  "suspended",
]);

export const PermitDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  uploaded_at: z.string().optional(),
});

export const PermitSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  experiment_id: z.string().uuid().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  permit_type: PermitTypeSchema,
  permit_number: z.string().max(100).nullable().optional(),
  title: z.string().min(1).max(500),
  issuing_authority: z.string().nullable().optional(),
  pi_name: z.string().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  expiration_date: z.coerce.date().nullable().optional(),
  status: PermitStatusSchema.default("pending"),
  renewal_reminder_days: z.number().int().min(0).max(365).default(60),
  documents: z.array(PermitDocumentSchema).default([]),
  notes: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  coverage_scope: z.string().nullable().optional(),
  linked_permits: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreatePermitSchema = z.object({
  workspace_id: z.string().uuid(),
  permit_type: PermitTypeSchema,
  title: z.string().min(1).max(500),
  project_id: z.string().uuid().nullable().optional(),
  experiment_id: z.string().uuid().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  permit_number: z.string().max(100).nullable().optional(),
  issuing_authority: z.string().nullable().optional(),
  pi_name: z.string().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  expiration_date: z.coerce.date().nullable().optional(),
  status: PermitStatusSchema.default("pending"),
  renewal_reminder_days: z.number().int().min(0).max(365).default(60),
  documents: z.array(PermitDocumentSchema).default([]),
  notes: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  coverage_scope: z.string().nullable().optional(),
  linked_permits: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdatePermitSchema = CreatePermitSchema.omit({
  workspace_id: true,
}).partial();

// -----------------------------------------------------------------------------
// Experiment Team Assignments
// -----------------------------------------------------------------------------

export const ExperimentTeamRoleSchema = z.enum([
  "lead",
  "co_lead",
  "contributor",
  "field_assistant",
  "data_analyst",
  "consultant",
]);

export const ExperimentTeamAssignmentSchema = z.object({
  id: z.string().uuid(),
  experiment_id: z.string().uuid(),
  personnel_id: z.string().uuid(),
  role: ExperimentTeamRoleSchema.default("contributor"),
  site_access: z.array(z.string().uuid()).default([]),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  time_commitment: z.string().nullable().optional(),
  responsibilities: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateExperimentTeamAssignmentSchema = z.object({
  experiment_id: z.string().uuid(),
  personnel_id: z.string().uuid(),
  role: ExperimentTeamRoleSchema.default("contributor"),
  site_access: z.array(z.string().uuid()).default([]),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  time_commitment: z.string().nullable().optional(),
  responsibilities: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateExperimentTeamAssignmentSchema =
  CreateExperimentTeamAssignmentSchema.omit({
    experiment_id: true,
    personnel_id: true,
  }).partial();

// -----------------------------------------------------------------------------
// Fieldwork Schedules
// -----------------------------------------------------------------------------

export const FieldworkStatusSchema = z.enum([
  "planned",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

export const EquipmentChecklistItemSchema = z.object({
  item: z.string().min(1).max(200),
  packed: z.boolean().default(false),
  notes: z.string().optional(),
});

export const DailyScheduleEntrySchema = z.object({
  date: z.string(), // ISO date string
  activities: z.array(z.string()),
});

export const EmergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(50),
  role: z.string().optional(),
});

export const FieldworkScheduleSchema = z.object({
  id: z.string().uuid(),
  experiment_id: z.string().uuid(),
  site_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  status: FieldworkStatusSchema.default("planned"),
  team_member_ids: z.array(z.string().uuid()).default([]),
  objectives: z.array(z.string()).default([]),
  logistics_notes: z.string().nullable().optional(),
  travel_booked: z.boolean().default(false),
  accommodation_booked: z.boolean().default(false),
  permits_verified: z.boolean().default(false),
  equipment_checklist: z.array(EquipmentChecklistItemSchema).default([]),
  daily_schedule: z.array(DailyScheduleEntrySchema).default([]),
  weather_contingency: z.string().nullable().optional(),
  emergency_contacts: z.array(EmergencyContactSchema).default([]),
  budget_estimate: z.number().positive().nullable().optional(),
  actual_cost: z.number().positive().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Base schema without refinement for reuse
const CreateFieldworkScheduleBaseSchema = z.object({
  experiment_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  site_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  status: FieldworkStatusSchema.default("planned"),
  team_member_ids: z.array(z.string().uuid()).default([]),
  objectives: z.array(z.string()).default([]),
  logistics_notes: z.string().nullable().optional(),
  travel_booked: z.boolean().default(false),
  accommodation_booked: z.boolean().default(false),
  permits_verified: z.boolean().default(false),
  equipment_checklist: z.array(EquipmentChecklistItemSchema).default([]),
  daily_schedule: z.array(DailyScheduleEntrySchema).default([]),
  weather_contingency: z.string().nullable().optional(),
  emergency_contacts: z.array(EmergencyContactSchema).default([]),
  budget_estimate: z.number().positive().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const CreateFieldworkScheduleSchema = CreateFieldworkScheduleBaseSchema.refine(
  (data) => data.end_date >= data.start_date,
  {
    message: "End date must be on or after start date",
    path: ["end_date"],
  }
);

export const UpdateFieldworkScheduleSchema = CreateFieldworkScheduleBaseSchema
  .omit({ experiment_id: true })
  .partial()
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["end_date"],
    }
  );

// -----------------------------------------------------------------------------
// Export Inferred Types
// -----------------------------------------------------------------------------

export type FieldSiteLocationSchemaType = z.infer<typeof FieldSiteLocationSchema>;
export type FieldSiteContactSchemaType = z.infer<typeof FieldSiteContactSchema>;
export type FieldSiteSchemaType = z.infer<typeof FieldSiteSchema>;
export type CreateFieldSiteSchemaType = z.infer<typeof CreateFieldSiteSchema>;
export type UpdateFieldSiteSchemaType = z.infer<typeof UpdateFieldSiteSchema>;

export type ExperimentStatusSchemaType = z.infer<typeof ExperimentStatusSchema>;
export type ExperimentProtocolSchemaType = z.infer<typeof ExperimentProtocolSchema>;
export type ExperimentEquipmentSchemaType = z.infer<typeof ExperimentEquipmentSchema>;
export type ExperimentSchemaType = z.infer<typeof ExperimentSchema>;
export type CreateExperimentSchemaType = z.infer<typeof CreateExperimentSchema>;
export type UpdateExperimentSchemaType = z.infer<typeof UpdateExperimentSchema>;

export type PermitTypeSchemaType = z.infer<typeof PermitTypeSchema>;
export type PermitStatusSchemaType = z.infer<typeof PermitStatusSchema>;
export type PermitDocumentSchemaType = z.infer<typeof PermitDocumentSchema>;
export type PermitSchemaType = z.infer<typeof PermitSchema>;
export type CreatePermitSchemaType = z.infer<typeof CreatePermitSchema>;
export type UpdatePermitSchemaType = z.infer<typeof UpdatePermitSchema>;

export type ExperimentTeamRoleSchemaType = z.infer<typeof ExperimentTeamRoleSchema>;
export type ExperimentTeamAssignmentSchemaType = z.infer<typeof ExperimentTeamAssignmentSchema>;
export type CreateExperimentTeamAssignmentSchemaType = z.infer<typeof CreateExperimentTeamAssignmentSchema>;
export type UpdateExperimentTeamAssignmentSchemaType = z.infer<typeof UpdateExperimentTeamAssignmentSchema>;

export type FieldworkStatusSchemaType = z.infer<typeof FieldworkStatusSchema>;
export type EquipmentChecklistItemSchemaType = z.infer<typeof EquipmentChecklistItemSchema>;
export type DailyScheduleEntrySchemaType = z.infer<typeof DailyScheduleEntrySchema>;
export type EmergencyContactSchemaType = z.infer<typeof EmergencyContactSchema>;
export type FieldworkScheduleSchemaType = z.infer<typeof FieldworkScheduleSchema>;
export type CreateFieldworkScheduleSchemaType = z.infer<typeof CreateFieldworkScheduleSchema>;
export type UpdateFieldworkScheduleSchemaType = z.infer<typeof UpdateFieldworkScheduleSchema>;

import { describe, it, expect } from "vitest";
import {
  FieldSiteLocationSchema,
  FieldSiteContactSchema,
  FieldSiteSchema,
  CreateFieldSiteSchema,
  UpdateFieldSiteSchema,
  ExperimentStatusSchema,
  ExperimentProtocolSchema,
  ExperimentEquipmentSchema,
  ExperimentSchema,
  CreateExperimentSchema,
  UpdateExperimentSchema,
  PermitTypeSchema,
  PermitStatusSchema,
  PermitDocumentSchema,
  PermitSchema,
  CreatePermitSchema,
  UpdatePermitSchema,
  ExperimentTeamRoleSchema,
  ExperimentTeamAssignmentSchema,
  CreateExperimentTeamAssignmentSchema,
  UpdateExperimentTeamAssignmentSchema,
  FieldworkStatusSchema,
  EquipmentChecklistItemSchema,
  DailyScheduleEntrySchema,
  EmergencyContactSchema,
  FieldworkScheduleSchema,
  CreateFieldworkScheduleSchema,
  UpdateFieldworkScheduleSchema,
} from "@scholaros/shared/schemas/research";

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID2 = "660e8400-e29b-41d4-a716-446655440001";
const NOW = new Date().toISOString();

// =============================================================================
// FieldSiteLocationSchema
// =============================================================================
describe("FieldSiteLocationSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(FieldSiteLocationSchema.parse({})).toEqual({});
  });

  it("accepts fully populated object", () => {
    const data = { lat: 45.5, lng: -122.6, address: "123 Main St", country: "US", region: "OR" };
    expect(FieldSiteLocationSchema.parse(data)).toEqual(data);
  });

  it("accepts boundary lat values -90 and 90", () => {
    expect(FieldSiteLocationSchema.parse({ lat: -90 })).toEqual({ lat: -90 });
    expect(FieldSiteLocationSchema.parse({ lat: 90 })).toEqual({ lat: 90 });
  });

  it("rejects lat out of range", () => {
    expect(() => FieldSiteLocationSchema.parse({ lat: 91 })).toThrow();
    expect(() => FieldSiteLocationSchema.parse({ lat: -91 })).toThrow();
  });

  it("accepts boundary lng values -180 and 180", () => {
    expect(FieldSiteLocationSchema.parse({ lng: -180 })).toEqual({ lng: -180 });
    expect(FieldSiteLocationSchema.parse({ lng: 180 })).toEqual({ lng: 180 });
  });

  it("rejects lng out of range", () => {
    expect(() => FieldSiteLocationSchema.parse({ lng: 181 })).toThrow();
    expect(() => FieldSiteLocationSchema.parse({ lng: -181 })).toThrow();
  });

  it("rejects non-number lat/lng", () => {
    expect(() => FieldSiteLocationSchema.parse({ lat: "abc" })).toThrow();
    expect(() => FieldSiteLocationSchema.parse({ lng: true })).toThrow();
  });
});

// =============================================================================
// FieldSiteContactSchema
// =============================================================================
describe("FieldSiteContactSchema", () => {
  it("accepts minimal (name only)", () => {
    expect(FieldSiteContactSchema.parse({ name: "Alice" })).toMatchObject({ name: "Alice" });
  });

  it("accepts fully populated contact", () => {
    const data = { name: "Bob", role: "Manager", email: "bob@example.com", phone: "555-1234" };
    expect(FieldSiteContactSchema.parse(data)).toEqual(data);
  });

  it("rejects empty name", () => {
    expect(() => FieldSiteContactSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 200 chars", () => {
    expect(() => FieldSiteContactSchema.parse({ name: "a".repeat(201) })).toThrow();
  });

  it("accepts name at exactly 200 chars", () => {
    expect(FieldSiteContactSchema.parse({ name: "a".repeat(200) })).toBeTruthy();
  });

  it("rejects invalid email", () => {
    expect(() => FieldSiteContactSchema.parse({ name: "A", email: "not-email" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => FieldSiteContactSchema.parse({ role: "PI" })).toThrow();
  });
});

// =============================================================================
// FieldSiteSchema
// =============================================================================
describe("FieldSiteSchema", () => {
  const validFull = {
    id: UUID,
    workspace_id: UUID,
    name: "Amazon Field Site",
    code: "AFS",
    location: { lat: -3.4, lng: -60.0, country: "BR" },
    timezone: "America/Manaus",
    description: "Rainforest research site",
    logistics_notes: "Boat access only",
    access_requirements: ["permit", "guide"],
    contacts: [{ name: "Maria", role: "Guide", email: "m@x.com" }],
    is_active: true,
    metadata: { region_code: "AM" },
    created_at: NOW,
    updated_at: NOW,
  };

  it("parses a fully populated field site", () => {
    const result = FieldSiteSchema.parse(validFull);
    expect(result.name).toBe("Amazon Field Site");
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it("applies default values for optional fields", () => {
    const minimal = { id: UUID, workspace_id: UUID, name: "Site", created_at: NOW, updated_at: NOW };
    const result = FieldSiteSchema.parse(minimal);
    expect(result.timezone).toBe("UTC");
    expect(result.location).toEqual({});
    expect(result.access_requirements).toEqual([]);
    expect(result.contacts).toEqual([]);
    expect(result.is_active).toBe(true);
    expect(result.metadata).toEqual({});
  });

  it("coerces string dates to Date objects", () => {
    const result = FieldSiteSchema.parse({ id: UUID, workspace_id: UUID, name: "S", created_at: "2025-01-01", updated_at: "2025-06-01" });
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it("rejects invalid UUID for id", () => {
    expect(() => FieldSiteSchema.parse({ ...validFull, id: "not-uuid" })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => FieldSiteSchema.parse({ ...validFull, name: "" })).toThrow();
  });

  it("rejects name over 200 chars", () => {
    expect(() => FieldSiteSchema.parse({ ...validFull, name: "x".repeat(201) })).toThrow();
  });

  it("rejects code over 20 chars", () => {
    expect(() => FieldSiteSchema.parse({ ...validFull, code: "x".repeat(21) })).toThrow();
  });

  it("accepts null for nullable optional fields", () => {
    const result = FieldSiteSchema.parse({ ...validFull, code: null, description: null, logistics_notes: null });
    expect(result.code).toBeNull();
    expect(result.description).toBeNull();
  });
});

// =============================================================================
// CreateFieldSiteSchema
// =============================================================================
describe("CreateFieldSiteSchema", () => {
  it("accepts minimal required fields", () => {
    const result = CreateFieldSiteSchema.parse({ workspace_id: UUID, name: "Site A" });
    expect(result.workspace_id).toBe(UUID);
    expect(result.name).toBe("Site A");
    expect(result.timezone).toBe("UTC");
    expect(result.is_active).toBe(true);
  });

  it("rejects missing workspace_id", () => {
    expect(() => CreateFieldSiteSchema.parse({ name: "Site" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateFieldSiteSchema.parse({ workspace_id: UUID })).toThrow();
  });

  it("accepts contacts array", () => {
    const result = CreateFieldSiteSchema.parse({
      workspace_id: UUID,
      name: "S",
      contacts: [{ name: "Jo", email: "jo@x.com" }],
    });
    expect(result.contacts).toHaveLength(1);
  });

  it("accepts access_requirements array", () => {
    const result = CreateFieldSiteSchema.parse({
      workspace_id: UUID,
      name: "S",
      access_requirements: ["4WD vehicle", "radio"],
    });
    expect(result.access_requirements).toHaveLength(2);
  });
});

// =============================================================================
// UpdateFieldSiteSchema
// =============================================================================
describe("UpdateFieldSiteSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(UpdateFieldSiteSchema.parse({})).toBeTruthy();
  });

  it("accepts partial updates", () => {
    const result = UpdateFieldSiteSchema.parse({ name: "New Name", is_active: false });
    expect(result.name).toBe("New Name");
    expect(result.is_active).toBe(false);
  });

  it("does not include workspace_id", () => {
    // workspace_id is omitted from update schema
    const result = UpdateFieldSiteSchema.parse({ workspace_id: UUID } as Record<string, unknown>);
    expect((result as Record<string, unknown>).workspace_id).toBeUndefined();
  });
});

// =============================================================================
// ExperimentStatusSchema
// =============================================================================
describe("ExperimentStatusSchema", () => {
  const validStatuses = ["planning", "active", "fieldwork", "analysis", "completed", "on_hold"];

  it.each(validStatuses)("accepts valid status '%s'", (status) => {
    expect(ExperimentStatusSchema.parse(status)).toBe(status);
  });

  it("rejects invalid status", () => {
    expect(() => ExperimentStatusSchema.parse("cancelled")).toThrow();
    expect(() => ExperimentStatusSchema.parse("")).toThrow();
    expect(() => ExperimentStatusSchema.parse(123)).toThrow();
  });
});

// =============================================================================
// ExperimentProtocolSchema / ExperimentEquipmentSchema
// =============================================================================
describe("ExperimentProtocolSchema", () => {
  it("accepts minimal protocol", () => {
    expect(ExperimentProtocolSchema.parse({ name: "PCR" })).toMatchObject({ name: "PCR" });
  });

  it("accepts full protocol", () => {
    const data = { name: "PCR", version: "2.1", url: "https://example.com/proto" };
    expect(ExperimentProtocolSchema.parse(data)).toEqual(data);
  });

  it("rejects invalid url", () => {
    expect(() => ExperimentProtocolSchema.parse({ name: "P", url: "not-url" })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => ExperimentProtocolSchema.parse({ name: "" })).toThrow();
  });
});

describe("ExperimentEquipmentSchema", () => {
  it("accepts minimal equipment", () => {
    expect(ExperimentEquipmentSchema.parse({ item: "Net" })).toMatchObject({ item: "Net" });
  });

  it("accepts full equipment", () => {
    expect(ExperimentEquipmentSchema.parse({ item: "Trap", quantity: 10, notes: "Sherman" })).toBeTruthy();
  });

  it("rejects zero quantity (must be positive)", () => {
    expect(() => ExperimentEquipmentSchema.parse({ item: "X", quantity: 0 })).toThrow();
  });

  it("rejects negative quantity", () => {
    expect(() => ExperimentEquipmentSchema.parse({ item: "X", quantity: -1 })).toThrow();
  });

  it("rejects non-integer quantity", () => {
    expect(() => ExperimentEquipmentSchema.parse({ item: "X", quantity: 1.5 })).toThrow();
  });
});

// =============================================================================
// ExperimentSchema
// =============================================================================
describe("ExperimentSchema", () => {
  const validExperiment = {
    id: UUID,
    project_id: UUID,
    workspace_id: UUID,
    title: "Bird Survey",
    created_at: NOW,
    updated_at: NOW,
  };

  it("parses minimal experiment with defaults", () => {
    const result = ExperimentSchema.parse(validExperiment);
    expect(result.status).toBe("planning");
    expect(result.protocols).toEqual([]);
    expect(result.equipment_needs).toEqual([]);
    expect(result.sample_targets).toEqual({});
    expect(result.objectives).toEqual([]);
    expect(result.color).toBe("bg-blue-500");
    expect(result.sort_order).toBe(0);
    expect(result.metadata).toEqual({});
  });

  it("accepts fully populated experiment", () => {
    const full = {
      ...validExperiment,
      code: "BS-01",
      description: "Annual bird survey",
      site_id: UUID2,
      status: "active",
      lead_id: UUID2,
      start_date: "2025-03-01",
      end_date: "2025-09-01",
      fieldwork_start: "2025-05-01",
      fieldwork_end: "2025-07-01",
      protocols: [{ name: "Point Count", version: "3.0" }],
      equipment_needs: [{ item: "Binoculars", quantity: 5 }],
      sample_targets: { species_a: 100, species_b: 50 },
      hypothesis: "Populations are stable",
      objectives: ["Count nests", "Record species"],
      color: "bg-green-500",
      sort_order: 2,
      metadata: { grant: "NSF-123" },
    };
    const result = ExperimentSchema.parse(full);
    expect(result.title).toBe("Bird Survey");
    expect(result.start_date).toBeInstanceOf(Date);
  });

  it("rejects missing project_id", () => {
    const { project_id, ...rest } = validExperiment;
    expect(() => ExperimentSchema.parse(rest)).toThrow();
  });

  it("rejects title over 500 chars", () => {
    expect(() => ExperimentSchema.parse({ ...validExperiment, title: "x".repeat(501) })).toThrow();
  });

  it("rejects code over 50 chars", () => {
    expect(() => ExperimentSchema.parse({ ...validExperiment, code: "x".repeat(51) })).toThrow();
  });

  it("accepts null for nullable optional fields", () => {
    const result = ExperimentSchema.parse({
      ...validExperiment,
      code: null,
      site_id: null,
      lead_id: null,
      start_date: null,
      hypothesis: null,
    });
    expect(result.code).toBeNull();
    expect(result.site_id).toBeNull();
  });
});

// =============================================================================
// CreateExperimentSchema
// =============================================================================
describe("CreateExperimentSchema", () => {
  it("accepts minimal required fields", () => {
    const result = CreateExperimentSchema.parse({ project_id: UUID, workspace_id: UUID, title: "Exp" });
    expect(result.status).toBe("planning");
    expect(result.color).toBe("bg-blue-500");
  });

  it("rejects missing title", () => {
    expect(() => CreateExperimentSchema.parse({ project_id: UUID, workspace_id: UUID })).toThrow();
  });

  it("rejects missing project_id", () => {
    expect(() => CreateExperimentSchema.parse({ workspace_id: UUID, title: "E" })).toThrow();
  });

  it("rejects missing workspace_id", () => {
    expect(() => CreateExperimentSchema.parse({ project_id: UUID, title: "E" })).toThrow();
  });
});

// =============================================================================
// UpdateExperimentSchema
// =============================================================================
describe("UpdateExperimentSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateExperimentSchema.parse({})).toBeTruthy();
  });

  it("accepts partial update", () => {
    const result = UpdateExperimentSchema.parse({ title: "Updated", status: "active" });
    expect(result.title).toBe("Updated");
    expect(result.status).toBe("active");
  });

  it("omits project_id and workspace_id", () => {
    const result = UpdateExperimentSchema.parse({ project_id: UUID, workspace_id: UUID } as Record<string, unknown>);
    expect((result as Record<string, unknown>).project_id).toBeUndefined();
    expect((result as Record<string, unknown>).workspace_id).toBeUndefined();
  });
});

// =============================================================================
// PermitTypeSchema / PermitStatusSchema
// =============================================================================
describe("PermitTypeSchema", () => {
  const validTypes = ["IACUC", "IBC", "collection", "CITES", "export", "import", "IRB", "MOU", "institutional", "other"];

  it.each(validTypes)("accepts '%s'", (type) => {
    expect(PermitTypeSchema.parse(type)).toBe(type);
  });

  it("rejects invalid type", () => {
    expect(() => PermitTypeSchema.parse("land_access")).toThrow();
    expect(() => PermitTypeSchema.parse("")).toThrow();
  });
});

describe("PermitStatusSchema", () => {
  const validStatuses = ["pending", "active", "expired", "renewal_pending", "suspended"];

  it.each(validStatuses)("accepts '%s'", (status) => {
    expect(PermitStatusSchema.parse(status)).toBe(status);
  });

  it("rejects invalid status", () => {
    expect(() => PermitStatusSchema.parse("rejected")).toThrow();
    expect(() => PermitStatusSchema.parse("revoked")).toThrow();
  });
});

// =============================================================================
// PermitDocumentSchema
// =============================================================================
describe("PermitDocumentSchema", () => {
  it("accepts valid document", () => {
    const doc = { name: "Approval Letter", url: "https://example.com/doc.pdf" };
    expect(PermitDocumentSchema.parse(doc)).toEqual(doc);
  });

  it("accepts document with uploaded_at", () => {
    const doc = { name: "Form", url: "https://x.com/f", uploaded_at: "2025-01-01" };
    expect(PermitDocumentSchema.parse(doc)).toEqual(doc);
  });

  it("rejects empty name", () => {
    expect(() => PermitDocumentSchema.parse({ name: "", url: "https://x.com" })).toThrow();
  });

  it("rejects invalid url", () => {
    expect(() => PermitDocumentSchema.parse({ name: "Doc", url: "bad" })).toThrow();
  });
});

// =============================================================================
// PermitSchema
// =============================================================================
describe("PermitSchema", () => {
  const validPermit = {
    id: UUID,
    workspace_id: UUID,
    permit_type: "IACUC",
    title: "Animal Use Protocol",
    created_at: NOW,
    updated_at: NOW,
  };

  it("parses minimal permit with defaults", () => {
    const result = PermitSchema.parse(validPermit);
    expect(result.status).toBe("pending");
    expect(result.renewal_reminder_days).toBe(60);
    expect(result.documents).toEqual([]);
    expect(result.linked_permits).toEqual([]);
    expect(result.metadata).toEqual({});
  });

  it("accepts fully populated permit", () => {
    const full = {
      ...validPermit,
      project_id: UUID2,
      experiment_id: UUID2,
      site_id: UUID2,
      permit_number: "P-2025-001",
      issuing_authority: "USDA",
      pi_name: "Dr. Smith",
      start_date: "2025-01-01",
      expiration_date: "2026-01-01",
      status: "active",
      renewal_reminder_days: 30,
      documents: [{ name: "Approval", url: "https://x.com/a" }],
      notes: "Approved with conditions",
      conditions: "Annual review required",
      coverage_scope: "Campus only",
      linked_permits: [UUID2],
    };
    const result = PermitSchema.parse(full);
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.documents).toHaveLength(1);
    expect(result.linked_permits).toHaveLength(1);
  });

  it("rejects renewal_reminder_days out of range", () => {
    expect(() => PermitSchema.parse({ ...validPermit, renewal_reminder_days: -1 })).toThrow();
    expect(() => PermitSchema.parse({ ...validPermit, renewal_reminder_days: 366 })).toThrow();
  });

  it("accepts renewal_reminder_days at boundaries 0 and 365", () => {
    expect(PermitSchema.parse({ ...validPermit, renewal_reminder_days: 0 }).renewal_reminder_days).toBe(0);
    expect(PermitSchema.parse({ ...validPermit, renewal_reminder_days: 365 }).renewal_reminder_days).toBe(365);
  });

  it("rejects title over 500 chars", () => {
    expect(() => PermitSchema.parse({ ...validPermit, title: "x".repeat(501) })).toThrow();
  });

  it("rejects permit_number over 100 chars", () => {
    expect(() => PermitSchema.parse({ ...validPermit, permit_number: "x".repeat(101) })).toThrow();
  });
});

// =============================================================================
// CreatePermitSchema
// =============================================================================
describe("CreatePermitSchema", () => {
  it("accepts minimal required fields", () => {
    const result = CreatePermitSchema.parse({ workspace_id: UUID, permit_type: "IRB", title: "Study Protocol" });
    expect(result.status).toBe("pending");
    expect(result.renewal_reminder_days).toBe(60);
  });

  it("rejects missing workspace_id", () => {
    expect(() => CreatePermitSchema.parse({ permit_type: "IRB", title: "T" })).toThrow();
  });

  it("rejects missing permit_type", () => {
    expect(() => CreatePermitSchema.parse({ workspace_id: UUID, title: "T" })).toThrow();
  });

  it("rejects missing title", () => {
    expect(() => CreatePermitSchema.parse({ workspace_id: UUID, permit_type: "IRB" })).toThrow();
  });

  it("accepts documents array", () => {
    const result = CreatePermitSchema.parse({
      workspace_id: UUID,
      permit_type: "IACUC",
      title: "P",
      documents: [{ name: "Doc", url: "https://x.com/d" }],
    });
    expect(result.documents).toHaveLength(1);
  });
});

// =============================================================================
// UpdatePermitSchema
// =============================================================================
describe("UpdatePermitSchema", () => {
  it("accepts empty object", () => {
    expect(UpdatePermitSchema.parse({})).toBeTruthy();
  });

  it("accepts partial update", () => {
    const result = UpdatePermitSchema.parse({ title: "Renewed", status: "active" });
    expect(result.title).toBe("Renewed");
  });

  it("omits workspace_id", () => {
    const result = UpdatePermitSchema.parse({ workspace_id: UUID } as Record<string, unknown>);
    expect((result as Record<string, unknown>).workspace_id).toBeUndefined();
  });
});

// =============================================================================
// ExperimentTeamRoleSchema
// =============================================================================
describe("ExperimentTeamRoleSchema", () => {
  const validRoles = ["lead", "co_lead", "contributor", "field_assistant", "data_analyst", "consultant"];

  it.each(validRoles)("accepts '%s'", (role) => {
    expect(ExperimentTeamRoleSchema.parse(role)).toBe(role);
  });

  it("rejects invalid role", () => {
    expect(() => ExperimentTeamRoleSchema.parse("advisor")).toThrow();
    expect(() => ExperimentTeamRoleSchema.parse("analyst")).toThrow();
  });
});

// =============================================================================
// ExperimentTeamAssignmentSchema
// =============================================================================
describe("ExperimentTeamAssignmentSchema", () => {
  const valid = {
    id: UUID,
    experiment_id: UUID,
    personnel_id: UUID2,
    created_at: NOW,
    updated_at: NOW,
  };

  it("parses minimal with defaults", () => {
    const result = ExperimentTeamAssignmentSchema.parse(valid);
    expect(result.role).toBe("contributor");
    expect(result.site_access).toEqual([]);
  });

  it("parses fully populated", () => {
    const full = {
      ...valid,
      role: "lead",
      site_access: [UUID, UUID2],
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      time_commitment: "50%",
      responsibilities: "Manage field team",
      notes: "Approved by PI",
    };
    const result = ExperimentTeamAssignmentSchema.parse(full);
    expect(result.role).toBe("lead");
    expect(result.site_access).toHaveLength(2);
    expect(result.start_date).toBeInstanceOf(Date);
  });

  it("rejects invalid UUID for experiment_id", () => {
    expect(() => ExperimentTeamAssignmentSchema.parse({ ...valid, experiment_id: "bad" })).toThrow();
  });

  it("accepts null for nullable optional fields", () => {
    const result = ExperimentTeamAssignmentSchema.parse({
      ...valid,
      start_date: null,
      end_date: null,
      time_commitment: null,
      responsibilities: null,
      notes: null,
    });
    expect(result.start_date).toBeNull();
    expect(result.notes).toBeNull();
  });
});

// =============================================================================
// CreateExperimentTeamAssignmentSchema
// =============================================================================
describe("CreateExperimentTeamAssignmentSchema", () => {
  it("accepts minimal required fields", () => {
    const result = CreateExperimentTeamAssignmentSchema.parse({
      experiment_id: UUID,
      personnel_id: UUID2,
    });
    expect(result.role).toBe("contributor");
    expect(result.site_access).toEqual([]);
  });

  it("rejects missing experiment_id", () => {
    expect(() => CreateExperimentTeamAssignmentSchema.parse({ personnel_id: UUID })).toThrow();
  });

  it("rejects missing personnel_id", () => {
    expect(() => CreateExperimentTeamAssignmentSchema.parse({ experiment_id: UUID })).toThrow();
  });
});

// =============================================================================
// UpdateExperimentTeamAssignmentSchema
// =============================================================================
describe("UpdateExperimentTeamAssignmentSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateExperimentTeamAssignmentSchema.parse({})).toBeTruthy();
  });

  it("accepts partial update", () => {
    const result = UpdateExperimentTeamAssignmentSchema.parse({ role: "lead", notes: "Promoted" });
    expect(result.role).toBe("lead");
  });

  it("omits experiment_id and personnel_id", () => {
    const result = UpdateExperimentTeamAssignmentSchema.parse({
      experiment_id: UUID,
      personnel_id: UUID,
    } as Record<string, unknown>);
    expect((result as Record<string, unknown>).experiment_id).toBeUndefined();
    expect((result as Record<string, unknown>).personnel_id).toBeUndefined();
  });
});

// =============================================================================
// FieldworkStatusSchema
// =============================================================================
describe("FieldworkStatusSchema", () => {
  const validStatuses = ["planned", "confirmed", "in_progress", "completed", "cancelled"];

  it.each(validStatuses)("accepts '%s'", (status) => {
    expect(FieldworkStatusSchema.parse(status)).toBe(status);
  });

  it("rejects invalid status", () => {
    expect(() => FieldworkStatusSchema.parse("postponed")).toThrow();
    expect(() => FieldworkStatusSchema.parse("")).toThrow();
  });
});

// =============================================================================
// EquipmentChecklistItemSchema / DailyScheduleEntrySchema / EmergencyContactSchema
// =============================================================================
describe("EquipmentChecklistItemSchema", () => {
  it("accepts minimal item", () => {
    const result = EquipmentChecklistItemSchema.parse({ item: "GPS" });
    expect(result.packed).toBe(false);
  });

  it("accepts full item", () => {
    const result = EquipmentChecklistItemSchema.parse({ item: "Tent", packed: true, notes: "4-person" });
    expect(result.packed).toBe(true);
  });

  it("rejects empty item", () => {
    expect(() => EquipmentChecklistItemSchema.parse({ item: "" })).toThrow();
  });

  it("rejects item over 200 chars", () => {
    expect(() => EquipmentChecklistItemSchema.parse({ item: "x".repeat(201) })).toThrow();
  });
});

describe("DailyScheduleEntrySchema", () => {
  it("accepts valid entry", () => {
    const data = { date: "2025-06-15", activities: ["Setup camp", "Survey transect 1"] };
    expect(DailyScheduleEntrySchema.parse(data)).toEqual(data);
  });

  it("rejects missing date", () => {
    expect(() => DailyScheduleEntrySchema.parse({ activities: ["x"] })).toThrow();
  });

  it("rejects missing activities", () => {
    expect(() => DailyScheduleEntrySchema.parse({ date: "2025-01-01" })).toThrow();
  });
});

describe("EmergencyContactSchema", () => {
  it("accepts minimal contact", () => {
    expect(EmergencyContactSchema.parse({ name: "Ranger", phone: "911" })).toBeTruthy();
  });

  it("accepts full contact", () => {
    expect(EmergencyContactSchema.parse({ name: "Base", phone: "555-0000", role: "Station Manager" })).toBeTruthy();
  });

  it("rejects empty name", () => {
    expect(() => EmergencyContactSchema.parse({ name: "", phone: "911" })).toThrow();
  });

  it("rejects empty phone", () => {
    expect(() => EmergencyContactSchema.parse({ name: "A", phone: "" })).toThrow();
  });

  it("rejects name over 200 chars", () => {
    expect(() => EmergencyContactSchema.parse({ name: "x".repeat(201), phone: "1" })).toThrow();
  });

  it("rejects phone over 50 chars", () => {
    expect(() => EmergencyContactSchema.parse({ name: "A", phone: "1".repeat(51) })).toThrow();
  });
});

// =============================================================================
// FieldworkScheduleSchema
// =============================================================================
describe("FieldworkScheduleSchema", () => {
  const validSchedule = {
    id: UUID,
    experiment_id: UUID,
    title: "Summer Fieldwork",
    start_date: "2025-06-01",
    end_date: "2025-06-15",
    created_at: NOW,
    updated_at: NOW,
  };

  it("parses minimal with defaults", () => {
    const result = FieldworkScheduleSchema.parse(validSchedule);
    expect(result.status).toBe("planned");
    expect(result.team_member_ids).toEqual([]);
    expect(result.objectives).toEqual([]);
    expect(result.travel_booked).toBe(false);
    expect(result.accommodation_booked).toBe(false);
    expect(result.permits_verified).toBe(false);
    expect(result.equipment_checklist).toEqual([]);
    expect(result.daily_schedule).toEqual([]);
    expect(result.emergency_contacts).toEqual([]);
    expect(result.metadata).toEqual({});
  });

  it("coerces date strings to Date objects", () => {
    const result = FieldworkScheduleSchema.parse(validSchedule);
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.end_date).toBeInstanceOf(Date);
  });

  it("accepts fully populated schedule", () => {
    const full = {
      ...validSchedule,
      site_id: UUID2,
      description: "Annual summer survey",
      status: "confirmed",
      team_member_ids: [UUID, UUID2],
      objectives: ["Complete transects", "Collect samples"],
      logistics_notes: "Drive 4WD to site",
      travel_booked: true,
      accommodation_booked: true,
      permits_verified: true,
      equipment_checklist: [{ item: "GPS", packed: true }],
      daily_schedule: [{ date: "2025-06-01", activities: ["Travel"] }],
      weather_contingency: "Delay if thunder",
      emergency_contacts: [{ name: "Ranger", phone: "911" }],
      budget_estimate: 5000.0,
      actual_cost: 4800.0,
      metadata: { vehicle: "Truck-7" },
    };
    const result = FieldworkScheduleSchema.parse(full);
    expect(result.team_member_ids).toHaveLength(2);
    expect(result.equipment_checklist).toHaveLength(1);
  });

  it("rejects non-positive budget_estimate", () => {
    expect(() => FieldworkScheduleSchema.parse({ ...validSchedule, budget_estimate: 0 })).toThrow();
    expect(() => FieldworkScheduleSchema.parse({ ...validSchedule, budget_estimate: -100 })).toThrow();
  });

  it("rejects non-positive actual_cost", () => {
    expect(() => FieldworkScheduleSchema.parse({ ...validSchedule, actual_cost: 0 })).toThrow();
  });

  it("accepts null for nullable optional fields", () => {
    const result = FieldworkScheduleSchema.parse({
      ...validSchedule,
      site_id: null,
      description: null,
      logistics_notes: null,
      weather_contingency: null,
      budget_estimate: null,
      actual_cost: null,
    });
    expect(result.site_id).toBeNull();
    expect(result.budget_estimate).toBeNull();
  });
});

// =============================================================================
// CreateFieldworkScheduleSchema (with date refinement)
// =============================================================================
describe("CreateFieldworkScheduleSchema", () => {
  const validCreate = {
    experiment_id: UUID,
    title: "Fall Fieldwork",
    start_date: "2025-09-01",
    end_date: "2025-09-15",
  };

  it("accepts valid creation data", () => {
    const result = CreateFieldworkScheduleSchema.parse(validCreate);
    expect(result.title).toBe("Fall Fieldwork");
    expect(result.status).toBe("planned");
  });

  it("accepts same start and end date", () => {
    expect(CreateFieldworkScheduleSchema.parse({ ...validCreate, start_date: "2025-09-01", end_date: "2025-09-01" })).toBeTruthy();
  });

  it("rejects end_date before start_date", () => {
    expect(() =>
      CreateFieldworkScheduleSchema.parse({ ...validCreate, start_date: "2025-09-15", end_date: "2025-09-01" })
    ).toThrow("End date must be on or after start date");
  });

  it("rejects missing experiment_id", () => {
    expect(() => CreateFieldworkScheduleSchema.parse({ title: "X", start_date: NOW, end_date: NOW })).toThrow();
  });

  it("rejects missing title", () => {
    expect(() => CreateFieldworkScheduleSchema.parse({ experiment_id: UUID, start_date: NOW, end_date: NOW })).toThrow();
  });

  it("rejects missing start_date", () => {
    expect(() => CreateFieldworkScheduleSchema.parse({ experiment_id: UUID, title: "X", end_date: NOW })).toThrow();
  });

  it("rejects missing end_date", () => {
    expect(() => CreateFieldworkScheduleSchema.parse({ experiment_id: UUID, title: "X", start_date: NOW })).toThrow();
  });
});

// =============================================================================
// UpdateFieldworkScheduleSchema (with conditional date refinement)
// =============================================================================
describe("UpdateFieldworkScheduleSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateFieldworkScheduleSchema.parse({})).toBeTruthy();
  });

  it("accepts partial update without dates", () => {
    const result = UpdateFieldworkScheduleSchema.parse({ title: "Winter Trip", status: "confirmed" });
    expect(result.title).toBe("Winter Trip");
  });

  it("accepts valid date update", () => {
    expect(
      UpdateFieldworkScheduleSchema.parse({ start_date: "2025-10-01", end_date: "2025-10-15" })
    ).toBeTruthy();
  });

  it("rejects end_date before start_date when both provided", () => {
    expect(() =>
      UpdateFieldworkScheduleSchema.parse({ start_date: "2025-10-15", end_date: "2025-10-01" })
    ).toThrow("End date must be on or after start date");
  });

  it("accepts only start_date without end_date (no refinement triggered)", () => {
    expect(UpdateFieldworkScheduleSchema.parse({ start_date: "2025-10-15" })).toBeTruthy();
  });

  it("accepts only end_date without start_date (no refinement triggered)", () => {
    expect(UpdateFieldworkScheduleSchema.parse({ end_date: "2025-10-01" })).toBeTruthy();
  });

  it("omits experiment_id", () => {
    const result = UpdateFieldworkScheduleSchema.parse({ experiment_id: UUID } as Record<string, unknown>);
    expect((result as Record<string, unknown>).experiment_id).toBeUndefined();
  });
});

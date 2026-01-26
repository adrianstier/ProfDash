import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ApplyTemplateSchema } from "@scholaros/shared";

interface PhaseDefinition {
  title: string;
  description?: string | null;
  blocked_by_index: number[];
  assigned_role?: string | null;
  deliverables: DeliverableDefinition[];
}

interface DeliverableDefinition {
  title: string;
  description?: string | null;
  artifact_type?: string | null;
  file_path?: string | null;
}

interface RoleDefinition {
  name: string;
  description?: string | null;
  color?: string;
  is_ai_agent?: boolean;
}

// POST /api/projects/[id]/apply-template - Apply a template to a project
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = ApplyTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { template_id } = validationResult.data;

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from("project_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Get the project to verify access
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if template is accessible (public or belongs to same workspace)
    if (!template.is_public && template.workspace_id !== project.workspace_id) {
      return NextResponse.json({ error: "Template not accessible" }, { status: 403 });
    }

    // Create roles from template
    const roleDefinitions: RoleDefinition[] = template.role_definitions || [];
    const roleIdMap: Record<string, string> = {};

    for (const roleDef of roleDefinitions) {
      const { data: role, error: roleError } = await supabase
        .from("project_roles")
        .insert({
          project_id: projectId,
          name: roleDef.name,
          description: roleDef.description,
          color: roleDef.color || "bg-gray-500",
          is_ai_agent: roleDef.is_ai_agent || false,
          metadata: {}
        })
        .select()
        .single();

      if (roleError) {
        console.error("Error creating role:", roleError);
        continue;
      }

      roleIdMap[roleDef.name] = role.id;
    }

    // Create phases from template
    const phaseDefinitions: PhaseDefinition[] = template.phase_definitions || [];
    const phaseIdMap: Record<number, string> = {}; // Maps index to ID

    // First pass: create all phases without blocking
    for (let i = 0; i < phaseDefinitions.length; i++) {
      const phaseDef = phaseDefinitions[i];

      const { data: phase, error: phaseError } = await supabase
        .from("project_phases")
        .insert({
          project_id: projectId,
          title: phaseDef.title,
          description: phaseDef.description,
          sort_order: i,
          status: "pending",
          blocked_by: [], // Will be updated in second pass
          assigned_role: phaseDef.assigned_role,
          metadata: {}
        })
        .select()
        .single();

      if (phaseError) {
        console.error("Error creating phase:", phaseError);
        continue;
      }

      phaseIdMap[i] = phase.id;

      // Create deliverables for this phase
      const deliverables = phaseDef.deliverables || [];
      for (let j = 0; j < deliverables.length; j++) {
        const delivDef = deliverables[j];

        await supabase.from("project_deliverables").insert({
          phase_id: phase.id,
          project_id: projectId,
          title: delivDef.title,
          description: delivDef.description,
          artifact_type: delivDef.artifact_type,
          file_path: delivDef.file_path,
          sort_order: j,
          status: "pending",
          metadata: {}
        });
      }

      // Create phase assignment if role is specified
      if (phaseDef.assigned_role && roleIdMap[phaseDef.assigned_role]) {
        await supabase.from("project_phase_assignments").insert({
          phase_id: phase.id,
          role_id: roleIdMap[phaseDef.assigned_role],
          assignment_type: "owner"
        });
      }
    }

    // Second pass: update blocking relationships
    for (let i = 0; i < phaseDefinitions.length; i++) {
      const phaseDef = phaseDefinitions[i];
      const phaseId = phaseIdMap[i];

      if (!phaseId || !phaseDef.blocked_by_index?.length) continue;

      const blockedBy = phaseDef.blocked_by_index
        .map(idx => phaseIdMap[idx])
        .filter(Boolean);

      if (blockedBy.length > 0) {
        // Determine initial status
        const status = blockedBy.length > 0 ? "blocked" : "pending";

        await supabase
          .from("project_phases")
          .update({ blocked_by: blockedBy, status })
          .eq("id", phaseId);
      }
    }

    // Log activity
    await supabase.from("workspace_activity").insert({
      workspace_id: project.workspace_id,
      user_id: user.id,
      action: "template_applied",
      project_id: projectId,
      entity_title: template.name,
      details: {
        template_id,
        template_name: template.name,
        phases_created: Object.keys(phaseIdMap).length,
        roles_created: Object.keys(roleIdMap).length
      }
    });

    // Return the created phases and roles
    const { data: createdPhases } = await supabase
      .from("project_phases")
      .select(`
        *,
        deliverables:project_deliverables(*),
        assignments:project_phase_assignments(*, role:project_roles(*))
      `)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    const { data: createdRoles } = await supabase
      .from("project_roles")
      .select("*")
      .eq("project_id", projectId);

    return NextResponse.json({
      success: true,
      template_name: template.name,
      phases: createdPhases || [],
      roles: createdRoles || []
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

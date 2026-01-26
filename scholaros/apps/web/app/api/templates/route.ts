import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateProjectTemplateSchema, UpdateProjectTemplateSchema } from "@scholaros/shared";

// GET /api/templates - List templates (public + workspace-specific)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workspace_id from query params if provided
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspace_id");

    // Build query for templates
    let query = supabase
      .from("project_templates")
      .select(`
        *,
        creator:profiles!project_templates_created_by_fkey(id, full_name, avatar_url)
      `);

    if (workspaceId) {
      // Get templates that are:
      // 1. Public (is_public = true)
      // 2. Belong to this workspace
      // 3. Global templates (workspace_id is null and is_public)
      query = query.or(`is_public.eq.true,workspace_id.eq.${workspaceId}`);
    } else {
      // Only get public templates
      query = query.eq("is_public", true);
    }

    const { data: templates, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/templates - Create a new template
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = CreateProjectTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate template names in the same workspace
    if (validationResult.data.workspace_id) {
      const { data: existing } = await supabase
        .from("project_templates")
        .select("id")
        .eq("workspace_id", validationResult.data.workspace_id)
        .ilike("name", validationResult.data.name)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "A template with this name already exists in this workspace" },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("project_templates")
      .insert({
        ...validationResult.data,
        created_by: user.id
      })
      .select(`
        *,
        creator:profiles!project_templates_created_by_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/templates - Update a template (using query param)
export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ error: "id query parameter required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateProjectTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Check if user is the creator or admin
    const { data: template } = await supabase
      .from("project_templates")
      .select("created_by")
      .eq("id", templateId)
      .single();

    if (template && template.created_by !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this template" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("project_templates")
      .update(validationResult.data)
      .eq("id", templateId)
      .select(`
        *,
        creator:profiles!project_templates_created_by_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/templates - Delete a template (using query param)
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ error: "id query parameter required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is the creator
    const { data: template } = await supabase
      .from("project_templates")
      .select("created_by")
      .eq("id", templateId)
      .single();

    if (template && template.created_by !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this template" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("project_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      console.error("Error deleting template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

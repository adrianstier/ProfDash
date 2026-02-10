import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateTaskTemplateSchema, UpdateTaskTemplateSchema } from "@scholaros/shared";

// GET /api/task-templates - List task templates (built-in + user-created)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id query parameter is required" },
        { status: 400 }
      );
    }

    // Seed built-in templates if none exist for this workspace
    // The function is idempotent - it checks before inserting
    await supabase.rpc("seed_builtin_task_templates", {
      p_workspace_id: workspaceId,
    });

    // Fetch templates: built-in + shared + user's own private
    const { data: templates, error } = await supabase
      .from("task_templates")
      .select(
        `
        *,
        creator:profiles!task_templates_created_by_fkey(id, full_name, avatar_url),
        assignee:profiles!task_templates_default_assigned_to_fkey(id, full_name, avatar_url)
      `
      )
      .eq("workspace_id", workspaceId)
      .or(`is_shared.eq.true,is_builtin.eq.true,created_by.eq.${user.id}`)
      .order("is_builtin", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching task templates:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/task-templates - Create a new task template
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = CreateTaskTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Verify the user is a member of the workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", validationResult.data.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 }
      );
    }

    // Check for duplicate template names in the workspace
    const { data: existing } = await supabase
      .from("task_templates")
      .select("id")
      .eq("workspace_id", validationResult.data.workspace_id)
      .ilike("name", validationResult.data.name)
      .eq("is_builtin", false)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A task template with this name already exists" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("task_templates")
      .insert({
        ...validationResult.data,
        created_by: user.id,
        is_builtin: false,
      })
      .select(
        `
        *,
        creator:profiles!task_templates_created_by_fkey(id, full_name, avatar_url),
        assignee:profiles!task_templates_default_assigned_to_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error creating task template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/task-templates?id=<uuid> - Update a task template
export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "id query parameter required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validationResult = UpdateTaskTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Check ownership
    const { data: template } = await supabase
      .from("task_templates")
      .select("created_by, is_builtin")
      .eq("id", templateId)
      .single();

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Built-in templates cannot be modified by any user
    if (template.is_builtin) {
      return NextResponse.json(
        { error: "Built-in templates cannot be modified" },
        { status: 403 }
      );
    }

    // Only the creator can update their own templates
    if (template.created_by !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this template" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("task_templates")
      .update(validationResult.data)
      .eq("id", templateId)
      .select(
        `
        *,
        creator:profiles!task_templates_created_by_fkey(id, full_name, avatar_url),
        assignee:profiles!task_templates_default_assigned_to_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error updating task template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/task-templates?id=<uuid> - Delete a task template
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "id query parameter required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: template } = await supabase
      .from("task_templates")
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
      .from("task_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      console.error("Error deleting task template:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

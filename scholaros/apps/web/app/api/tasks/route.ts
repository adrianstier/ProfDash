import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateTaskSchema } from "@scholaros/shared";

// GET /api/tasks - Fetch tasks with optional filters
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const due = searchParams.get("due"); // "today", "upcoming", or ISO date
    const projectId = searchParams.get("project_id");
    const workspaceId = searchParams.get("workspace_id");

    let query = supabase
      .from("tasks")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    // Filter by workspace or personal tasks
    if (workspaceId === "personal") {
      // Personal tasks: user_id matches and no workspace
      query = query.eq("user_id", user.id).is("workspace_id", null);
    } else if (workspaceId) {
      // Workspace tasks: RLS handles access control
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Default: show all tasks the user has access to (personal + workspaces)
      // RLS policies will filter automatically
      query = query.eq("user_id", user.id);
    }

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (due === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query.or(`due.eq.${today},due.is.null`);
    } else if (due === "upcoming") {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      query = query.gte("due", today).lte("due", nextWeek);
    } else if (due) {
      query = query.eq("due", due);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = CreateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const taskData = {
      ...validationResult.data,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

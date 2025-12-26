import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateTaskSchema } from "@scholaros/shared";
import {
  checkRateLimit,
  getRateLimitIdentifier,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
} from "@/lib/rate-limit";

// Pagination defaults
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// GET /api/tasks - Fetch tasks with optional filters and pagination
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting
    const identifier = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.read);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const due = searchParams.get("due"); // "today", "upcoming", or ISO date
    const projectId = searchParams.get("project_id");
    const workspaceId = searchParams.get("workspace_id");

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
    );
    const offset = (page - 1) * limit;

    // Build count query first for total
    let countQuery = supabase
      .from("tasks")
      .select("*", { count: "exact", head: true });

    let query = supabase
      .from("tasks")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by workspace or personal tasks
    if (workspaceId === "personal") {
      // Personal tasks: user_id matches and no workspace
      query = query.eq("user_id", user.id).is("workspace_id", null);
      countQuery = countQuery.eq("user_id", user.id).is("workspace_id", null);
    } else if (workspaceId) {
      // Workspace tasks: RLS handles access control
      query = query.eq("workspace_id", workspaceId);
      countQuery = countQuery.eq("workspace_id", workspaceId);
    } else {
      // Default: show all tasks the user has access to (personal + workspaces)
      // RLS policies will filter automatically
      query = query.eq("user_id", user.id);
      countQuery = countQuery.eq("user_id", user.id);
    }

    // Apply filters to both queries
    if (status) {
      query = query.eq("status", status);
      countQuery = countQuery.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
      countQuery = countQuery.eq("category", category);
    }

    if (priority) {
      query = query.eq("priority", priority);
      countQuery = countQuery.eq("priority", priority);
    }

    if (projectId) {
      query = query.eq("project_id", projectId);
      countQuery = countQuery.eq("project_id", projectId);
    }

    if (due === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query.or(`due.eq.${today},due.is.null`);
      countQuery = countQuery.or(`due.eq.${today},due.is.null`);
    } else if (due === "upcoming") {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      query = query.gte("due", today).lte("due", nextWeek);
      countQuery = countQuery.gte("due", today).lte("due", nextWeek);
    } else if (due) {
      query = query.eq("due", due);
      countQuery = countQuery.eq("due", due);
    }

    // Execute both queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (countError) {
      console.error("Error counting tasks:", countError);
    }

    // Return paginated response with metadata
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? data?.length ?? 0,
        totalPages: count ? Math.ceil(count / limit) : 1,
        hasMore: count ? offset + limit < count : false,
      },
    });
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

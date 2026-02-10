import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Export tasks as CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const format = searchParams.get("format") || "csv";

    // Build query
    let query = supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        category,
        due,
        project_id,
        created_at,
        updated_at,
        completed_at
      `)
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.is("workspace_id", null).eq("user_id", user.id);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Export error:", error);
      return NextResponse.json(
        { error: "Failed to export tasks" },
        { status: 500 }
      );
    }

    if (format === "json") {
      return NextResponse.json({ data: tasks });
    }

    // Sanitize CSV field to prevent CSV injection (formula injection)
    // Prefix dangerous characters with a single quote to neutralize them
    function sanitizeCsvField(value: string): string {
      const escaped = value.replace(/"/g, '""');
      // Prefix with single quote if starts with =, +, -, @, tab, or carriage return
      if (/^[=+\-@\t\r]/.test(escaped)) {
        return `"'${escaped}"`;
      }
      return `"${escaped}"`;
    }

    // Generate CSV
    const headers = [
      "ID",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Category",
      "Due Date",
      "Project ID",
      "Created At",
      "Updated At",
      "Completed At",
    ];

    const csvRows = [
      headers.join(","),
      ...(tasks || []).map((task) => {
        return [
          task.id,
          sanitizeCsvField(task.title || ""),
          sanitizeCsvField(task.description || ""),
          task.status,
          task.priority,
          task.category,
          task.due || "",
          task.project_id || "",
          task.created_at,
          task.updated_at,
          task.completed_at || "",
        ].join(",");
      }),
    ];

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tasks-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

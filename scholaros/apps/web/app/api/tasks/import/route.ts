import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for imported task
const ImportedTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["todo", "progress", "done"]).optional().default("todo"),
  priority: z.enum(["p1", "p2", "p3", "p4"]).optional().default("p3"),
  category: z.enum([
    "research",
    "teaching",
    "grants",
    "grad-mentorship",
    "undergrad-mentorship",
    "admin",
    "misc",
  ]).optional().default("misc"),
  due: z.string().optional().nullable(),
});

const ImportRequestSchema = z.object({
  tasks: z.array(ImportedTaskSchema).min(1).max(500),
  workspace_id: z.string().uuid().optional().nullable(),
});

// POST - Import tasks from CSV/JSON
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let tasksToImport: z.infer<typeof ImportedTaskSchema>[] = [];
    let workspaceId: string | null = null;

    if (contentType.includes("application/json")) {
      // JSON import
      const body = await request.json();
      const parsed = ImportRequestSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      tasksToImport = parsed.data.tasks;
      workspaceId = parsed.data.workspace_id || null;
    } else if (contentType.includes("multipart/form-data")) {
      // CSV file upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const rawWorkspaceId = formData.get("workspace_id") as string | null;

      // Validate workspace_id as UUID if provided
      if (rawWorkspaceId) {
        const uuidResult = z.string().uuid().safeParse(rawWorkspaceId);
        if (!uuidResult.success) {
          return NextResponse.json(
            { error: "Invalid workspace_id format" },
            { status: 400 }
          );
        }
        workspaceId = uuidResult.data;
      }

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      const csvText = await file.text();
      const parsedTasks = parseCSV(csvText);

      if (parsedTasks.length === 0) {
        return NextResponse.json(
          { error: "No valid tasks found in CSV" },
          { status: 400 }
        );
      }

      tasksToImport = parsedTasks;
    } else {
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 400 }
      );
    }

    // Prepare tasks for insertion
    const tasksToInsert = tasksToImport.map((task) => ({
      user_id: user.id,
      workspace_id: workspaceId,
      title: task.title,
      description: task.description || null,
      status: task.status || "todo",
      priority: task.priority || "p3",
      category: task.category || "misc",
      due: task.due ? normalizeDate(task.due) : null,
    }));

    // Insert tasks in batches of 50
    const batchSize = 50;
    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < tasksToInsert.length; i += batchSize) {
      const batch = tasksToInsert.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from("tasks")
        .insert(batch)
        .select();

      if (error) {
        console.error("Batch insert error:", error);
        results.failed += batch.length;
        results.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        results.success += data?.length || 0;
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.success,
      failed: results.failed,
      total: tasksToImport.length,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Parse CSV content
function parseCSV(csvText: string): z.infer<typeof ImportedTaskSchema>[] {
  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const titleIndex = headers.findIndex((h) => h === "title" || h === "name" || h === "task");
  const descriptionIndex = headers.findIndex((h) => h === "description" || h === "notes" || h === "details");
  const statusIndex = headers.findIndex((h) => h === "status" || h === "state");
  const priorityIndex = headers.findIndex((h) => h === "priority");
  const categoryIndex = headers.findIndex((h) => h === "category" || h === "type" || h === "label");
  const dueIndex = headers.findIndex((h) => h === "due" || h === "due date" || h === "deadline" || h === "due_date");

  if (titleIndex === -1) {
    return [];
  }

  const tasks: z.infer<typeof ImportedTaskSchema>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (!values[titleIndex]?.trim()) {
      continue;
    }

    const task: z.infer<typeof ImportedTaskSchema> = {
      title: values[titleIndex].trim(),
      description: descriptionIndex >= 0 ? values[descriptionIndex]?.trim() || null : null,
      status: statusIndex >= 0 ? normalizeStatus(values[statusIndex]) : "todo",
      priority: priorityIndex >= 0 ? normalizePriority(values[priorityIndex]) : "p3",
      category: categoryIndex >= 0 ? normalizeCategory(values[categoryIndex]) : "misc",
      due: dueIndex >= 0 ? values[dueIndex]?.trim() || null : null,
    };

    const validated = ImportedTaskSchema.safeParse(task);
    if (validated.success) {
      tasks.push(validated.data);
    }
  }

  return tasks;
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// Normalize status values
function normalizeStatus(value: string | undefined): "todo" | "progress" | "done" {
  if (!value) return "todo";
  const normalized = value.toLowerCase().trim();

  if (["done", "complete", "completed", "finished"].includes(normalized)) {
    return "done";
  }
  if (["progress", "in progress", "in_progress", "doing", "started", "working"].includes(normalized)) {
    return "progress";
  }
  return "todo";
}

// Normalize priority values
function normalizePriority(value: string | undefined): "p1" | "p2" | "p3" | "p4" {
  if (!value) return "p3";
  const normalized = value.toLowerCase().trim();

  if (["p1", "1", "critical", "urgent", "highest"].includes(normalized)) {
    return "p1";
  }
  if (["p2", "2", "high", "important"].includes(normalized)) {
    return "p2";
  }
  if (["p3", "3", "medium", "normal", "default"].includes(normalized)) {
    return "p3";
  }
  if (["p4", "4", "low", "lowest", "minor"].includes(normalized)) {
    return "p4";
  }
  return "p3";
}

// Normalize category values
function normalizeCategory(value: string | undefined): "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc" {
  if (!value) return "misc";
  const normalized = value.toLowerCase().trim().replace(/\s+/g, "-");

  const categoryMap: Record<string, "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc"> = {
    "research": "research",
    "teaching": "teaching",
    "grants": "grants",
    "grant": "grants",
    "funding": "grants",
    "grad-mentorship": "grad-mentorship",
    "graduate": "grad-mentorship",
    "grad": "grad-mentorship",
    "undergrad-mentorship": "undergrad-mentorship",
    "undergraduate": "undergrad-mentorship",
    "undergrad": "undergrad-mentorship",
    "admin": "admin",
    "administration": "admin",
    "administrative": "admin",
  };

  return categoryMap[normalized] || "misc";
}

/**
 * Normalize date values to YYYY-MM-DD format.
 *
 * Accepted formats:
 *   - ISO 8601: "2024-03-15", "2024-03-15T10:00:00Z" (preferred)
 *   - YYYY/MM/DD: "2024/03/15"
 *   - Unambiguous MM/DD/YYYY: where day > 12, e.g. "03/25/2024" (day=25 cannot be a month)
 *   - Unambiguous DD/MM/YYYY: where day > 12, e.g. "25/03/2024" (first part=25 cannot be a month)
 *
 * Rejected (ambiguous) formats:
 *   - Dates like "03/04/2024" where both first and second parts are <= 12,
 *     making it impossible to distinguish MM/DD/YYYY from DD/MM/YYYY.
 *
 * Returns null for unparseable or ambiguous dates.
 */
function normalizeDate(value: string): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  // Preferred: ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getMonth() === month - 1) {
        return date.toISOString().split("T")[0];
      }
    }
    return null;
  }

  // YYYY/MM/DD format
  const ymdSlashMatch = trimmed.match(/^(\d{4})[/](\d{1,2})[/](\d{1,2})$/);
  if (ymdSlashMatch) {
    const [, yearStr, monthStr, dayStr] = ymdSlashMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getMonth() === month - 1) {
        return date.toISOString().split("T")[0];
      }
    }
    return null;
  }

  // Handle A/B/YYYY or A-B-YYYY where A and B are 1-2 digit numbers
  const ambiguousMatch = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (ambiguousMatch) {
    const [, aStr, bStr, cStr] = ambiguousMatch;
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);
    const c = parseInt(cStr, 10);

    if (c < 1900) return null;

    const aCouldBeMonth = a >= 1 && a <= 12;
    const bCouldBeMonth = b >= 1 && b <= 12;

    // If both a and b could be months (both <= 12), the format is ambiguous
    // e.g. 03/04/2024 could be March 4 or April 3 -- reject
    if (aCouldBeMonth && bCouldBeMonth) {
      return null;
    }

    // Unambiguous MM/DD/YYYY: a <= 12 and b > 12 means a=month, b=day
    if (aCouldBeMonth && !bCouldBeMonth && b >= 1 && b <= 31) {
      const date = new Date(c, a - 1, b);
      if (!isNaN(date.getTime()) && date.getMonth() === a - 1) {
        return date.toISOString().split("T")[0];
      }
    }

    // Unambiguous DD/MM/YYYY: a > 12 means a=day, b=month
    if (!aCouldBeMonth && bCouldBeMonth && a >= 1 && a <= 31) {
      const date = new Date(c, b - 1, a);
      if (!isNaN(date.getTime()) && date.getMonth() === b - 1) {
        return date.toISOString().split("T")[0];
      }
    }

    return null;
  }

  return null;
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for bulk update
const BulkUpdateSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    status: z.enum(["todo", "progress", "done"]).optional(),
    priority: z.enum(["p1", "p2", "p3", "p4"]).optional(),
    category: z.enum([
      "research",
      "teaching",
      "grants",
      "grad-mentorship",
      "undergrad-mentorship",
      "admin",
      "misc",
    ]).optional(),
    due: z.string().nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one update field is required",
  }),
});

// Schema for bulk delete
const BulkDeleteSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(100),
});

// PATCH - Bulk update tasks
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { taskIds, updates } = parsed.data;

    // Build the update object with completed_at handling
    const updateData: Record<string, unknown> = { ...updates };

    // If status is being set to 'done', set completed_at
    if (updates.status === "done") {
      updateData.completed_at = new Date().toISOString();
    } else if (updates.status) {
      // Status is being changed to non-done, clear completed_at
      updateData.completed_at = null;
    }

    // Update all tasks that match the IDs
    // RLS will handle workspace-level permissions
    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .in("id", taskIds)
      .select();

    if (error) {
      console.error("Bulk update error:", error);
      return NextResponse.json(
        { error: "Failed to update tasks" },
        { status: 500 }
      );
    }

    // Detect partial failures: some tasks may not have been updated due to RLS
    const updatedCount = data?.length || 0;
    const requestedCount = taskIds.length;

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      requested: requestedCount,
      partialFailure: updatedCount < requestedCount,
      data,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete tasks
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { taskIds } = parsed.data;

    // Delete all tasks that match the IDs
    // RLS will handle workspace-level permissions
    const { error, count } = await supabase
      .from("tasks")
      .delete({ count: "exact" })
      .in("id", taskIds);

    if (error) {
      console.error("Bulk delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete tasks" },
        { status: 500 }
      );
    }

    const deletedCount = count ?? 0;

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      requested: taskIds.length,
      partialFailure: deletedCount < taskIds.length,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

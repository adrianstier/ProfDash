import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for the request body
const CompleteRecurringSchema = z.object({
  completeThisOnly: z.boolean().default(false), // Complete only this instance (skip in series)
  stopRecurrence: z.boolean().default(false), // Stop all future occurrences
});

/**
 * POST /api/tasks/[id]/complete-recurring
 *
 * Complete a recurring task and optionally generate the next occurrence.
 *
 * For recurring parent tasks:
 * 1. Mark the task as done
 * 2. Create a new task with the next due date based on RRULE
 *
 * For recurring instance tasks:
 * 1. Mark the instance as done
 * 2. Optionally add exception to parent
 *
 * Request body options:
 * - completeThisOnly: If true, add this date as exception and don't regenerate
 * - stopRecurrence: If true, remove recurrence from parent (no more occurrences)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is valid
    }

    const validationResult = CompleteRecurringSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { completeThisOnly, stopRecurrence } = validationResult.data;

    // Fetch the task
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if this is a recurring task
    const isRecurringParent = task.is_recurring && !task.recurrence_parent_id;
    const isRecurringInstance = !!task.recurrence_parent_id;

    if (!isRecurringParent && !isRecurringInstance) {
      // Not a recurring task - just mark as done
      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error completing task:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        completed: updatedTask,
        nextOccurrence: null,
        message: "Task completed",
      });
    }

    // Handle recurring parent task
    if (isRecurringParent) {
      // Mark current task as done
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id);

      if (updateError) {
        console.error("Error completing recurring task:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // If stopping recurrence, remove the rule
      if (stopRecurrence) {
        await supabase
          .from("tasks")
          .update({
            is_recurring: false,
            recurrence_rule: null,
          })
          .eq("id", id);

        return NextResponse.json({
          completed: { ...task, status: "done" },
          nextOccurrence: null,
          message: "Recurring task completed and recurrence stopped",
        });
      }

      // Calculate next occurrence
      const nextDue = calculateNextOccurrence(
        task.recurrence_rule,
        task.due ? new Date(task.due) : new Date(),
        task.recurrence_exceptions || []
      );

      if (!nextDue) {
        // No more occurrences (end of series)
        await supabase
          .from("tasks")
          .update({
            is_recurring: false,
          })
          .eq("id", id);

        return NextResponse.json({
          completed: { ...task, status: "done" },
          nextOccurrence: null,
          message: "Recurring task completed (end of series)",
        });
      }

      // Create new task for next occurrence
      const nextTaskData = {
        user_id: task.user_id,
        workspace_id: task.workspace_id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: "todo",
        due: nextDue.toISOString().split("T")[0],
        project_id: task.project_id,
        assignees: task.assignees,
        tags: task.tags,
        is_recurring: true,
        recurrence_rule: task.recurrence_rule,
        recurrence_exceptions: task.recurrence_exceptions,
      };

      const { data: nextTask, error: createError } = await supabase
        .from("tasks")
        .insert(nextTaskData)
        .select()
        .single();

      if (createError) {
        console.error("Error creating next occurrence:", createError);
        return NextResponse.json({
          completed: { ...task, status: "done" },
          nextOccurrence: null,
          message: "Task completed but failed to create next occurrence",
          error: createError.message,
        });
      }

      return NextResponse.json({
        completed: { ...task, status: "done" },
        nextOccurrence: nextTask,
        message: "Recurring task completed and next occurrence created",
      });
    }

    // Handle recurring instance task
    if (isRecurringInstance) {
      // Mark instance as done
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id);

      if (updateError) {
        console.error("Error completing instance:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // If completeThisOnly, add exception to parent
      if (completeThisOnly && task.recurrence_date) {
        const { data: parent } = await supabase
          .from("tasks")
          .select("recurrence_exceptions")
          .eq("id", task.recurrence_parent_id)
          .single();

        if (parent) {
          const exceptions = [...(parent.recurrence_exceptions || []), task.recurrence_date];
          await supabase
            .from("tasks")
            .update({ recurrence_exceptions: exceptions })
            .eq("id", task.recurrence_parent_id);
        }
      }

      return NextResponse.json({
        completed: { ...task, status: "done" },
        nextOccurrence: null,
        message: "Instance completed",
      });
    }

    return NextResponse.json({
      completed: task,
      nextOccurrence: null,
      message: "Task processed",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Calculate the next occurrence date based on RRULE
 */
function calculateNextOccurrence(
  rrule: string | null,
  currentDue: Date,
  exceptions: string[]
): Date | null {
  if (!rrule || !rrule.startsWith("RRULE:")) {
    return null;
  }

  // Parse RRULE components
  const ruleContent = rrule.substring(6);
  const parts = ruleContent.split(";");
  const rule: {
    freq?: string;
    interval?: number;
    byday?: string[];
    until?: Date;
    count?: number;
  } = {};

  for (const part of parts) {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        rule.freq = value;
        break;
      case "INTERVAL":
        rule.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        rule.byday = value.split(",");
        break;
      case "UNTIL":
        const year = parseInt(value.substring(0, 4), 10);
        const month = parseInt(value.substring(4, 6), 10) - 1;
        const day = parseInt(value.substring(6, 8), 10);
        rule.until = new Date(year, month, day);
        break;
      case "COUNT":
        rule.count = parseInt(value, 10);
        break;
    }
  }

  const interval = rule.interval || 1;
  const exceptionsSet = new Set(exceptions);
  let nextDate = new Date(currentDue);
  let iterations = 0;
  const maxIterations = 365; // Safety limit

  // Day mapping for BYDAY
  const dayToNumber: Record<string, number> = {
    SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
  };

  while (iterations < maxIterations) {
    iterations++;

    // Move to next occurrence based on frequency
    switch (rule.freq) {
      case "DAILY":
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case "WEEKLY":
        if (rule.byday && rule.byday.length > 0) {
          // Find next matching day
          let found = false;
          for (let i = 0; i < 7 * interval && !found; i++) {
            nextDate.setDate(nextDate.getDate() + 1);
            const dayName = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][nextDate.getDay()];
            if (rule.byday.includes(dayName)) {
              found = true;
            }
          }
        } else {
          nextDate.setDate(nextDate.getDate() + interval * 7);
        }
        break;

      case "MONTHLY":
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;

      case "YEARLY":
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;

      default:
        return null;
    }

    // Check end conditions
    if (rule.until && nextDate > rule.until) {
      return null;
    }

    // Check if date is excluded
    const dateStr = nextDate.toISOString().split("T")[0];
    if (!exceptionsSet.has(dateStr)) {
      return nextDate;
    }
  }

  return null;
}

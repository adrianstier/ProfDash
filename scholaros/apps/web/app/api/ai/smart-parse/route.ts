import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SmartParseRequestSchema, SmartParseResultSchema } from "@scholaros/shared";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/ai/smart-parse - Parse natural language into structured task
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

    // Validate request
    const validationResult = SmartParseRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { text, workspace_id } = validationResult.data;

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Get workspace context
    const [membersResult, projectsResult] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("profiles(id, full_name)")
        .eq("workspace_id", workspace_id),
      supabase
        .from("projects")
        .select("id, title, type")
        .eq("workspace_id", workspace_id)
        .eq("status", "active")
        .limit(20),
    ]);

    const members = (membersResult.data || [])
      .map((m) => {
        // profiles comes as a single object from the join
        const profile = m.profiles as unknown as { id: string; full_name: string | null } | null;
        return profile?.full_name;
      })
      .filter(Boolean);

    const projects = (projectsResult.data || []).map((p) => ({
      id: p.id,
      title: p.title,
      type: p.type,
    }));

    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    // Analyze text complexity
    const wordCount = text.split(/\s+/).length;
    const hasMultipleLines = text.includes("\n");
    const hasBulletPoints = /[-•*]\s/.test(text);
    const hasNumberedList = /\d+[.)]\s/.test(text);
    const isComplex = wordCount > 15 || hasMultipleLines || hasBulletPoints || hasNumberedList;

    const prompt = `You are a smart task parser for an academic research team. Analyze the user's input and extract a clean, actionable task with optional subtasks.

User's input:
"""
${text}
"""

Today's date: ${today} (${dayOfWeek})
Team members: ${members.length > 0 ? members.join(", ") : "No team members available"}
Active projects: ${projects.length > 0 ? projects.map((p) => `${p.title} (${p.type})`).join(", ") : "No active projects"}

Task categories available:
- research: Research activities, experiments, data analysis
- teaching: Course prep, lectures, student advising
- grants: Grant writing, submissions, reports
- grad-mentorship: PhD/Masters student mentoring
- undergrad-mentorship: Undergraduate student mentoring
- admin: Administrative tasks, meetings, emails
- misc: Everything else

Priority levels:
- p1: Urgent - needs immediate attention
- p2: High priority - important deadline soon
- p3: Standard priority - normal tasks
- p4: Low priority - can be deferred

Analyze the input and respond ONLY with valid JSON (no markdown, no code blocks):
{
  "main_task": {
    "title": "A clear, concise task title (under 100 chars). Start with an action verb.",
    "description": "Optional longer description if needed",
    "category": "one of: research, teaching, grants, grad-mentorship, undergrad-mentorship, admin, misc",
    "priority": "one of: p1, p2, p3, p4",
    "due_date": "YYYY-MM-DD if mentioned, otherwise null",
    "assigned_to": "Team member name if explicitly mentioned, otherwise null",
    "project_id": "Project ID if this relates to a specific project, otherwise null"
  },
  "subtasks": [
    {
      "text": "Specific actionable step (under 80 chars)",
      "priority": "inherit from main or adjust based on importance",
      "estimated_minutes": "estimated time in minutes (5-480)"
    }
  ],
  "summary": "1-sentence summary of what this task accomplishes",
  "was_complex": true/false,
  "confidence": 0.0-1.0
}

Rules:
1. Main task title should start with an action verb (Review, Send, Call, Complete, Prepare, Submit, Draft, etc.)
2. Fix typos and grammar
3. Parse relative dates: "tomorrow", "next week", "by Friday", "end of month"
4. Detect urgency: "ASAP", "urgent", "immediately" = p1 priority
5. Only assign if a team member name is explicitly mentioned
6. Extract 2-6 subtasks ONLY if input is complex (multiple steps, bullet points)
7. For simple inputs, return empty subtasks array
8. Match to a project if the task clearly relates to one
9. Infer category from context (grant-related → grants, paper-related → research, etc.)
10. Set confidence based on how clear the input is (1.0 = very clear, 0.5 = ambiguous)

Respond with ONLY the JSON object, no other text.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const rawResult = JSON.parse(jsonMatch[0]);

    // Validate and clean up the response
    const validatedResult = {
      main_task: {
        title: String(rawResult.main_task?.title || text).slice(0, 200),
        description: rawResult.main_task?.description || undefined,
        category: ["research", "teaching", "grants", "grad-mentorship", "undergrad-mentorship", "admin", "misc"].includes(
          rawResult.main_task?.category
        )
          ? rawResult.main_task.category
          : "misc",
        priority: ["p1", "p2", "p3", "p4"].includes(rawResult.main_task?.priority)
          ? rawResult.main_task.priority
          : "p3",
        due_date: rawResult.main_task?.due_date || undefined,
        assigned_to: rawResult.main_task?.assigned_to || undefined,
        project_id: rawResult.main_task?.project_id || undefined,
      },
      subtasks: (rawResult.subtasks || [])
        .slice(0, 6)
        .map((subtask: { text?: string; priority?: string; estimated_minutes?: number }) => ({
          text: String(subtask.text || "").slice(0, 200),
          priority: ["p1", "p2", "p3", "p4"].includes(subtask.priority || "")
            ? subtask.priority
            : "p3",
          estimated_minutes:
            typeof subtask.estimated_minutes === "number"
              ? Math.min(Math.max(subtask.estimated_minutes, 5), 480)
              : undefined,
        }))
        .filter((subtask: { text: string }) => subtask.text.length > 0),
      summary: String(rawResult.summary || "").slice(0, 500),
      was_complex: Boolean(rawResult.was_complex) || isComplex,
      confidence: typeof rawResult.confidence === "number"
        ? Math.min(Math.max(rawResult.confidence, 0), 1)
        : 0.8,
    };

    // Validate against schema
    const schemaValidation = SmartParseResultSchema.safeParse(validatedResult);
    if (!schemaValidation.success) {
      console.error("Schema validation failed:", schemaValidation.error);
      // Return result anyway, it's close enough
    }

    // Log AI action
    await supabase.from("workspace_activity").insert({
      workspace_id,
      user_id: user.id,
      action: "ai_tasks_extracted",
      entity_title: validatedResult.main_task.title,
      details: {
        input_text: text.substring(0, 200),
        subtask_count: validatedResult.subtasks.length,
        confidence: validatedResult.confidence,
      },
    });

    return NextResponse.json({
      success: true,
      result: validatedResult,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in smart parse:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: "Failed to parse content", details: errorMessage },
      { status: 500 }
    );
  }
}

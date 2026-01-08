import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EnhanceRequestSchema = z.object({
  task_title: z.string().min(1),
  task_description: z.string().optional(),
  workspace_id: z.string().uuid(),
  current_priority: z.enum(["p1", "p2", "p3", "p4"]).optional(),
  current_category: z.string().optional(),
  enhance_options: z.object({
    improve_clarity: z.boolean().default(true),
    suggest_priority: z.boolean().default(true),
    suggest_category: z.boolean().default(true),
    suggest_due_date: z.boolean().default(true),
    extract_metadata: z.boolean().default(true),
    add_context: z.boolean().default(true),
  }).optional(),
});

const EnhancedTaskSchema = z.object({
  enhanced_title: z.string(),
  enhanced_description: z.string().optional(),
  suggested_priority: z.enum(["p1", "p2", "p3", "p4"]),
  suggested_category: z.enum([
    "research",
    "teaching",
    "grants",
    "grad-mentorship",
    "undergrad-mentorship",
    "admin",
    "misc",
  ]),
  suggested_due_date: z.string().optional(), // ISO date string
  due_date_reasoning: z.string().optional(),
  extracted_entities: z.object({
    people: z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
    deadlines: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  improvements_made: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  original_issues: z.array(z.string()).optional(),
});

export type EnhancedTask = z.infer<typeof EnhancedTaskSchema>;

// POST /api/ai/enhance-task - Enhance and improve a task
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
    const validationResult = EnhanceRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { task_title, task_description, workspace_id, current_priority, current_category, enhance_options } = validationResult.data;

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
        .limit(15),
    ]);

    const members = (membersResult.data || [])
      .map((m) => {
        const profile = m.profiles as unknown as { id: string; full_name: string | null } | null;
        return profile?.full_name;
      })
      .filter(Boolean);

    const projects = (projectsResult.data || []).map((p) => ({
      title: p.title,
      type: p.type,
    }));

    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const options = enhance_options || {
      improve_clarity: true,
      suggest_priority: true,
      suggest_category: true,
      suggest_due_date: true,
      extract_metadata: true,
      add_context: true,
    };

    const prompt = `You are an expert task optimizer for academic research teams. Analyze and enhance the following task.

Original Task:
- Title: "${task_title}"
${task_description ? `- Description: "${task_description}"` : "- Description: (none provided)"}
${current_priority ? `- Current Priority: ${current_priority}` : ""}
${current_category ? `- Current Category: ${current_category}` : ""}

Today's date: ${today} (${dayOfWeek})
Team members: ${members.length > 0 ? members.join(", ") : "Not specified"}
Active projects: ${projects.length > 0 ? projects.map(p => `${p.title} (${p.type})`).join(", ") : "None"}

Enhancement options enabled:
${options.improve_clarity ? "- Improve clarity and specificity" : ""}
${options.suggest_priority ? "- Suggest appropriate priority" : ""}
${options.suggest_category ? "- Suggest category" : ""}
${options.suggest_due_date ? "- Suggest due date if applicable" : ""}
${options.extract_metadata ? "- Extract entities (people, projects, deadlines)" : ""}
${options.add_context ? "- Add helpful context" : ""}

Academic Categories:
- research: Lab work, experiments, data analysis, papers
- teaching: Courses, lectures, office hours, curriculum
- grants: Proposals, reports, funding applications
- grad-mentorship: PhD/Masters student advising
- undergrad-mentorship: Undergraduate research supervision
- admin: Administrative tasks, meetings, reports
- misc: Other tasks

Respond with a JSON object matching this exact structure:
{
  "enhanced_title": "Clear, specific, actionable title",
  "enhanced_description": "Detailed description with context and success criteria",
  "suggested_priority": "p1" | "p2" | "p3" | "p4",
  "suggested_category": "research" | "teaching" | "grants" | "grad-mentorship" | "undergrad-mentorship" | "admin" | "misc",
  "suggested_due_date": "YYYY-MM-DD or null if not applicable",
  "due_date_reasoning": "Why this due date was suggested",
  "extracted_entities": {
    "people": ["names mentioned"],
    "projects": ["project names"],
    "deadlines": ["any dates/deadlines mentioned"],
    "keywords": ["key topics/terms"]
  },
  "improvements_made": ["List of specific improvements made"],
  "confidence": 0.85,
  "original_issues": ["Issues identified in the original task"]
}

Priority guidelines:
- p1: Due within 24-48 hours, blocking others, critical deadlines
- p2: Due within a week, important but not urgent
- p3: Standard tasks, flexible timeline
- p4: Low priority, nice-to-have

Return ONLY valid JSON, no markdown or explanation.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON response
    let result: EnhancedTask;
    try {
      const cleanedText = textContent.text.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textContent.text },
        { status: 500 }
      );
    }

    // Validate result
    const resultValidation = EnhancedTaskSchema.safeParse(result);
    if (!resultValidation.success) {
      return NextResponse.json(
        { error: "Invalid AI response structure", details: resultValidation.error.flatten() },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("workspace_activity").insert({
      workspace_id,
      user_id: user.id,
      action: "ai_task_enhanced",
      entity_title: task_title,
      details: {
        improvements_count: result.improvements_made.length,
        confidence: result.confidence,
        suggested_priority: result.suggested_priority,
        suggested_category: result.suggested_category,
      },
    });

    return NextResponse.json({
      success: true,
      result: resultValidation.data,
    });
  } catch (error) {
    console.error("Task enhancement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

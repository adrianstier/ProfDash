import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  detectAcademicPattern,
  getAcademicPatternsContext,
} from "@/lib/utils/academic-patterns";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BreakdownRequestSchema = z.object({
  task_title: z.string().min(1),
  task_description: z.string().optional(),
  workspace_id: z.string().uuid(),
  context: z.string().optional(), // Additional context about the task
  max_subtasks: z.number().min(2).max(15).default(5),
});

const SubtaskSchema = z.object({
  text: z.string(),
  priority: z.enum(["p1", "p2", "p3", "p4"]),
  estimated_minutes: z.number().optional(),
  order: z.number(),
  dependencies: z.array(z.number()).optional(), // Indices of subtasks this depends on
});

const BreakdownResultSchema = z.object({
  subtasks: z.array(SubtaskSchema),
  summary: z.string(),
  total_estimated_minutes: z.number().optional(),
  complexity: z.enum(["low", "medium", "high"]),
  suggestions: z.array(z.string()).optional(),
});

export type BreakdownResult = z.infer<typeof BreakdownResultSchema>;

// POST /api/ai/breakdown-task - Break down a task into subtasks
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
    const validationResult = BreakdownRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { task_title, task_description, workspace_id, context, max_subtasks } = validationResult.data;

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

    // Get workspace context for better suggestions
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, type")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .limit(10);

    // Detect academic pattern for richer context
    const patternMatch = detectAcademicPattern(task_title + (task_description ? ` ${task_description}` : ""));
    const patternContext = patternMatch
      ? `\nDetected academic category: ${patternMatch.category.toUpperCase()} (${Math.round(patternMatch.confidence * 100)}% confidence)
Matched keywords: ${patternMatch.keywords.join(", ")}
${patternMatch.tip ? `Tip: ${patternMatch.tip}` : ""}
Category-specific suggested subtasks to consider:
${patternMatch.suggestedSubtasks.map((s) => `- ${s}`).join("\n")}`
      : "";

    const prompt = `You are an expert task planner for academic research teams. Break down the following task into actionable subtasks.

Task Title: "${task_title}"
${task_description ? `Task Description: "${task_description}"` : ""}
${context ? `Additional Context: "${context}"` : ""}
${projects && projects.length > 0 ? `Active Projects: ${projects.map(p => `${p.title} (${p.type})`).join(", ")}` : ""}
${patternContext}

ACADEMIC WORKFLOW REFERENCE:
${getAcademicPatternsContext()}

Guidelines:
- Create ${max_subtasks} or fewer subtasks (only as many as needed)
- Each subtask should be specific and actionable
- Order subtasks logically (sequential steps)
- Include time estimates in minutes when possible
- Identify dependencies between subtasks
- Use the detected academic category and suggested subtasks as a starting point, but customize for the specific task
- Consider academic context (research, grants, publications, teaching, mentorship)
- For research tasks, include documentation and reproducibility steps
- For grant tasks, include compliance and submission verification steps
- For teaching tasks, include student communication and feedback steps

Respond with a JSON object matching this exact structure:
{
  "subtasks": [
    {
      "text": "Specific actionable subtask description",
      "priority": "p1" | "p2" | "p3" | "p4",
      "estimated_minutes": 30,
      "order": 1,
      "dependencies": []
    }
  ],
  "summary": "Brief summary of the breakdown approach",
  "total_estimated_minutes": 120,
  "complexity": "low" | "medium" | "high",
  "suggestions": ["Optional helpful suggestions for completing this task"]
}

Priority levels:
- p1: Urgent/critical step
- p2: High priority
- p3: Normal priority
- p4: Low priority/optional

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
    let result: BreakdownResult;
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
    const resultValidation = BreakdownResultSchema.safeParse(result);
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
      action: "ai_task_breakdown",
      entity_title: task_title,
      details: {
        subtask_count: result.subtasks.length,
        complexity: result.complexity,
        total_estimated_minutes: result.total_estimated_minutes,
      },
    });

    return NextResponse.json({
      success: true,
      result: resultValidation.data,
    });
  } catch (error) {
    console.error("Task breakdown error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

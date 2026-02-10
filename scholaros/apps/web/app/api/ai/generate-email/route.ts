import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS, getRateLimitHeaders } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EmailRequestSchema = z.object({
  workspace_id: z.string().uuid(),
  email_type: z.enum([
    "project_update",
    "meeting_request",
    "deadline_reminder",
    "collaboration_invite",
    "progress_report",
    "feedback_request",
    "thank_you",
    "follow_up",
    "custom",
  ]),
  tone: z.enum(["formal", "friendly", "brief"]).default("friendly"),
  recipient_name: z.string().optional(),
  recipient_role: z.string().optional(), // e.g., "collaborator", "student", "department chair"
  subject_context: z.string(), // What the email is about
  additional_context: z.string().optional(),
  include_task_summary: z.boolean().default(false),
  task_ids: z.array(z.string().uuid()).optional(), // Tasks to include in summary
  project_id: z.string().uuid().optional(), // Project context
});

const GeneratedEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  tone_applied: z.string(),
  key_points: z.array(z.string()),
  suggested_follow_up: z.string().optional(),
  warnings: z.array(z.string()).optional(), // Warnings about sensitive content
});

export type GeneratedEmail = z.infer<typeof GeneratedEmailSchema>;

// POST /api/ai/generate-email - Generate professional emails
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

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = checkRateLimit(`ai:email:${rateLimitId}`, RATE_LIMIT_CONFIGS.ai);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();

    // Validate request
    const validationResult = EmailRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      workspace_id,
      email_type,
      tone,
      recipient_name,
      recipient_role,
      subject_context,
      additional_context,
      include_task_summary,
      task_ids,
      project_id,
    } = validationResult.data;

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

    // Get user profile for sender name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = profile?.full_name || "Researcher";

    // Get task context if requested
    let taskContext = "";
    if (include_task_summary && task_ids && task_ids.length > 0) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("title, status, priority, due_date")
        .in("id", task_ids)
        .eq("workspace_id", workspace_id);

      if (tasks && tasks.length > 0) {
        taskContext = "\n\nRelated Tasks:\n" + tasks.map(t =>
          `- ${t.title} (${t.status}, ${t.priority}${t.due_date ? `, due ${t.due_date}` : ""})`
        ).join("\n");
      }
    }

    // Get project context if provided
    let projectContext = "";
    if (project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("title, type, status, current_stage")
        .eq("id", project_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (project) {
        projectContext = `\n\nProject: ${project.title} (${project.type}, ${project.status}, stage: ${project.current_stage})`;
      }
    }

    const emailTypeDescriptions: Record<string, string> = {
      project_update: "Update on project progress, milestones, or status changes",
      meeting_request: "Request to schedule a meeting or discussion",
      deadline_reminder: "Reminder about upcoming deadlines or deliverables",
      collaboration_invite: "Invitation to collaborate on research or project",
      progress_report: "Summary of recent progress and next steps",
      feedback_request: "Request for feedback, review, or input",
      thank_you: "Expression of gratitude or appreciation",
      follow_up: "Following up on previous communication or action items",
      custom: "Custom email based on provided context",
    };

    const toneInstructions: Record<string, string> = {
      formal: "Use formal, professional language appropriate for official correspondence. Avoid contractions and casual phrases.",
      friendly: "Use warm, approachable language while maintaining professionalism. Contractions are okay.",
      brief: "Be concise and to the point. Short sentences, minimal pleasantries, focus on key information.",
    };

    const prompt = `You are an expert at writing professional academic emails. Generate an email based on the following parameters.

Email Type: ${email_type} - ${emailTypeDescriptions[email_type]}
Tone: ${tone} - ${toneInstructions[tone]}
Sender: ${senderName}
${recipient_name ? `Recipient: ${recipient_name}` : "Recipient: (not specified)"}
${recipient_role ? `Recipient Role: ${recipient_role}` : ""}

Subject Context: ${subject_context}
${additional_context ? `Additional Context: ${additional_context}` : ""}
${projectContext}
${taskContext}

Guidelines:
- Write in the specified tone
- Be appropriate for academic/research context
- Include a clear subject line
- Structure the email with greeting, body, and closing
- Use appropriate salutations based on recipient role
- Flag any potentially sensitive content

Respond with a JSON object:
{
  "subject": "Clear, descriptive email subject",
  "body": "Full email body with proper formatting (use \\n for line breaks)",
  "tone_applied": "Brief description of tone used",
  "key_points": ["Main points covered in the email"],
  "suggested_follow_up": "Suggested next action or follow-up",
  "warnings": ["Any warnings about content (e.g., 'Contains deadline pressure')"]
}

Return ONLY valid JSON, no markdown.`;

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
    let result: GeneratedEmail;
    try {
      const cleanedText = textContent.text.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse AI response for generate-email:", textContent.text.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate result
    const resultValidation = GeneratedEmailSchema.safeParse(result);
    if (!resultValidation.success) {
      return NextResponse.json(
        { error: "Invalid AI response structure", details: resultValidation.error.flatten() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: resultValidation.data,
    });
  } catch (error) {
    console.error("Email generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

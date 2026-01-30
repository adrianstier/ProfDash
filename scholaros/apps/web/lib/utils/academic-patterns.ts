/**
 * Academic Task Pattern Recognition for ScholarOS
 *
 * Adapted from academic-to-do-app patterns, tailored to ScholarOS categories.
 * Provides intelligent task categorization and context-aware subtask suggestions
 * for academic workflows including research, teaching, grants, and admin.
 */

import type { TaskCategory } from "@scholaros/shared";

export interface PatternMatch {
  category: TaskCategory;
  confidence: number; // 0-1
  suggestedSubtasks: string[];
  keywords: string[];
  tip?: string;
}

interface PatternDefinition {
  category: TaskCategory;
  keywords: string[];
  patterns: RegExp[];
  subtasks: string[];
  tip?: string;
}

/**
 * Pattern definitions mapped to ScholarOS task categories:
 * research, teaching, grants, admin, grad-mentorship, undergrad-mentorship, misc
 */
const ACADEMIC_PATTERNS: PatternDefinition[] = [
  // Research tasks
  {
    category: "research",
    keywords: [
      "literature", "data", "experiment", "survey", "field", "lab",
      "hypothesis", "methodology", "pilot", "participant", "sample",
      "protocol", "study", "research", "analysis", "statistics",
      "model", "regression", "visualization", "plot", "figure",
      "manuscript", "paper", "draft", "write", "thesis", "dissertation",
      "abstract", "introduction", "methods", "results", "discussion",
      "revision", "resubmit", "reviewer", "rebuttal",
    ],
    patterns: [
      /literature\s*review/i,
      /data\s*(collection|analysis|cleaning)/i,
      /run\s*(experiment|study|analysis|regression|anova|t-test)/i,
      /pilot\s*(study|test)/i,
      /recruit\s*participants/i,
      /research\s*(design|method|protocol|question)/i,
      /write\s*(draft|paper|manuscript|thesis|dissertation|abstract)/i,
      /(draft|revise)\s*(the\s*)?(introduction|conclusion|methods|results|discussion)/i,
      /manuscript\s*(draft|revision|submission)/i,
      /thesis\s*(chapter|section|defense)/i,
      /dissertation\s*(writing|progress|defense)/i,
      /(analyze|process)\s*(data|results)/i,
      /create\s*(visualization|plot|figure|table)/i,
      /statistical\s*(analysis|test)/i,
      /address\s*(reviewer\s*)?comments/i,
      /respond\s*to\s*(reviewer|feedback)/i,
      /point-by-point\s*response/i,
      /\b(R|python|SPSS|stata)\s*(script|code|analysis)/i,
    ],
    subtasks: [
      "Define research questions and objectives",
      "Search databases for relevant sources",
      "Review and annotate key materials",
      "Clean and prepare data",
      "Run analyses and document results",
      "Create outline and structure",
      "Write first draft",
      "Add citations and references",
      "Revise and edit",
    ],
    tip: "Break large research tasks into weekly milestones to track progress effectively.",
  },

  // Teaching tasks
  {
    category: "teaching",
    keywords: [
      "lecture", "syllabus", "grading", "exam", "assignment", "course",
      "class", "student", "office hours", "midterm", "final", "quiz",
      "homework", "problem set", "lab report", "evaluation",
      "curriculum", "TA", "teaching assistant", "recitation",
      "seminar", "colloquium", "presentation", "slides",
    ],
    patterns: [
      /prepare\s*(lecture|syllabus|exam|quiz|assignment|slides)/i,
      /grade\s*(paper|assignment|exam|homework|midterm|final)/i,
      /office\s*hours/i,
      /course\s*(preparation|design|material|project|assignment)/i,
      /(study|prepare)\s*(for\s*)?(exam|quiz|midterm|final)/i,
      /teaching\s*(evaluation|feedback)/i,
      /update\s*(syllabus|course|gradebook)/i,
      /prepare\s*(presentation|slides|talk|poster)/i,
      /conference\s*(presentation|talk|poster)/i,
      /practice\s*(presentation|talk)/i,
      /seminar\s*(talk|presentation|attendance)/i,
    ],
    subtasks: [
      "Review course materials and learning objectives",
      "Prepare lecture slides or handouts",
      "Create or update assignment rubric",
      "Grade and provide feedback",
      "Update gradebook and course records",
      "Hold office hours or student meetings",
    ],
    tip: "Batch grading sessions and set clear rubrics to streamline teaching tasks.",
  },

  // Grant tasks
  {
    category: "grants",
    keywords: [
      "grant", "proposal", "NSF", "NIH", "funding", "budget",
      "award", "application", "sponsor", "foundation", "R01", "R21",
      "CAREER", "supplement", "progress report", "no-cost extension",
      "subaward", "subcontract", "cost share",
    ],
    patterns: [
      /grant\s*(proposal|application|report|submission|deadline)/i,
      /(NSF|NIH|DOE|DOD|DARPA|USDA)\s*(grant|proposal|deadline|submission)/i,
      /funding\s*(opportunity|application|deadline)/i,
      /budget\s*(justification|narrative|preparation)/i,
      /progress\s*report/i,
      /submit\s*(grant|proposal)/i,
      /prepare\s*(budget|proposal|application)/i,
      /(R01|R21|CAREER|K99)\s*(application|submission|deadline)/i,
      /no-cost\s*extension/i,
    ],
    subtasks: [
      "Review funding opportunity announcement",
      "Draft specific aims or project summary",
      "Prepare budget and justification",
      "Write project narrative sections",
      "Gather biosketches and support documents",
      "Internal review and revisions",
      "Complete submission forms and upload",
      "Verify submission receipt",
    ],
    tip: "Submit grant applications at least 2 days before deadline to avoid technical issues.",
  },

  // Admin tasks
  {
    category: "admin",
    keywords: [
      "form", "IRB", "IACUC", "compliance", "report", "review",
      "reimbursement", "travel", "expense", "registration", "paperwork",
      "administrative", "committee", "service", "annual review",
      "certification", "training", "onboarding",
    ],
    patterns: [
      /IRB\s*(submission|amendment|renewal|protocol|approval)/i,
      /IACUC\s*(submission|protocol|amendment|renewal)/i,
      /complete\s*(form|application|paperwork|report)/i,
      /(travel|expense)\s*reimbursement/i,
      /compliance\s*(training|report|review)/i,
      /annual\s*(review|report|evaluation)/i,
      /submit\s*(report|form)/i,
      /committee\s*(meeting|service|review)/i,
      /peer\s*review/i,
    ],
    subtasks: [
      "Gather required documents and information",
      "Complete all form sections",
      "Get necessary signatures or approvals",
      "Submit and confirm receipt",
      "File copies for records",
    ],
    tip: "Keep copies of all submitted forms and confirmation numbers.",
  },

  // Grad mentorship tasks
  {
    category: "grad-mentorship",
    keywords: [
      "PhD", "doctoral", "graduate student", "grad student", "advisor",
      "committee", "qualifying exam", "candidacy", "dissertation",
      "defense", "mentee", "advisee", "postdoc",
    ],
    patterns: [
      /meet(ing)?\s*(with\s*)?(advisor|advisee|mentee|grad\s*student|PhD\s*student)/i,
      /(thesis|dissertation)\s*(committee|defense|proposal|meeting)/i,
      /qualifying\s*(exam|examination)/i,
      /candidacy\s*(exam|examination)/i,
      /PhD\s*(student|candidate|defense|meeting)/i,
      /graduate\s*student\s*(meeting|review|progress)/i,
      /postdoc\s*(meeting|review|mentoring)/i,
      /advisor\s*meeting/i,
      /lab\s*meeting/i,
    ],
    subtasks: [
      "Prepare agenda and talking points",
      "Review student progress and milestones",
      "Provide feedback on recent work",
      "Set goals and next steps",
      "Document meeting notes and action items",
    ],
    tip: "Send meeting agenda to students at least 24 hours before the meeting.",
  },

  // Undergrad mentorship tasks
  {
    category: "undergrad-mentorship",
    keywords: [
      "undergraduate", "undergrad", "honors thesis", "senior project",
      "research assistant", "RA", "REU", "capstone", "internship",
    ],
    patterns: [
      /undergrad(uate)?\s*(student|researcher|meeting|project)/i,
      /honors\s*(thesis|project)/i,
      /senior\s*(project|thesis|capstone)/i,
      /REU\s*(student|program|project)/i,
      /research\s*assistant\s*(meeting|training|onboarding)/i,
      /capstone\s*(project|meeting|review)/i,
    ],
    subtasks: [
      "Prepare materials for student meeting",
      "Review student work and provide feedback",
      "Assign next research tasks",
      "Check in on progress and troubleshoot",
      "Document student contributions",
    ],
    tip: "Set clear weekly expectations and milestones for undergraduate researchers.",
  },

  // Meeting tasks (maps to misc or contextual category)
  {
    category: "misc",
    keywords: [
      "meeting", "call", "email", "schedule", "agenda",
      "follow up", "follow-up", "check in", "check-in",
      "conference", "workshop", "webinar",
    ],
    patterns: [
      /schedule\s*(meeting|call|appointment)/i,
      /prepare\s*(agenda|notes)/i,
      /follow\s*up\s*(with|on|about)/i,
      /check\s*in\s*(with|on)/i,
      /attend\s*(conference|workshop|webinar|seminar)/i,
      /send\s*(email|message|reminder)/i,
      /(book|reserve)\s*(room|space|travel)/i,
    ],
    subtasks: [
      "Prepare agenda or talking points",
      "Review relevant materials beforehand",
      "Send reminders to participants",
      "Take notes during meeting",
      "Document action items and follow up",
    ],
    tip: "Document action items immediately after meetings to avoid losing context.",
  },
];

/**
 * Analyzes task text and returns the best matching academic pattern with suggestions.
 * Returns null if no pattern matches with sufficient confidence.
 */
export function detectAcademicPattern(taskText: string): PatternMatch | null {
  if (!taskText || typeof taskText !== "string" || taskText.length > 1000) {
    return null;
  }

  // Require a minimum length before attempting detection
  if (taskText.trim().length < 5) {
    return null;
  }

  const normalizedText = taskText.toLowerCase();
  let bestMatch: { pattern: PatternDefinition; score: number; matchedKeywords: string[] } | null = null;

  for (const pattern of ACADEMIC_PATTERNS) {
    let score = 0;
    const matchedKeywords: string[] = [];

    // Check keyword matches (weight: 1)
    for (const keyword of pattern.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }

    // Check regex pattern matches (weight: 2, more specific)
    for (const regex of pattern.patterns) {
      if (regex.test(taskText)) {
        score += 2;
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { pattern, score, matchedKeywords };
    }
  }

  if (!bestMatch) {
    return null;
  }

  // Calculate confidence: normalize score against max possible
  const maxScore =
    bestMatch.pattern.keywords.length +
    bestMatch.pattern.patterns.length * 2;
  const confidence = Math.min(bestMatch.score / maxScore, 1);

  // Only return if confidence meets a minimum threshold
  if (confidence < 0.05) {
    return null;
  }

  return {
    category: bestMatch.pattern.category,
    confidence,
    suggestedSubtasks: bestMatch.pattern.subtasks,
    keywords: bestMatch.matchedKeywords,
    tip: bestMatch.pattern.tip,
  };
}

/**
 * Gets all academic pattern definitions formatted as text for AI context injection.
 * Used to enrich AI prompts with academic workflow knowledge.
 */
export function getAcademicPatternsContext(): string {
  return ACADEMIC_PATTERNS.map((p) => {
    const subtaskList = p.subtasks
      .map((s) => `  - ${s}`)
      .join("\n");
    return `${p.category.toUpperCase()}:\nKeywords: ${p.keywords.slice(0, 8).join(", ")}\nTypical subtasks:\n${subtaskList}`;
  }).join("\n\n");
}

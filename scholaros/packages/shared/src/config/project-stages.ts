// Project stage configurations for different project types

export const MANUSCRIPT_STAGES = [
  { id: "idea", label: "Idea", color: "bg-gray-500" },
  { id: "outline", label: "Outline", color: "bg-purple-500" },
  { id: "drafting", label: "Drafting", color: "bg-blue-500" },
  { id: "internal-review", label: "Internal Review", color: "bg-yellow-500" },
  { id: "submission", label: "Submission", color: "bg-orange-500" },
  { id: "revision", label: "Revision", color: "bg-red-500" },
  { id: "accepted", label: "Accepted", color: "bg-green-500" },
  { id: "published", label: "Published", color: "bg-emerald-600" },
] as const;

export const GRANT_STAGES = [
  { id: "discovery", label: "Discovery", color: "bg-gray-500" },
  { id: "fit-assessment", label: "Fit Assessment", color: "bg-purple-500" },
  { id: "intent-loi", label: "LOI", color: "bg-indigo-500" },
  { id: "drafting", label: "Drafting", color: "bg-blue-500" },
  { id: "internal-routing", label: "Internal Routing", color: "bg-yellow-500" },
  { id: "submission", label: "Submission", color: "bg-orange-500" },
  { id: "awarded", label: "Awarded", color: "bg-green-500" },
  { id: "active", label: "Active", color: "bg-emerald-500" },
  { id: "closeout", label: "Closeout", color: "bg-slate-500" },
] as const;

export const GENERAL_STAGES = [
  { id: "planning", label: "Planning", color: "bg-gray-500" },
  { id: "active", label: "Active", color: "bg-blue-500" },
  { id: "completed", label: "Completed", color: "bg-green-500" },
  { id: "archived", label: "Archived", color: "bg-slate-500" },
] as const;

export const PROJECT_STAGES = {
  manuscript: MANUSCRIPT_STAGES,
  grant: GRANT_STAGES,
  general: GENERAL_STAGES,
} as const;

export type ManuscriptStageId = (typeof MANUSCRIPT_STAGES)[number]["id"];
export type GrantStageId = (typeof GRANT_STAGES)[number]["id"];
export type GeneralStageId = (typeof GENERAL_STAGES)[number]["id"];

// Helper function to get stage config
export function getStageConfig(projectType: keyof typeof PROJECT_STAGES, stageId: string) {
  const stages = PROJECT_STAGES[projectType];
  return stages.find((s) => s.id === stageId);
}

// Helper function to get stage label
export function getStageLabel(projectType: keyof typeof PROJECT_STAGES, stageId: string) {
  const stage = getStageConfig(projectType, stageId);
  return stage?.label ?? stageId;
}

// Helper function to get stage color
export function getStageColor(projectType: keyof typeof PROJECT_STAGES, stageId: string) {
  const stage = getStageConfig(projectType, stageId);
  return stage?.color ?? "bg-gray-500";
}

// Helper to get next stage
export function getNextStage(projectType: keyof typeof PROJECT_STAGES, currentStage: string) {
  const stages = PROJECT_STAGES[projectType];
  const currentIndex = stages.findIndex((s) => s.id === currentStage);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    return null;
  }
  return stages[currentIndex + 1];
}

// Helper to get previous stage
export function getPreviousStage(projectType: keyof typeof PROJECT_STAGES, currentStage: string) {
  const stages = PROJECT_STAGES[projectType];
  const currentIndex = stages.findIndex((s) => s.id === currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return stages[currentIndex - 1];
}

// Project type configuration
export const PROJECT_TYPE_CONFIG = {
  manuscript: {
    label: "Manuscript",
    icon: "FileText",
    description: "Academic papers, journal articles, and research publications",
    defaultStage: "idea",
    color: "bg-blue-500",
  },
  grant: {
    label: "Grant",
    icon: "DollarSign",
    description: "Funding applications and grant proposals",
    defaultStage: "discovery",
    color: "bg-green-500",
  },
  general: {
    label: "General",
    icon: "Folder",
    description: "General projects and initiatives",
    defaultStage: "planning",
    color: "bg-purple-500",
  },
} as const;

// Project status configuration
export const PROJECT_STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  completed: {
    label: "Completed",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-100",
  },
  archived: {
    label: "Archived",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-100",
  },
} as const;

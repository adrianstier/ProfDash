"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Edit2,
  FileText,
  DollarSign,
  Folder,
  FlaskConical,
  Loader2,
  MoreHorizontal,
  Sparkles,
  Trash2,
  GitBranch,
  ListChecks,
  Users,
} from "lucide-react";
import { useAgentStore } from "@/lib/stores/agent-store";
import { PROJECT_TYPE_CONFIG, PROJECT_STATUS_CONFIG, parseLocalDate } from "@scholaros/shared";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
} from "@/lib/hooks/use-projects";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { ProjectStageProgress, ProjectStageSelect } from "@/components/projects/project-stage-badge";
import { MilestoneList } from "@/components/projects/milestone-list";
import { ProjectNotes } from "@/components/projects/project-notes";
import { LinkedTasks } from "@/components/projects/linked-tasks";
import { ProjectSummary } from "@/components/ai";
import { PhaseTimeline, WorkstreamTabs, ApplyTemplateModal } from "@/components/projects/hierarchy";
import { ResearchProjectDashboard } from "@/components/research";

type TabId = "overview" | "phases" | "workstreams" | "team" | "activity";

const typeIcons = {
  manuscript: FileText,
  grant: DollarSign,
  general: Folder,
  research: FlaskConical,
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { currentWorkspaceId } = useWorkspaceStore();

  const { data: project, isLoading, error } = useProject(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editSummary, setEditSummary] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-red-500">Project not found</p>
        <Link href="/projects" className="mt-4 text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const TypeIcon = typeIcons[project.type];
  const typeConfig = PROJECT_TYPE_CONFIG[project.type];
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateProject.mutateAsync({ id: projectId, title: editTitle });
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleSaveSummary = async () => {
    try {
      await updateProject.mutateAsync({ id: projectId, summary: editSummary || null });
      setIsEditingSummary(false);
    } catch (error) {
      console.error("Failed to update summary:", error);
    }
  };

  const handleStageChange = async (newStage: string) => {
    try {
      await updateProject.mutateAsync({ id: projectId, stage: newStage });
    } catch (error) {
      console.error("Failed to update stage:", error);
    }
  };

  const handleStatusChange = async (newStatus: "active" | "completed" | "archived") => {
    try {
      await updateProject.mutateAsync({ id: projectId, status: newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    try {
      await deleteProject.mutateAsync(projectId);
      router.push("/projects");
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/projects" className="mt-1 rounded p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${typeConfig.color} bg-opacity-10`}>
              <TypeIcon className={`h-6 w-6 ${typeConfig.color.replace("bg-", "text-")}`} />
            </div>

            <div className="space-y-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="rounded border bg-background px-2 py-1 text-xl font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="text-sm text-primary hover:underline"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h1
                  className="group flex items-center gap-2 text-2xl font-bold cursor-pointer"
                  onClick={() => {
                    setEditTitle(project.title);
                    setIsEditingTitle(true);
                  }}
                >
                  {project.title}
                  <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </h1>
              )}

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
                >
                  {statusConfig.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {typeConfig.label}
                </span>
                {project.due_date && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {parseLocalDate(project.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* AI Help Button */}
          <ProjectAgentButton project={project} />

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-2 hover:bg-muted"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

          {showMenu && (
            <>
              <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border bg-card p-1 shadow-lg">
                <button
                  onClick={() => {
                    handleStatusChange("active");
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  Mark as Active
                </button>
                <button
                  onClick={() => {
                    handleStatusChange("completed");
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  Mark as Completed
                </button>
                <button
                  onClick={() => {
                    handleStatusChange("archived");
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  Archive
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Research projects get their own specialized dashboard */}
      {project.type === "research" && currentWorkspaceId ? (
        <ResearchProjectDashboard
          projectId={projectId}
          workspaceId={currentWorkspaceId}
        />
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="border-b">
            <nav className="flex gap-1">
              {[
                { id: "overview" as TabId, label: "Overview", icon: FileText },
                { id: "phases" as TabId, label: "Phases", icon: ListChecks },
                { id: "workstreams" as TabId, label: "Workstreams", icon: GitBranch },
                { id: "team" as TabId, label: "Team", icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stage Progress */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Progress</h3>
              <ProjectStageSelect
                projectType={project.type}
                value={project.stage}
                onChange={handleStageChange}
              />
            </div>
            <ProjectStageProgress
              projectType={project.type}
              currentStage={project.stage}
              onStageClick={handleStageChange}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Summary</h3>
              {!isEditingSummary && (
                <button
                  onClick={() => {
                    setEditSummary(project.summary ?? "");
                    setIsEditingSummary(true);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingSummary ? (
              <div className="space-y-2">
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                  placeholder="Add a summary..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSummary}
                    className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingSummary(false)}
                    className="rounded px-3 py-1 text-sm hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {project.summary || "No summary yet. Click Edit to add one."}
              </p>
            )}
          </div>

          {/* AI Summary */}
          <ProjectSummary
            project={{
              id: project.id,
              title: project.title,
              type: project.type,
              status: project.status,
              stage: project.stage ?? undefined,
              summary: project.summary ?? undefined,
            }}
          />

          {/* Three-column layout for milestones, tasks, and notes */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Milestones */}
            <div className="rounded-lg border bg-card p-4">
              <MilestoneList projectId={projectId} />
            </div>

            {/* Linked Tasks */}
            <div className="rounded-lg border bg-card p-4">
              <LinkedTasks projectId={projectId} />
            </div>

            {/* Notes */}
            <div className="rounded-lg border bg-card p-4">
              <ProjectNotes projectId={projectId} />
            </div>
          </div>
        </div>
      )}

          {activeTab === "phases" && (
            <div className="rounded-lg border bg-card p-4">
              <PhaseTimeline
                projectId={projectId}
                onApplyTemplate={() => setShowTemplateModal(true)}
              />
            </div>
          )}

          {activeTab === "workstreams" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <WorkstreamTabs
                  projectId={projectId}
                  selectedId={selectedWorkstreamId}
                  onSelect={setSelectedWorkstreamId}
                />
              </div>
              <div className="rounded-lg border bg-card p-4">
                <LinkedTasks projectId={projectId} />
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="rounded-lg border bg-card p-4">
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-10 w-10 mb-3" />
                <p>Team roles and assignments coming soon.</p>
                <p className="text-sm mt-1">
                  Assign roles to phases in the Phases tab.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Template Modal */}
      {currentWorkspaceId && (
        <ApplyTemplateModal
          projectId={projectId}
          workspaceId={currentWorkspaceId}
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSuccess={() => setActiveTab("phases")}
        />
      )}
    </div>
  );
}

// Project Agent Button Component
interface ProjectAgentButtonProps {
  project: {
    id: string;
    title: string;
    type: string;
    status: string;
    stage?: string | null;
    summary?: string | null;
  };
}

function ProjectAgentButton({ project }: ProjectAgentButtonProps) {
  const { openChat, selectAgent, setContext } = useAgentStore();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleOpenProjectAgent = (initialMessage?: string) => {
    // Set project context for the agent
    setContext({
      projectId: project.id,
      projectTitle: project.title,
      projectType: project.type,
      projectStatus: project.status,
      projectStage: project.stage,
    });

    // Select the project agent
    selectAgent("project");

    // Open chat
    openChat(initialMessage);
    setShowQuickActions(false);
  };

  const quickActions = [
    {
      label: "Suggest next steps",
      icon: Sparkles,
      message: `What should I focus on next for my ${project.type} project "${project.title}"? Current stage: ${project.stage || "not set"}.`,
    },
    {
      label: "Generate milestones",
      icon: Calendar,
      message: `Help me create milestones for my ${project.type} project "${project.title}".`,
    },
    {
      label: "Draft summary",
      icon: FileText,
      message: `Help me write a compelling summary for my ${project.type} project "${project.title}".`,
    },
    {
      label: "Review progress",
      icon: Bot,
      message: `Review my progress on "${project.title}" and identify any potential blockers or risks.`,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowQuickActions(!showQuickActions)}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-purple-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
      >
        <Sparkles className="h-4 w-4" />
        AI Help
      </button>

      {showQuickActions && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowQuickActions(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-lg border bg-card p-2 shadow-lg">
            <div className="mb-2 px-2 py-1">
              <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
            </div>
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleOpenProjectAgent(action.message)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                {action.label}
              </button>
            ))}
            <hr className="my-2" />
            <button
              onClick={() => handleOpenProjectAgent()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-muted transition-colors"
            >
              <Bot className="h-4 w-4" />
              Open AI Chat
            </button>
          </div>
        </>
      )}
    </div>
  );
}

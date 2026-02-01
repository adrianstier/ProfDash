import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../utils/test-utils";
import { ProjectCard } from "@/components/projects/project-card";
import {
  ProjectStageBadge,
  ProjectStageSelect,
  ProjectStageProgress,
} from "@/components/projects/project-stage-badge";
import { MilestoneList } from "@/components/projects/milestone-list";
import type { ProjectFromAPI } from "@/lib/hooks/use-projects";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@scholaros/shared", () => ({
  PROJECT_TYPE_CONFIG: {
    manuscript: { color: "bg-blue-500", label: "Manuscript" },
    grant: { color: "bg-green-500", label: "Grant" },
    general: { color: "bg-gray-500", label: "General" },
    research: { color: "bg-purple-500", label: "Research" },
  },
  PROJECT_STATUS_CONFIG: {
    active: { label: "Active", bgColor: "bg-green-100", textColor: "text-green-700" },
    completed: { label: "Completed", bgColor: "bg-blue-100", textColor: "text-blue-700" },
    archived: { label: "Archived", bgColor: "bg-gray-100", textColor: "text-gray-700" },
    on_hold: { label: "On Hold", bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
  },
  getStageLabel: vi.fn((type: string, stage: string) => {
    const labels: Record<string, Record<string, string>> = {
      manuscript: {
        drafting: "Drafting",
        review: "In Review",
        revision: "Revision",
        submitted: "Submitted",
        accepted: "Accepted",
      },
      grant: {
        planning: "Planning",
        writing: "Writing",
        submitted: "Submitted",
        awarded: "Awarded",
      },
    };
    return labels[type]?.[stage] ?? stage;
  }),
  getStageColor: vi.fn(() => "bg-blue-500"),
  getStageConfig: vi.fn((type: string, stage: string) => ({
    id: stage,
    label: stage.charAt(0).toUpperCase() + stage.slice(1),
    color: "bg-blue-500",
  })),
  getNextStage: vi.fn((type: string, stage: string) => {
    if (stage === "drafting") return { id: "review", label: "In Review" };
    return null;
  }),
  getPreviousStage: vi.fn((type: string, stage: string) => {
    if (stage === "review") return { id: "drafting", label: "Drafting" };
    return null;
  }),
  PROJECT_STAGES: {
    manuscript: [
      { id: "drafting", label: "Drafting", color: "bg-blue-500" },
      { id: "review", label: "In Review", color: "bg-yellow-500" },
      { id: "revision", label: "Revision", color: "bg-orange-500" },
      { id: "submitted", label: "Submitted", color: "bg-green-500" },
    ],
    grant: [
      { id: "planning", label: "Planning", color: "bg-blue-500" },
      { id: "writing", label: "Writing", color: "bg-yellow-500" },
      { id: "submitted", label: "Submitted", color: "bg-green-500" },
    ],
  },
}));

// Mock milestone hooks
const mockCreateMilestone = {
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
};
const mockToggleMilestoneComplete = {
  mutate: vi.fn(),
};
const mockDeleteMilestone = {
  mutateAsync: vi.fn().mockResolvedValue({}),
};

vi.mock("@/lib/hooks/use-projects", () => ({
  useMilestones: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateMilestone: vi.fn(() => mockCreateMilestone),
  useToggleMilestoneComplete: vi.fn(() => mockToggleMilestoneComplete),
  useDeleteMilestone: vi.fn(() => mockDeleteMilestone),
}));

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockProject(
  overrides: Partial<ProjectFromAPI> = {}
): ProjectFromAPI {
  return {
    id: "project-1",
    title: "Climate Adaptation Paper",
    summary: "Research on climate adaptation strategies",
    type: "manuscript",
    status: "active",
    stage: "drafting",
    due_date: null,
    task_count: 0,
    completed_task_count: 0,
    workspace_id: "ws-1",
    user_id: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as ProjectFromAPI;
}

function createMockMilestone(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    project_id: "project-1",
    title: "Literature Review",
    description: null,
    sort_order: 0,
    completed_at: null,
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// ProjectCard Tests
// ============================================================================

describe("ProjectCard", () => {
  const defaultProject = createMockProject();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders project title as a link", () => {
      render(<ProjectCard project={defaultProject} />);
      const link = screen.getByRole("link", {
        name: /View project "Climate Adaptation Paper"/,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/projects/project-1");
    });

    it("renders project summary", () => {
      render(<ProjectCard project={defaultProject} />);
      expect(
        screen.getByText("Research on climate adaptation strategies")
      ).toBeInTheDocument();
    });

    it("does not render summary when absent", () => {
      const project = createMockProject({ summary: null });
      render(<ProjectCard project={project} />);
      expect(
        screen.queryByText("Research on climate adaptation strategies")
      ).not.toBeInTheDocument();
    });

    it("renders stage badge when stage is present", () => {
      render(<ProjectCard project={defaultProject} />);
      expect(screen.getByText("Drafting")).toBeInTheDocument();
    });

    it("renders status badge", () => {
      render(<ProjectCard project={defaultProject} />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders article with correct aria-label", () => {
      render(<ProjectCard project={defaultProject} />);
      expect(
        screen.getByRole("article", {
          name: "Project: Climate Adaptation Paper",
        })
      ).toBeInTheDocument();
    });
  });

  describe("due date", () => {
    it("renders due date when present", () => {
      const project = createMockProject({ due_date: "2025-06-15" });
      render(<ProjectCard project={project} />);
      // The component uses new Date(due_date).toLocaleDateString() which may
      // shift the date depending on timezone, so match the actual output
      const expectedText = new Date("2025-06-15").toLocaleDateString();
      const timeEl = screen.getByText(expectedText);
      expect(timeEl).toBeInTheDocument();
    });

    it("does not render due date when absent", () => {
      render(<ProjectCard project={defaultProject} />);
      expect(screen.queryByTagName?.("time")).toBeFalsy();
    });
  });

  describe("task progress", () => {
    it("renders task progress when tasks exist", () => {
      const project = createMockProject({
        task_count: 10,
        completed_task_count: 7,
      });
      render(<ProjectCard project={project} />);
      expect(screen.getByText("7/10 tasks")).toBeInTheDocument();
      expect(
        screen.getByRole("progressbar", { name: "Task progress: 70%" })
      ).toBeInTheDocument();
    });

    it("does not render progress when no tasks", () => {
      render(<ProjectCard project={defaultProject} />);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("renders edit button when onEdit is provided", () => {
      const onEdit = vi.fn();
      render(<ProjectCard project={defaultProject} onEdit={onEdit} />);
      const editBtn = screen.getByLabelText(
        'Edit project "Climate Adaptation Paper"'
      );
      expect(editBtn).toBeInTheDocument();
    });

    it("calls onEdit when edit button clicked", () => {
      const onEdit = vi.fn();
      render(<ProjectCard project={defaultProject} onEdit={onEdit} />);
      fireEvent.click(
        screen.getByLabelText('Edit project "Climate Adaptation Paper"')
      );
      expect(onEdit).toHaveBeenCalledWith(defaultProject);
    });

    it("renders delete button when onDelete is provided", () => {
      const onDelete = vi.fn();
      render(
        <ProjectCard project={defaultProject} onDelete={onDelete} />
      );
      const deleteBtn = screen.getByLabelText(
        'Delete project "Climate Adaptation Paper"'
      );
      expect(deleteBtn).toBeInTheDocument();
    });

    it("calls onDelete when delete button clicked", () => {
      const onDelete = vi.fn();
      render(
        <ProjectCard project={defaultProject} onDelete={onDelete} />
      );
      fireEvent.click(
        screen.getByLabelText('Delete project "Climate Adaptation Paper"')
      );
      expect(onDelete).toHaveBeenCalledWith(defaultProject);
    });

    it("does not render action buttons when no handlers provided", () => {
      render(<ProjectCard project={defaultProject} />);
      expect(
        screen.queryByLabelText(/Edit project/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Delete project/)
      ).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// ProjectStageBadge Tests
// ============================================================================

describe("ProjectStageBadge", () => {
  it('renders "No Stage" when stage is null', () => {
    render(<ProjectStageBadge projectType="manuscript" stage={null} />);
    expect(screen.getByText("No Stage")).toBeInTheDocument();
  });

  it('renders "No Stage" when stage is undefined', () => {
    render(<ProjectStageBadge projectType="manuscript" stage={undefined} />);
    expect(screen.getByText("No Stage")).toBeInTheDocument();
  });

  it("renders stage label", () => {
    render(
      <ProjectStageBadge projectType="manuscript" stage="drafting" />
    );
    expect(screen.getByText("Drafting")).toBeInTheDocument();
  });

  it("applies size classes correctly", () => {
    const { container } = render(
      <ProjectStageBadge
        projectType="manuscript"
        stage="drafting"
        size="lg"
      />
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("text-base");
  });

  describe("navigation", () => {
    it("shows navigation buttons when showNavigation is true", () => {
      const onChange = vi.fn();
      render(
        <ProjectStageBadge
          projectType="manuscript"
          stage="review"
          showNavigation
          onStageChange={onChange}
        />
      );
      // Should show prev button (from review -> drafting)
      expect(
        screen.getByTitle("Move to Drafting")
      ).toBeInTheDocument();
    });

    it("calls onStageChange when navigation clicked", () => {
      const onChange = vi.fn();
      render(
        <ProjectStageBadge
          projectType="manuscript"
          stage="review"
          showNavigation
          onStageChange={onChange}
        />
      );
      fireEvent.click(screen.getByTitle("Move to Drafting"));
      expect(onChange).toHaveBeenCalledWith("drafting");
    });

    it("does not show navigation by default", () => {
      render(
        <ProjectStageBadge projectType="manuscript" stage="drafting" />
      );
      expect(screen.queryByTitle(/Move to/)).not.toBeInTheDocument();
    });

    it("shows next stage button when available", () => {
      const onChange = vi.fn();
      render(
        <ProjectStageBadge
          projectType="manuscript"
          stage="drafting"
          showNavigation
          onStageChange={onChange}
        />
      );
      expect(
        screen.getByTitle("Move to In Review")
      ).toBeInTheDocument();
    });
  });
});

// ============================================================================
// ProjectStageSelect Tests
// ============================================================================

describe("ProjectStageSelect", () => {
  it("renders all stages as options", () => {
    const onChange = vi.fn();
    render(
      <ProjectStageSelect
        projectType="manuscript"
        value={null}
        onChange={onChange}
      />
    );
    expect(screen.getByText("Select stage...")).toBeInTheDocument();
    expect(screen.getByText("Drafting")).toBeInTheDocument();
    expect(screen.getByText("In Review")).toBeInTheDocument();
    expect(screen.getByText("Revision")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("calls onChange when a stage is selected", () => {
    const onChange = vi.fn();
    render(
      <ProjectStageSelect
        projectType="manuscript"
        value={null}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "review" },
    });
    expect(onChange).toHaveBeenCalledWith("review");
  });

  it("shows the current value as selected", () => {
    const onChange = vi.fn();
    render(
      <ProjectStageSelect
        projectType="manuscript"
        value="drafting"
        onChange={onChange}
      />
    );
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
      "drafting"
    );
  });
});

// ============================================================================
// ProjectStageProgress Tests
// ============================================================================

describe("ProjectStageProgress", () => {
  it("renders all stages as dots", () => {
    render(
      <ProjectStageProgress projectType="manuscript" currentStage="review" />
    );
    // 4 stages for manuscript
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(4);
  });

  it("calls onStageClick when a stage is clicked", () => {
    const onStageClick = vi.fn();
    render(
      <ProjectStageProgress
        projectType="manuscript"
        currentStage="drafting"
        onStageClick={onStageClick}
      />
    );
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // click third stage
    expect(onStageClick).toHaveBeenCalled();
  });
});

// ============================================================================
// MilestoneList Tests
// ============================================================================

describe("MilestoneList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", async () => {
    const { useMilestones } = await import("@/lib/hooks/use-projects");
    (useMilestones as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { container } = render(<MilestoneList projectId="project-1" />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state with add button", async () => {
    const { useMilestones } = await import("@/lib/hooks/use-projects");
    (useMilestones as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<MilestoneList projectId="project-1" />);
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(screen.getByText("Add milestone")).toBeInTheDocument();
  });

  it("renders milestones with progress", async () => {
    const { useMilestones } = await import("@/lib/hooks/use-projects");
    (useMilestones as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        createMockMilestone({
          id: "m1",
          title: "Literature Review",
          completed_at: new Date().toISOString(),
        }),
        createMockMilestone({ id: "m2", title: "Data Collection" }),
        createMockMilestone({ id: "m3", title: "Analysis" }),
      ],
      isLoading: false,
    });

    render(<MilestoneList projectId="project-1" />);
    expect(screen.getByText("Literature Review")).toBeInTheDocument();
    expect(screen.getByText("Data Collection")).toBeInTheDocument();
    expect(screen.getByText("Analysis")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("shows add form when Add milestone button clicked", async () => {
    const { useMilestones } = await import("@/lib/hooks/use-projects");
    (useMilestones as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<MilestoneList projectId="project-1" />);
    fireEvent.click(screen.getByText("Add milestone"));
    expect(
      screen.getByPlaceholderText("Milestone title...")
    ).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("hides add form on Cancel click", async () => {
    const { useMilestones } = await import("@/lib/hooks/use-projects");
    (useMilestones as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<MilestoneList projectId="project-1" />);
    fireEvent.click(screen.getByText("Add milestone"));
    expect(
      screen.getByPlaceholderText("Milestone title...")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(
      screen.queryByPlaceholderText("Milestone title...")
    ).not.toBeInTheDocument();
  });
});

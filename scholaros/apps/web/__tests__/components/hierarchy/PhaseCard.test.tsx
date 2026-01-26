import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../utils/test-utils";
import { PhaseCard } from "@/components/projects/hierarchy/PhaseCard";
import { createMockPhase, createMockDeliverable, createMockMutation } from "./mocks";

// Mock the hooks
const mockStartPhase = createMockMutation();
const mockCompletePhase = createMockMutation();
const mockDeletePhase = createMockMutation();

vi.mock("@/lib/hooks/use-project-hierarchy", () => ({
  useStartPhase: () => mockStartPhase,
  useCompletePhase: () => mockCompletePhase,
  useDeletePhase: () => mockDeletePhase,
  useDeliverables: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCreateDeliverable: () => createMockMutation(),
  useCompleteDeliverable: () => createMockMutation(),
  useDeleteDeliverable: () => createMockMutation(),
}));

describe("PhaseCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("status display", () => {
    it("renders pending status with correct label", () => {
      const phase = createMockPhase({ status: "pending", title: "Phase 1" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.getByText("Phase 1")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders in_progress status with correct label", () => {
      const phase = createMockPhase({ status: "in_progress", title: "Phase 2" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("renders blocked status with correct label", () => {
      const phase = createMockPhase({ status: "blocked", title: "Phase 3" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.getByText("Blocked")).toBeInTheDocument();
    });

    it("renders completed status with correct label", () => {
      const phase = createMockPhase({ status: "completed", title: "Phase 4" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  describe("assigned role", () => {
    it("displays assigned role when present", () => {
      const phase = createMockPhase({
        assigned_role: "Business Analyst",
        title: "Phase 1"
      });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.getByText("Assigned: Business Analyst")).toBeInTheDocument();
    });

    it("does not display assigned role when absent", () => {
      const phase = createMockPhase({
        assigned_role: null,
        title: "Phase 1"
      });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.queryByText(/Assigned:/)).not.toBeInTheDocument();
    });
  });

  describe("action buttons", () => {
    it("shows Start button for pending phase", () => {
      const phase = createMockPhase({ status: "pending" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    });

    it("shows Complete button for in_progress phase", () => {
      const phase = createMockPhase({ status: "in_progress" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    });

    it("does not show Start button for in_progress phase", () => {
      const phase = createMockPhase({ status: "in_progress" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    });

    it("does not show Complete button for pending phase", () => {
      const phase = createMockPhase({ status: "pending" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    });

    it("does not show action buttons for completed phase", () => {
      const phase = createMockPhase({ status: "completed" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    });
  });

  describe("blocking phases", () => {
    it("displays blocking phases message when blocked", () => {
      const blockingPhase = createMockPhase({
        id: "blocking-1",
        title: "Prerequisite Phase",
        status: "pending"
      });
      const phase = createMockPhase({
        status: "blocked",
        blocked_by: ["blocking-1"]
      });

      render(
        <PhaseCard
          projectId="project-1"
          phase={phase}
          blockingPhases={[blockingPhase]}
        />
      );

      expect(screen.getByText(/Waiting on: Prerequisite Phase/)).toBeInTheDocument();
    });

    it("does not display blocking message when not blocked", () => {
      const phase = createMockPhase({ status: "pending" });

      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.queryByText(/Waiting on:/)).not.toBeInTheDocument();
    });
  });

  describe("deliverables", () => {
    it("shows deliverable progress when deliverables exist", () => {
      const deliverables = [
        createMockDeliverable({ status: "completed" }),
        createMockDeliverable({ status: "pending" }),
      ];
      const phase = createMockPhase({
        deliverables,
        status: "in_progress"
      });

      render(<PhaseCard projectId="project-1" phase={phase} />);

      // Progress indicator shows 1/2
      expect(screen.getByText("1/2")).toBeInTheDocument();
    });

    it("does not show progress when no deliverables", () => {
      const phase = createMockPhase({
        deliverables: [],
        status: "pending"
      });

      render(<PhaseCard projectId="project-1" phase={phase} />);

      expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("expands in_progress phases by default", () => {
      const phase = createMockPhase({
        status: "in_progress",
        description: "Phase description here"
      });

      render(<PhaseCard projectId="project-1" phase={phase} />);

      // Description should be visible when expanded
      expect(screen.getByText("Phase description here")).toBeInTheDocument();
    });

    it("does not expand pending phases by default", () => {
      const phase = createMockPhase({
        status: "pending",
        description: "Phase description here"
      });

      render(<PhaseCard projectId="project-1" phase={phase} />);

      // Description should not be visible when collapsed
      expect(screen.queryByText("Phase description here")).not.toBeInTheDocument();
    });

    it("toggles expansion on header click", () => {
      const phase = createMockPhase({
        status: "pending",
        title: "Expandable Phase",
        description: "Phase description here"
      });

      render(<PhaseCard projectId="project-1" phase={phase} />);

      // Initially collapsed
      expect(screen.queryByText("Phase description here")).not.toBeInTheDocument();

      // Click to expand
      const header = screen.getByText("Expandable Phase").closest("[class*='cursor-pointer']");
      if (header) fireEvent.click(header);

      // Now expanded
      expect(screen.getByText("Phase description here")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls startPhase mutation when Start button clicked", async () => {
      const phase = createMockPhase({ id: "phase-1", status: "pending" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      const startButton = screen.getByRole("button", { name: "Start" });
      fireEvent.click(startButton);

      expect(mockStartPhase.mutateAsync).toHaveBeenCalledWith({
        projectId: "project-1",
        phaseId: "phase-1",
      });
    });

    it("calls completePhase mutation when Complete button clicked", async () => {
      const phase = createMockPhase({ id: "phase-2", status: "in_progress" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      const completeButton = screen.getByRole("button", { name: "Complete" });
      fireEvent.click(completeButton);

      expect(mockCompletePhase.mutateAsync).toHaveBeenCalledWith({
        projectId: "project-1",
        phaseId: "phase-2",
      });
    });
  });

  describe("menu", () => {
    it("shows menu button", () => {
      const phase = createMockPhase({ status: "pending" });
      render(<PhaseCard projectId="project-1" phase={phase} />);

      // Menu button should be present (MoreHorizontal icon)
      const menuButtons = screen.getAllByRole("button");
      expect(menuButtons.length).toBeGreaterThan(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../utils/test-utils";
import { PhaseTimeline } from "@/components/projects/hierarchy/PhaseTimeline";
import {
  createMockPhase,
  createMockDeliverable,
  createMockQueryResult,
  createMockMutation,
} from "./mocks";
import type { PhaseWithDetails } from "@/lib/hooks/use-project-hierarchy";

// Mock data
let mockPhasesData: PhaseWithDetails[] = [];
let mockIsLoading = false;
let mockError: Error | null = null;
const mockCreatePhase = createMockMutation();

vi.mock("@/lib/hooks/use-project-hierarchy", () => ({
  usePhases: () => ({
    data: mockPhasesData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useCreatePhase: () => mockCreatePhase,
  useStartPhase: () => createMockMutation(),
  useCompletePhase: () => createMockMutation(),
  useDeletePhase: () => createMockMutation(),
  useDeliverables: () => ({ data: [], isLoading: false }),
  useCreateDeliverable: () => createMockMutation(),
  useCompleteDeliverable: () => createMockMutation(),
  useDeleteDeliverable: () => createMockMutation(),
}));

describe("PhaseTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPhasesData = [];
    mockIsLoading = false;
    mockError = null;
  });

  describe("loading state", () => {
    it("shows loading spinner when loading", () => {
      mockIsLoading = true;
      render(<PhaseTimeline projectId="project-1" />);

      // Look for the loading spinner (Loader2 animation)
      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message when error occurs", () => {
      mockError = new Error("Failed to fetch phases");
      render(<PhaseTimeline projectId="project-1" />);

      expect(screen.getByText(/Failed to load phases/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch phases/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no phases", () => {
      mockPhasesData = [];
      render(<PhaseTimeline projectId="project-1" />);

      expect(screen.getByText("No phases yet")).toBeInTheDocument();
      expect(
        screen.getByText(/Add phases to structure your project/)
      ).toBeInTheDocument();
    });

    it("shows Add Phase button in empty state", () => {
      mockPhasesData = [];
      render(<PhaseTimeline projectId="project-1" />);

      expect(screen.getByRole("button", { name: /Add Phase/i })).toBeInTheDocument();
    });

    it("shows Apply Template button in empty state when callback provided", () => {
      mockPhasesData = [];
      const onApplyTemplate = vi.fn();
      render(
        <PhaseTimeline projectId="project-1" onApplyTemplate={onApplyTemplate} />
      );

      const applyButtons = screen.getAllByRole("button", { name: /Apply Template/i });
      expect(applyButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("calls onApplyTemplate when Apply Template button clicked", () => {
      mockPhasesData = [];
      const onApplyTemplate = vi.fn();
      render(
        <PhaseTimeline projectId="project-1" onApplyTemplate={onApplyTemplate} />
      );

      const applyButton = screen.getAllByRole("button", { name: /Apply Template/i })[0];
      fireEvent.click(applyButton);

      expect(onApplyTemplate).toHaveBeenCalled();
    });
  });

  describe("phases list", () => {
    it("renders all phases", () => {
      mockPhasesData = [
        createMockPhase({ title: "Phase 1: Business Clarity" }),
        createMockPhase({ title: "Phase 2: Product Shape" }),
        createMockPhase({ title: "Phase 3: UX Design" }),
      ];
      render(<PhaseTimeline projectId="project-1" />);

      expect(screen.getByText("Phase 1: Business Clarity")).toBeInTheDocument();
      expect(screen.getByText("Phase 2: Product Shape")).toBeInTheDocument();
      expect(screen.getByText("Phase 3: UX Design")).toBeInTheDocument();
    });

    it("shows correct progress count", () => {
      mockPhasesData = [
        createMockPhase({ status: "completed" }),
        createMockPhase({ status: "in_progress" }),
        createMockPhase({ status: "pending" }),
      ];
      render(<PhaseTimeline projectId="project-1" />);

      expect(screen.getByText("1/3 complete")).toBeInTheDocument();
    });

    it("shows progress percentage bar", () => {
      mockPhasesData = [
        createMockPhase({ status: "completed" }),
        createMockPhase({ status: "pending" }),
      ];
      render(<PhaseTimeline projectId="project-1" />);

      // 50% progress
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("shows 0% when no phases completed", () => {
      mockPhasesData = [
        createMockPhase({ status: "pending" }),
        createMockPhase({ status: "pending" }),
      ];
      render(<PhaseTimeline projectId="project-1" />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("shows 100% when all phases completed", () => {
      mockPhasesData = [
        createMockPhase({ status: "completed" }),
        createMockPhase({ status: "completed" }),
      ];
      render(<PhaseTimeline projectId="project-1" />);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("adding new phase", () => {
    it("shows Add Phase button at bottom when phases exist", () => {
      mockPhasesData = [createMockPhase({ title: "Phase 1" })];
      render(<PhaseTimeline projectId="project-1" />);

      // There should be an "Add Phase" button at the bottom
      const addButtons = screen.getAllByRole("button", { name: /Add Phase/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it("shows input form when Add Phase button clicked", () => {
      mockPhasesData = [createMockPhase({ title: "Phase 1" })];
      render(<PhaseTimeline projectId="project-1" />);

      const addButton = screen.getAllByRole("button", { name: /Add Phase/i })[0];
      fireEvent.click(addButton);

      expect(screen.getByPlaceholderText("Phase title...")).toBeInTheDocument();
    });

    it("submits new phase on Enter key", () => {
      mockPhasesData = [createMockPhase({ id: "phase-1", title: "Phase 1" })];
      render(<PhaseTimeline projectId="project-1" />);

      // Click Add Phase to show input
      const addButton = screen.getAllByRole("button", { name: /Add Phase/i })[0];
      fireEvent.click(addButton);

      // Type in the input
      const input = screen.getByPlaceholderText("Phase title...");
      fireEvent.change(input, { target: { value: "New Phase" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockCreatePhase.mutateAsync).toHaveBeenCalledWith({
        projectId: "project-1",
        title: "New Phase",
        blocked_by: ["phase-1"], // Should be blocked by the last phase
      });
    });

    it("cancels adding phase on Escape key", () => {
      mockPhasesData = [createMockPhase({ title: "Phase 1" })];
      render(<PhaseTimeline projectId="project-1" />);

      // Click Add Phase to show input
      const addButton = screen.getAllByRole("button", { name: /Add Phase/i })[0];
      fireEvent.click(addButton);

      // Type in the input then press Escape
      const input = screen.getByPlaceholderText("Phase title...");
      fireEvent.change(input, { target: { value: "New Phase" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Input should be gone
      expect(screen.queryByPlaceholderText("Phase title...")).not.toBeInTheDocument();
    });

    it("cancels adding phase when Cancel button clicked", () => {
      mockPhasesData = [createMockPhase({ title: "Phase 1" })];
      render(<PhaseTimeline projectId="project-1" />);

      // Click Add Phase to show input
      const addButton = screen.getAllByRole("button", { name: /Add Phase/i })[0];
      fireEvent.click(addButton);

      // Click Cancel
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      // Input should be gone
      expect(screen.queryByPlaceholderText("Phase title...")).not.toBeInTheDocument();
    });

    it("does not submit empty phase title", () => {
      mockPhasesData = [createMockPhase({ title: "Phase 1" })];
      render(<PhaseTimeline projectId="project-1" />);

      // Click Add Phase to show input
      const addButton = screen.getAllByRole("button", { name: /Add Phase/i })[0];
      fireEvent.click(addButton);

      // Click Add without typing anything
      const submitButton = screen.getByRole("button", { name: "Add" });
      fireEvent.click(submitButton);

      expect(mockCreatePhase.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("blocking logic", () => {
    it("passes blocking phases to PhaseCard correctly", () => {
      const phase1 = createMockPhase({
        id: "phase-1",
        title: "Phase 1",
        status: "pending",
      });
      const phase2 = createMockPhase({
        id: "phase-2",
        title: "Phase 2",
        status: "blocked",
        blocked_by: ["phase-1"],
      });
      mockPhasesData = [phase1, phase2];

      render(<PhaseTimeline projectId="project-1" />);

      // Phase 2 should show blocking message
      expect(screen.getByText(/Waiting on: Phase 1/)).toBeInTheDocument();
    });

    it("does not show blocking message when blocker is completed", () => {
      const phase1 = createMockPhase({
        id: "phase-1",
        title: "Phase 1",
        status: "completed",
      });
      const phase2 = createMockPhase({
        id: "phase-2",
        title: "Phase 2",
        status: "pending",
        blocked_by: ["phase-1"],
      });
      mockPhasesData = [phase1, phase2];

      render(<PhaseTimeline projectId="project-1" />);

      // Phase 2 should NOT show blocking message since Phase 1 is complete
      expect(screen.queryByText(/Waiting on:/)).not.toBeInTheDocument();
    });
  });

  describe("header controls", () => {
    it("does not show Apply Template button in header when phases exist", () => {
      mockPhasesData = [createMockPhase({ title: "Phase 1" })];
      const onApplyTemplate = vi.fn();
      render(
        <PhaseTimeline projectId="project-1" onApplyTemplate={onApplyTemplate} />
      );

      // The header Apply Template button should only appear when no phases
      // Check that buttons in header area (flex items-center justify-between) don't include Apply Template
      const headerButtons = screen
        .getByText("Phases")
        .closest("div")
        ?.querySelectorAll("button");

      // Apply Template should not be in header when phases exist
      const applyTemplateButtons = screen.queryAllByRole("button", { name: /Apply Template/i });
      expect(applyTemplateButtons.length).toBe(0);
    });
  });
});

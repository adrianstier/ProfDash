import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../utils/test-utils";
import { WorkstreamTabs } from "@/components/projects/hierarchy/WorkstreamTabs";
import { createMockWorkstream, createMockMutation } from "./mocks";
import type { WorkstreamWithStats } from "@/lib/hooks/use-project-hierarchy";

// Mock data
let mockWorkstreamsData: WorkstreamWithStats[] = [];
let mockIsLoading = false;
const mockCreateWorkstream = createMockMutation();
const mockDeleteWorkstream = createMockMutation();

vi.mock("@/lib/hooks/use-project-hierarchy", () => ({
  useWorkstreams: () => ({
    data: mockWorkstreamsData,
    isLoading: mockIsLoading,
  }),
  useCreateWorkstream: () => mockCreateWorkstream,
  useUpdateWorkstream: () => createMockMutation(),
  useDeleteWorkstream: () => mockDeleteWorkstream,
}));

describe("WorkstreamTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkstreamsData = [];
    mockIsLoading = false;
  });

  describe("loading state", () => {
    it("shows loading indicator when loading", () => {
      mockIsLoading = true;
      render(<WorkstreamTabs projectId="project-1" />);

      expect(screen.getByText("Loading workstreams...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no workstreams", () => {
      mockWorkstreamsData = [];
      render(<WorkstreamTabs projectId="project-1" />);

      expect(
        screen.getByText(/No workstreams yet/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Create workstreams to organize parallel work tracks/i)
      ).toBeInTheDocument();
    });

    it("shows add workstream link in empty state", () => {
      mockWorkstreamsData = [];
      render(<WorkstreamTabs projectId="project-1" />);

      expect(screen.getByText(/Add workstream/i)).toBeInTheDocument();
    });

    it("shows input form when add link clicked in empty state", () => {
      mockWorkstreamsData = [];
      render(<WorkstreamTabs projectId="project-1" />);

      const addLink = screen.getByText(/Add workstream/i);
      fireEvent.click(addLink);

      expect(screen.getByPlaceholderText("Name...")).toBeInTheDocument();
    });
  });

  describe("workstream tabs", () => {
    it("renders All tab when workstreams exist", () => {
      mockWorkstreamsData = [createMockWorkstream({ title: "Mote" })];
      render(<WorkstreamTabs projectId="project-1" />);

      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    });

    it("renders all workstream tabs", () => {
      mockWorkstreamsData = [
        createMockWorkstream({ title: "Mote", color: "bg-blue-500" }),
        createMockWorkstream({ title: "FUNDMAR", color: "bg-green-500" }),
      ];
      render(<WorkstreamTabs projectId="project-1" />);

      expect(screen.getByText("Mote")).toBeInTheDocument();
      expect(screen.getByText("FUNDMAR")).toBeInTheDocument();
    });

    it("shows task count for workstreams", () => {
      mockWorkstreamsData = [
        createMockWorkstream({
          title: "Mote",
          task_count: 12,
        }),
      ];
      render(<WorkstreamTabs projectId="project-1" />);

      expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("shows overdue count when present", () => {
      mockWorkstreamsData = [
        createMockWorkstream({
          title: "Mote",
          task_count: 12,
          overdue_task_count: 3,
        }),
      ];
      render(<WorkstreamTabs projectId="project-1" />);

      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  describe("tab selection", () => {
    it("highlights All tab when no selection", () => {
      mockWorkstreamsData = [createMockWorkstream({ title: "Mote" })];
      render(<WorkstreamTabs projectId="project-1" />);

      const allTab = screen.getByRole("button", { name: "All" });
      expect(allTab).toHaveClass("border-primary");
    });

    it("highlights selected workstream tab", () => {
      const workstream = createMockWorkstream({ id: "ws-1", title: "Mote" });
      mockWorkstreamsData = [workstream];

      render(
        <WorkstreamTabs
          projectId="project-1"
          selectedId="ws-1"
        />
      );

      // The workstream tab should have the selected class
      const moteTab = screen.getByText("Mote").closest("[class*='border-primary']");
      expect(moteTab).toBeInTheDocument();
    });

    it("calls onSelect with workstream id when tab clicked", () => {
      const workstream = createMockWorkstream({ id: "ws-1", title: "Mote" });
      mockWorkstreamsData = [workstream];
      const onSelect = vi.fn();

      render(
        <WorkstreamTabs
          projectId="project-1"
          onSelect={onSelect}
        />
      );

      const moteTab = screen.getByText("Mote").closest("[class*='rounded-lg']");
      if (moteTab) fireEvent.click(moteTab);

      expect(onSelect).toHaveBeenCalledWith("ws-1");
    });

    it("calls onSelect with null when All tab clicked", () => {
      mockWorkstreamsData = [createMockWorkstream({ title: "Mote" })];
      const onSelect = vi.fn();

      render(
        <WorkstreamTabs
          projectId="project-1"
          selectedId="ws-1"
          onSelect={onSelect}
        />
      );

      const allTab = screen.getByRole("button", { name: "All" });
      fireEvent.click(allTab);

      expect(onSelect).toHaveBeenCalledWith(null);
    });
  });

  describe("adding workstream", () => {
    it("shows add button when workstreams exist", () => {
      mockWorkstreamsData = [createMockWorkstream({ title: "Mote" })];
      render(<WorkstreamTabs projectId="project-1" />);

      // There should be a + button
      const addButtons = document.querySelectorAll('[class*="border-dashed"]');
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it("shows input form when add button clicked", () => {
      mockWorkstreamsData = [createMockWorkstream({ title: "Mote" })];
      render(<WorkstreamTabs projectId="project-1" />);

      // Click the + button
      const addButton = document.querySelector('[class*="border-dashed"]');
      if (addButton) fireEvent.click(addButton);

      expect(screen.getByPlaceholderText("Name...")).toBeInTheDocument();
    });

    it("creates workstream on form submit", () => {
      mockWorkstreamsData = [
        createMockWorkstream({ color: "bg-blue-500" }),
      ];
      render(<WorkstreamTabs projectId="project-1" />);

      // Click the + button
      const addButton = document.querySelector('[class*="border-dashed"]');
      if (addButton) fireEvent.click(addButton);

      // Type name and click Add
      const input = screen.getByPlaceholderText("Name...");
      fireEvent.change(input, { target: { value: "New Workstream" } });

      const submitButton = screen.getByRole("button", { name: "Add" });
      fireEvent.click(submitButton);

      expect(mockCreateWorkstream.mutateAsync).toHaveBeenCalledWith({
        projectId: "project-1",
        title: "New Workstream",
        color: expect.any(String),
      });
    });

    it("creates workstream on Enter key", () => {
      mockWorkstreamsData = [];
      render(<WorkstreamTabs projectId="project-1" />);

      // Click add link
      const addLink = screen.getByText(/Add workstream/i);
      fireEvent.click(addLink);

      // Type name and press Enter
      const input = screen.getByPlaceholderText("Name...");
      fireEvent.change(input, { target: { value: "New Workstream" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockCreateWorkstream.mutateAsync).toHaveBeenCalledWith({
        projectId: "project-1",
        title: "New Workstream",
        color: expect.any(String),
      });
    });

    it("cancels adding on Escape key", () => {
      mockWorkstreamsData = [createMockWorkstream({ title: "Mote" })];
      render(<WorkstreamTabs projectId="project-1" />);

      // Click the + button
      const addButton = document.querySelector('[class*="border-dashed"]');
      if (addButton) fireEvent.click(addButton);

      // Type name and press Escape
      const input = screen.getByPlaceholderText("Name...");
      fireEvent.change(input, { target: { value: "New Workstream" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByPlaceholderText("Name...")).not.toBeInTheDocument();
    });

    it("does not create workstream with empty name", () => {
      mockWorkstreamsData = [createMockWorkstream({ title: "Mote" })];
      render(<WorkstreamTabs projectId="project-1" />);

      // Click the + button
      const addButton = document.querySelector('[class*="border-dashed"]');
      if (addButton) fireEvent.click(addButton);

      // Click Add without typing
      const submitButton = screen.getByRole("button", { name: "Add" });
      fireEvent.click(submitButton);

      expect(mockCreateWorkstream.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("color assignment", () => {
    it("assigns unused color to new workstream", () => {
      mockWorkstreamsData = [
        createMockWorkstream({ color: "bg-blue-500" }),
        createMockWorkstream({ color: "bg-green-500" }),
      ];
      render(<WorkstreamTabs projectId="project-1" />);

      // Click the + button
      const addButton = document.querySelector('[class*="border-dashed"]');
      if (addButton) fireEvent.click(addButton);

      // Type name and submit
      const input = screen.getByPlaceholderText("Name...");
      fireEvent.change(input, { target: { value: "New Workstream" } });

      const submitButton = screen.getByRole("button", { name: "Add" });
      fireEvent.click(submitButton);

      // Should assign a color that's not bg-blue-500 or bg-green-500
      expect(mockCreateWorkstream.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          color: expect.not.stringMatching(/bg-blue-500|bg-green-500/),
        })
      );
    });
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils/test-utils";
import { DeliverableProgress } from "@/components/projects/hierarchy/DeliverableList";
import type { DeliverableWithRelations } from "@/lib/hooks/use-project-hierarchy";

// Mock data factory
function createDeliverable(overrides: Partial<DeliverableWithRelations> = {}): DeliverableWithRelations {
  return {
    id: crypto.randomUUID(),
    phase_id: "phase-1",
    project_id: "project-1",
    workstream_id: null,
    title: "Test Deliverable",
    description: null,
    artifact_type: "document",
    file_path: null,
    sort_order: 0,
    status: "pending",
    completed_at: null,
    due_date: null,
    document_id: null,
    url: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    workstream: null,
    document: null,
    ...overrides,
  };
}

describe("DeliverableProgress", () => {
  describe("rendering", () => {
    it("renders with no deliverables showing 0/0", () => {
      render(<DeliverableProgress deliverables={[]} />);
      expect(screen.getByText("0/0")).toBeInTheDocument();
    });

    it("renders correct count for all pending deliverables", () => {
      const deliverables = [
        createDeliverable({ status: "pending" }),
        createDeliverable({ status: "pending" }),
        createDeliverable({ status: "in_progress" }),
      ];
      render(<DeliverableProgress deliverables={deliverables} />);
      expect(screen.getByText("0/3")).toBeInTheDocument();
    });

    it("renders correct count with some completed deliverables", () => {
      const deliverables = [
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "pending" }),
      ];
      render(<DeliverableProgress deliverables={deliverables} />);
      expect(screen.getByText("2/3")).toBeInTheDocument();
    });

    it("renders correct count when all deliverables are completed", () => {
      const deliverables = [
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "completed" }),
      ];
      render(<DeliverableProgress deliverables={deliverables} />);
      expect(screen.getByText("3/3")).toBeInTheDocument();
    });
  });

  describe("progress bar", () => {
    it("renders progress bar with 0% width when no deliverables completed", () => {
      const deliverables = [
        createDeliverable({ status: "pending" }),
        createDeliverable({ status: "pending" }),
      ];
      const { container } = render(<DeliverableProgress deliverables={deliverables} />);
      const progressFill = container.querySelector('[style*="width: 0%"]');
      expect(progressFill).toBeInTheDocument();
    });

    it("renders progress bar with 50% width when half completed", () => {
      const deliverables = [
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "pending" }),
      ];
      const { container } = render(<DeliverableProgress deliverables={deliverables} />);
      const progressFill = container.querySelector('[style*="width: 50%"]');
      expect(progressFill).toBeInTheDocument();
    });

    it("renders progress bar with 100% width when all completed", () => {
      const deliverables = [
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "completed" }),
      ];
      const { container } = render(<DeliverableProgress deliverables={deliverables} />);
      const progressFill = container.querySelector('[style*="width: 100%"]');
      expect(progressFill).toBeInTheDocument();
    });

    it("renders correct percentage for 1 of 4 completed (25%)", () => {
      const deliverables = [
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "pending" }),
        createDeliverable({ status: "pending" }),
        createDeliverable({ status: "pending" }),
      ];
      const { container } = render(<DeliverableProgress deliverables={deliverables} />);
      const progressFill = container.querySelector('[style*="width: 25%"]');
      expect(progressFill).toBeInTheDocument();
      expect(screen.getByText("1/4")).toBeInTheDocument();
    });

    it("renders correct percentage for 3 of 4 completed (75%)", () => {
      const deliverables = [
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "completed" }),
        createDeliverable({ status: "pending" }),
      ];
      const { container } = render(<DeliverableProgress deliverables={deliverables} />);
      const progressFill = container.querySelector('[style*="width: 75%"]');
      expect(progressFill).toBeInTheDocument();
      expect(screen.getByText("3/4")).toBeInTheDocument();
    });
  });
});

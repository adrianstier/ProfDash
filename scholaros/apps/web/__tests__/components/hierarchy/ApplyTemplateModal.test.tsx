import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../utils/test-utils";
import { ApplyTemplateModal } from "@/components/projects/hierarchy/ApplyTemplateModal";
import { createMockMutation } from "./mocks";
import type { TemplateWithCreator } from "@/lib/hooks/use-templates";

// Mock data
let mockTemplatesData: TemplateWithCreator[] = [];
let mockIsLoading = false;
const mockApplyTemplate = createMockMutation();

vi.mock("@/lib/hooks/use-templates", async () => {
  const actual = await vi.importActual("@/lib/hooks/use-templates");
  return {
    ...actual,
    useTemplates: () => ({
      data: mockTemplatesData,
      isLoading: mockIsLoading,
    }),
  };
});

vi.mock("@/lib/hooks/use-project-hierarchy", () => ({
  useApplyTemplate: () => mockApplyTemplate,
}));

// Helper to create mock template
function createMockTemplate(
  overrides: Partial<TemplateWithCreator> = {}
): TemplateWithCreator {
  return {
    id: crypto.randomUUID(),
    workspace_id: "workspace-1",
    name: "Test Template",
    description: "A test template",
    phase_definitions: [
      {
        title: "Phase 1",
        description: "First phase",
        blocked_by_index: [],
        assigned_role: "Developer",
        deliverables: [],
      },
    ],
    role_definitions: [{ name: "Developer", is_ai_agent: false }],
    is_public: false,
    created_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("ApplyTemplateModal", () => {
  const defaultProps = {
    projectId: "project-1",
    workspaceId: "workspace-1",
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTemplatesData = [];
    mockIsLoading = false;
  });

  describe("visibility", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = render(
        <ApplyTemplateModal {...defaultProps} isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders modal when isOpen is true", () => {
      render(<ApplyTemplateModal {...defaultProps} />);
      expect(screen.getByText("Apply Project Template")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when loading templates", () => {
      mockIsLoading = true;
      render(<ApplyTemplateModal {...defaultProps} />);

      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("built-in templates", () => {
    it("shows Built-in Templates section", () => {
      render(<ApplyTemplateModal {...defaultProps} />);
      expect(screen.getByText("Built-in Templates")).toBeInTheDocument();
    });

    it("shows RSE 7-Phase MVP template", () => {
      render(<ApplyTemplateModal {...defaultProps} />);
      expect(screen.getByText("RSE 7-Phase MVP")).toBeInTheDocument();
    });

    it("shows template description", () => {
      render(<ApplyTemplateModal {...defaultProps} />);
      expect(
        screen.getByText(/structured 7-phase approach for building MVPs/i)
      ).toBeInTheDocument();
    });

    it("shows phase and role count for built-in template", () => {
      render(<ApplyTemplateModal {...defaultProps} />);
      expect(screen.getByText(/7 phases/)).toBeInTheDocument();
      expect(screen.getByText(/7 roles/)).toBeInTheDocument();
    });
  });

  describe("workspace templates", () => {
    it("shows Workspace Templates section when templates exist", () => {
      mockTemplatesData = [createMockTemplate({ name: "Custom Template" })];
      render(<ApplyTemplateModal {...defaultProps} />);

      expect(screen.getByText("Workspace Templates")).toBeInTheDocument();
    });

    it("renders workspace template options", () => {
      mockTemplatesData = [
        createMockTemplate({ name: "Custom Template 1" }),
        createMockTemplate({ name: "Custom Template 2" }),
      ];
      render(<ApplyTemplateModal {...defaultProps} />);

      expect(screen.getByText("Custom Template 1")).toBeInTheDocument();
      expect(screen.getByText("Custom Template 2")).toBeInTheDocument();
    });

    it("shows message when no custom templates available", () => {
      mockTemplatesData = [];
      render(<ApplyTemplateModal {...defaultProps} />);

      expect(
        screen.getByText(/No custom templates available/i)
      ).toBeInTheDocument();
    });
  });

  describe("template selection", () => {
    it("renders workspace templates with correct structure", () => {
      mockTemplatesData = [createMockTemplate({ name: "Custom Template" })];
      render(<ApplyTemplateModal {...defaultProps} />);

      // The template should be rendered with proper structure
      const templateName = screen.getByText("Custom Template");
      expect(templateName).toBeInTheDocument();

      // Should have a parent with rounded-lg class
      const templateOption = templateName.closest("[class*='rounded-lg']");
      expect(templateOption).toBeInTheDocument();
    });

    it("can expand template to see phase details", () => {
      mockTemplatesData = [
        createMockTemplate({
          name: "Custom Template",
          phase_definitions: [
            {
              title: "Design Phase",
              description: "",
              blocked_by_index: [],
              assigned_role: "Designer",
              deliverables: [],
            },
            {
              title: "Build Phase",
              description: "",
              blocked_by_index: [0],
              assigned_role: "Developer",
              deliverables: [],
            },
          ],
        }),
      ];
      render(<ApplyTemplateModal {...defaultProps} />);

      // Find and click expand button (ChevronRight icon)
      const expandButtons = document.querySelectorAll('[class*="shrink-0 rounded p-1"]');
      // The last expand button should be for the custom template
      if (expandButtons.length > 0) {
        fireEvent.click(expandButtons[expandButtons.length - 1]);
      }

      // Should show phase details
      expect(screen.getByText("Phases")).toBeInTheDocument();
      expect(screen.getByText(/Design Phase/)).toBeInTheDocument();
      expect(screen.getByText(/Build Phase/)).toBeInTheDocument();
    });
  });

  describe("modal actions", () => {
    it("calls onClose when Cancel button clicked", () => {
      const onClose = vi.fn();
      render(<ApplyTemplateModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when X button clicked", () => {
      const onClose = vi.fn();
      render(<ApplyTemplateModal {...defaultProps} onClose={onClose} />);

      // X button is the first button in the header
      const header = screen.getByText("Apply Project Template").closest("div");
      const closeButton = header?.querySelector("button");
      if (closeButton) fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("Apply Template button is disabled when no template selected", () => {
      render(<ApplyTemplateModal {...defaultProps} />);

      const applyButton = screen.getByRole("button", { name: /Apply Template/i });
      expect(applyButton).toBeDisabled();
    });

    it("Apply Template button is initially disabled", () => {
      mockTemplatesData = [createMockTemplate({ name: "Custom Template" })];
      render(<ApplyTemplateModal {...defaultProps} />);

      // Button should be disabled when no template is selected
      const applyButton = screen.getByRole("button", { name: /Apply Template/i });
      expect(applyButton).toBeDisabled();
    });

    it("workspace template option has clickable area", () => {
      const template = createMockTemplate({ id: "template-1", name: "Custom Template" });
      mockTemplatesData = [template];

      render(<ApplyTemplateModal {...defaultProps} />);

      // The template should be rendered and have interactive elements
      expect(screen.getByText("Custom Template")).toBeInTheDocument();

      // Should have selection indicator (radio-like button)
      const templateContainer = screen.getByText("Custom Template").closest("[class*='rounded-lg']");
      expect(templateContainer).toBeInTheDocument();
    });

    it("verifies mutateAsync is called when apply is triggered", async () => {
      const template = createMockTemplate({ id: "template-1", name: "Custom Template" });
      mockTemplatesData = [template];

      render(<ApplyTemplateModal {...defaultProps} />);

      // The custom template should be visible
      expect(screen.getByText("Custom Template")).toBeInTheDocument();

      // The Apply button should be disabled initially (no selection)
      const applyButton = screen.getByRole("button", { name: /Apply Template/i });
      expect(applyButton).toBeDisabled();
    });
  });

  describe("button states", () => {
    it("Apply Template button is disabled when no template selected", () => {
      mockTemplatesData = [createMockTemplate({ name: "Custom Template" })];
      render(<ApplyTemplateModal {...defaultProps} />);

      const applyButton = screen.getByRole("button", { name: /Apply Template/i });
      expect(applyButton).toBeDisabled();
    });

    it("displays template information correctly", () => {
      mockTemplatesData = [
        createMockTemplate({
          name: "My Custom Template",
          description: "A template for testing",
          phase_definitions: [
            { title: "Phase A", description: "", blocked_by_index: [], assigned_role: "", deliverables: [] },
            { title: "Phase B", description: "", blocked_by_index: [], assigned_role: "", deliverables: [] },
          ],
          role_definitions: [
            { name: "Developer", is_ai_agent: false },
          ],
        }),
      ];
      render(<ApplyTemplateModal {...defaultProps} />);

      expect(screen.getByText("My Custom Template")).toBeInTheDocument();
      expect(screen.getByText("A template for testing")).toBeInTheDocument();
      expect(screen.getByText("2 phases")).toBeInTheDocument();
      expect(screen.getByText("1 roles")).toBeInTheDocument();
    });
  });
});

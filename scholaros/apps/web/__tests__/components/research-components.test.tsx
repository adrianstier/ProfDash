import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../utils/test-utils";
import { ExperimentCard } from "@/components/research/ExperimentCard";
import { ExperimentList } from "@/components/research/ExperimentList";
import { PermitCard } from "@/components/research/PermitCard";
import { SiteSelect } from "@/components/research/SiteSelect";
import type { ExperimentWithDetails, PermitWithDetails } from "@scholaros/shared";

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

// Mock experiment hooks
vi.mock("@/lib/hooks/use-experiments", () => ({
  useExperiments: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useDeleteExperiment: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  getExperimentStatusConfig: vi.fn((status: string) => {
    const configs: Record<string, { label: string; bgColor: string; textColor: string }> = {
      planning: { label: "Planning", bgColor: "bg-blue-100", textColor: "text-blue-700" },
      active: { label: "Active", bgColor: "bg-green-100", textColor: "text-green-700" },
      completed: { label: "Completed", bgColor: "bg-gray-100", textColor: "text-gray-700" },
      on_hold: { label: "On Hold", bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
    };
    return configs[status] ?? configs.planning;
  }),
  EXPERIMENT_STATUS_CONFIG: {
    planning: { label: "Planning" },
    active: { label: "Active" },
    completed: { label: "Completed" },
    on_hold: { label: "On Hold" },
  },
}));

// Mock permit hooks
vi.mock("@/lib/hooks/use-permits", () => ({
  usePermits: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  getPermitStatusConfig: vi.fn((status: string) => {
    const configs: Record<string, { label: string; bgColor: string; textColor: string }> = {
      active: { label: "Active", bgColor: "bg-green-100", textColor: "text-green-700" },
      expired: { label: "Expired", bgColor: "bg-red-100", textColor: "text-red-700" },
      pending: { label: "Pending", bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
    };
    return configs[status] ?? configs.active;
  }),
  getPermitTypeConfig: vi.fn((type: string) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: "📋",
  })),
  getDaysUntilExpiration: vi.fn((date: string | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }),
  getExpirationUrgency: vi.fn((date: string | null) => {
    if (!date) return "ok";
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return "expired";
    if (days <= 14) return "critical";
    if (days <= 30) return "warning";
    return "ok";
  }),
}));

// Mock field sites hook
vi.mock("@/lib/hooks/use-field-sites", () => ({
  useFieldSites: vi.fn(() => ({
    data: [
      { id: "site-1", name: "Mountain Research Station", code: "MRS", location: { country: "USA" } },
      { id: "site-2", name: "Coastal Lab", code: "CL", location: { country: "UK" } },
    ],
    isLoading: false,
  })),
}));

// Mock experiment modal
vi.mock("@/components/research/ExperimentModal", () => ({
  ExperimentModal: () => <div data-testid="experiment-modal">Experiment Modal</div>,
}));

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockExperiment(
  overrides: Partial<ExperimentWithDetails> = {}
): ExperimentWithDetails {
  return {
    id: "exp-1",
    project_id: "project-1",
    title: "Soil Carbon Analysis",
    code: "SCA-001",
    description: "Analysis of soil carbon content across sites",
    status: "active",
    color: "bg-blue-500",
    fieldwork_start: "2025-06-01",
    fieldwork_end: "2025-08-30",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    site: { id: "site-1", name: "Mountain Research Station", code: "MRS" },
    lead: { id: "user-1", full_name: "Dr. Smith" },
    team_count: 5,
    fieldwork_count: 3,
    task_count: 12,
    ...overrides,
  } as ExperimentWithDetails;
}

function createMockPermit(
  overrides: Partial<PermitWithDetails> = {}
): PermitWithDetails {
  return {
    id: "permit-1",
    project_id: "project-1",
    title: "IACUC Protocol",
    permit_type: "iacuc",
    permit_number: "2025-001",
    status: "active",
    issuing_authority: "University IRB",
    expiration_date: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000
    ).toISOString(),
    renewal_reminder_days: 30,
    pi_name: "Dr. Johnson",
    notes: "Annual renewal required",
    documents: [],
    site: null,
    experiment: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as PermitWithDetails;
}

// ============================================================================
// ExperimentCard Tests
// ============================================================================

describe("ExperimentCard", () => {
  const defaultExperiment = createMockExperiment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders experiment title as a link", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      const link = screen.getByRole("link", { name: "Soil Carbon Analysis" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        "/projects/project-1/experiments/exp-1"
      );
    });

    it("renders experiment code", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      expect(screen.getByText("SCA-001")).toBeInTheDocument();
    });

    it("renders description", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      expect(
        screen.getByText("Analysis of soil carbon content across sites")
      ).toBeInTheDocument();
    });

    it("renders status badge", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders site info", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      expect(screen.getByText("Mountain Research Station")).toBeInTheDocument();
      expect(screen.getByText("(MRS)")).toBeInTheDocument();
    });

    it("renders lead researcher", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    });

    it("renders fieldwork dates", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      // Dates are formatted with toLocaleDateString("en-US", { month: "short", day: "numeric" })
      // which may shift due to timezone. Match the actual formatted output.
      const startFormatted = new Date("2025-06-01").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endFormatted = new Date("2025-08-30").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const expectedRange = `${startFormatted} - ${endFormatted}`;
      expect(screen.getByText(expectedRange)).toBeInTheDocument();
    });

    it("renders stats (team, trips, tasks)", () => {
      render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      expect(screen.getByText("5 team")).toBeInTheDocument();
      expect(screen.getByText("3 trips")).toBeInTheDocument();
      expect(screen.getByText("12 tasks")).toBeInTheDocument();
    });

    it("renders without optional fields", () => {
      const minimalExperiment = createMockExperiment({
        code: null,
        description: null,
        site: null,
        lead: null,
        fieldwork_start: null,
        fieldwork_end: null,
      });
      render(
        <ExperimentCard
          experiment={minimalExperiment}
          projectId="project-1"
        />
      );
      expect(screen.getByText("Soil Carbon Analysis")).toBeInTheDocument();
      expect(screen.queryByText("SCA-001")).not.toBeInTheDocument();
    });
  });

  describe("actions menu", () => {
    it("does not show menu when no handlers provided", () => {
      const { container } = render(
        <ExperimentCard experiment={defaultExperiment} projectId="project-1" />
      );
      // The menu wrapper should not be in the DOM
      expect(container.querySelector("[data-testid='actions-menu']")).toBeNull();
    });

    it("shows menu when edit or delete handlers provided", () => {
      render(
        <ExperimentCard
          experiment={defaultExperiment}
          projectId="project-1"
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      // Menu button is present but hidden (opacity-0)
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("calls onEdit when Edit clicked in menu", () => {
      const onEdit = vi.fn();
      render(
        <ExperimentCard
          experiment={defaultExperiment}
          projectId="project-1"
          onEdit={onEdit}
          onDelete={vi.fn()}
        />
      );
      // Click the menu button (MoreHorizontal icon button)
      const menuButtons = screen.getAllByRole("button");
      const menuTrigger = menuButtons[menuButtons.length - 1]; // Last button is menu
      fireEvent.click(menuTrigger);
      // Click Edit
      fireEvent.click(screen.getByText("Edit"));
      expect(onEdit).toHaveBeenCalled();
    });

    it("calls onDelete when Delete clicked in menu", () => {
      const onDelete = vi.fn();
      render(
        <ExperimentCard
          experiment={defaultExperiment}
          projectId="project-1"
          onEdit={vi.fn()}
          onDelete={onDelete}
        />
      );
      // Click the menu button
      const menuButtons = screen.getAllByRole("button");
      const menuTrigger = menuButtons[menuButtons.length - 1];
      fireEvent.click(menuTrigger);
      // Click Delete
      fireEvent.click(screen.getByText("Delete"));
      expect(onDelete).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// ExperimentList Tests
// ============================================================================

describe("ExperimentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", async () => {
    const { useExperiments } = await import("@/lib/hooks/use-experiments");
    (useExperiments as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { container } = render(
      <ExperimentList
        projectId="project-1"
        workspaceId="ws-1"
      />
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders empty state when no experiments", async () => {
    const { useExperiments } = await import("@/lib/hooks/use-experiments");
    (useExperiments as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <ExperimentList projectId="project-1" workspaceId="ws-1" />
    );
    expect(screen.getByText("No experiments yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add Your First Experiment")
    ).toBeInTheDocument();
  });

  it("renders experiment cards", async () => {
    const { useExperiments } = await import("@/lib/hooks/use-experiments");
    (useExperiments as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        createMockExperiment({ id: "exp-1", title: "Soil Analysis" }),
        createMockExperiment({ id: "exp-2", title: "Water Quality" }),
      ],
      isLoading: false,
    });

    render(
      <ExperimentList projectId="project-1" workspaceId="ws-1" />
    );
    expect(screen.getByText("Soil Analysis")).toBeInTheDocument();
    expect(screen.getByText("Water Quality")).toBeInTheDocument();
  });

  it("filters experiments by search", async () => {
    const { useExperiments } = await import("@/lib/hooks/use-experiments");
    (useExperiments as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        createMockExperiment({ id: "exp-1", title: "Soil Analysis", description: "Studying soil composition", code: "SA-001" }),
        createMockExperiment({ id: "exp-2", title: "Water Quality", description: "Measuring water purity", code: "WQ-001" }),
      ],
      isLoading: false,
    });

    render(
      <ExperimentList projectId="project-1" workspaceId="ws-1" />
    );

    const searchInput = screen.getByPlaceholderText("Search experiments...");
    fireEvent.change(searchInput, { target: { value: "Soil" } });

    expect(screen.getByText("Soil Analysis")).toBeInTheDocument();
    expect(screen.queryByText("Water Quality")).not.toBeInTheDocument();
  });

  it("opens add modal when button clicked", async () => {
    const { useExperiments } = await import("@/lib/hooks/use-experiments");
    (useExperiments as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <ExperimentList projectId="project-1" workspaceId="ws-1" />
    );
    fireEvent.click(screen.getByText("Add Experiment"));
    expect(screen.getByTestId("experiment-modal")).toBeInTheDocument();
  });
});

// ============================================================================
// PermitCard Tests
// ============================================================================

describe("PermitCard", () => {
  const defaultPermit = createMockPermit();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders permit title", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText("IACUC Protocol")).toBeInTheDocument();
    });

    it("renders permit number", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText("#2025-001")).toBeInTheDocument();
    });

    it("renders permit type", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText("Iacuc")).toBeInTheDocument();
    });

    it("renders status badge", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders issuing authority", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText("University IRB")).toBeInTheDocument();
    });

    it("renders PI name", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText("PI: Dr. Johnson")).toBeInTheDocument();
    });

    it("renders notes", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText("Annual renewal required")).toBeInTheDocument();
    });

    it("renders expiration date", () => {
      render(<PermitCard permit={defaultPermit} />);
      expect(screen.getByText(/Expires:/)).toBeInTheDocument();
    });
  });

  describe("urgency display", () => {
    it("shows warning for expiring permits", () => {
      const expiringPermit = createMockPermit({
        expiration_date: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
      render(<PermitCard permit={expiringPermit} />);
      expect(screen.getByText(/Expires in \d+ days/)).toBeInTheDocument();
    });

    it("shows expired message for past permits", () => {
      const expiredPermit = createMockPermit({
        expiration_date: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "expired",
      });
      render(<PermitCard permit={expiredPermit} />);
      expect(screen.getByText(/Expired \d+ days ago/)).toBeInTheDocument();
    });
  });

  describe("documents", () => {
    it("renders document links", () => {
      const permitWithDocs = createMockPermit({
        documents: [
          { name: "Protocol.pdf", url: "https://example.com/protocol.pdf" },
          { name: "Approval.pdf", url: "https://example.com/approval.pdf" },
        ],
      });
      render(<PermitCard permit={permitWithDocs} />);
      expect(screen.getByText("Protocol.pdf")).toBeInTheDocument();
      expect(screen.getByText("Approval.pdf")).toBeInTheDocument();
    });

    it("shows +N more when more than 3 documents", () => {
      const permitWithManyDocs = createMockPermit({
        documents: [
          { name: "Doc1.pdf", url: "#" },
          { name: "Doc2.pdf", url: "#" },
          { name: "Doc3.pdf", url: "#" },
          { name: "Doc4.pdf", url: "#" },
          { name: "Doc5.pdf", url: "#" },
        ],
      });
      render(<PermitCard permit={permitWithManyDocs} />);
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("shows menu when handlers provided", () => {
      render(
        <PermitCard
          permit={defaultPermit}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("calls onEdit when Edit menu item clicked", () => {
      const onEdit = vi.fn();
      render(
        <PermitCard
          permit={defaultPermit}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />
      );
      // Click menu trigger
      const menuButtons = screen.getAllByRole("button");
      const menuTrigger = menuButtons[menuButtons.length - 1];
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Edit"));
      expect(onEdit).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// SiteSelect Tests
// ============================================================================

describe("SiteSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholder when no value selected", () => {
    render(
      <SiteSelect
        workspaceId="ws-1"
        value={null}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Select a site...")).toBeInTheDocument();
  });

  it("renders selected site name", () => {
    render(
      <SiteSelect
        workspaceId="ws-1"
        value="site-1"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Mountain Research Station")).toBeInTheDocument();
    expect(screen.getByText("(MRS)")).toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(
      <SiteSelect
        workspaceId="ws-1"
        value={null}
        onChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Select a site..."));
    // Sites should be visible in dropdown
    expect(screen.getByText("Mountain Research Station")).toBeInTheDocument();
    expect(screen.getByText("Coastal Lab")).toBeInTheDocument();
  });

  it("calls onChange when a site is selected", () => {
    const onChange = vi.fn();
    render(
      <SiteSelect
        workspaceId="ws-1"
        value={null}
        onChange={onChange}
      />
    );
    // Open dropdown
    fireEvent.click(screen.getByText("Select a site..."));
    // Select a site
    fireEvent.click(screen.getByText("Mountain Research Station"));
    expect(onChange).toHaveBeenCalledWith("site-1");
  });

  it("shows clear option when value is selected", () => {
    render(
      <SiteSelect
        workspaceId="ws-1"
        value="site-1"
        onChange={vi.fn()}
      />
    );
    // Open dropdown
    const triggerButton = screen.getByRole("button");
    fireEvent.click(triggerButton);
    expect(screen.getByText("Clear selection")).toBeInTheDocument();
  });

  it("calls onChange with null when cleared", () => {
    const onChange = vi.fn();
    render(
      <SiteSelect
        workspaceId="ws-1"
        value="site-1"
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Clear selection"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("is disabled when disabled prop is true", () => {
    render(
      <SiteSelect
        workspaceId="ws-1"
        value={null}
        onChange={vi.fn()}
        disabled
      />
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("shows custom placeholder", () => {
    render(
      <SiteSelect
        workspaceId="ws-1"
        value={null}
        onChange={vi.fn()}
        placeholder="Choose a research site"
      />
    );
    expect(screen.getByText("Choose a research site")).toBeInTheDocument();
  });

  it("shows create option when enabled", () => {
    const onCreateClick = vi.fn();
    render(
      <SiteSelect
        workspaceId="ws-1"
        value={null}
        onChange={vi.fn()}
        showCreateOption
        onCreateClick={onCreateClick}
      />
    );
    fireEvent.click(screen.getByText("Select a site..."));
    expect(screen.getByText("Add new site")).toBeInTheDocument();
  });
});

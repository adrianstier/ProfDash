import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../utils/test-utils";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("lucide-react", () => ({
  FileText: ({ className }: { className?: string }) => <span data-testid="icon-file" className={className} />,
  Users: ({ className }: { className?: string }) => <span data-testid="icon-users" className={className} />,
  Calendar: ({ className }: { className?: string }) => <span data-testid="icon-calendar" className={className} />,
  ExternalLink: ({ className }: { className?: string }) => <span data-testid="icon-external" className={className} />,
  MoreVertical: ({ className }: { className?: string }) => <span data-testid="icon-more" className={className} />,
  Edit2: ({ className }: { className?: string }) => <span data-testid="icon-edit" className={className} />,
  Trash2: ({ className }: { className?: string }) => <span data-testid="icon-trash" className={className} />,
  Link2: ({ className }: { className?: string }) => <span data-testid="icon-link" className={className} />,
  Quote: ({ className }: { className?: string }) => <span data-testid="icon-quote" className={className} />,
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
  Plus: ({ className }: { className?: string }) => <span data-testid="icon-plus" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="icon-loader" className={className} />,
  CheckCircle: ({ className }: { className?: string }) => <span data-testid="icon-check" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <span data-testid="icon-alert" className={className} />,
}));

vi.mock("@scholaros/shared", () => ({
  PUBLICATION_TYPE_LABELS: {
    "journal-article": "Journal Article",
    "conference-paper": "Conference Paper",
    preprint: "Preprint",
    "book-chapter": "Book Chapter",
    thesis: "Thesis",
    report: "Report",
    other: "Other",
  },
  PUBLICATION_TYPE_COLORS: {
    "journal-article": "bg-blue-100 text-blue-700",
    "conference-paper": "bg-green-100 text-green-700",
    preprint: "bg-orange-100 text-orange-700",
    "book-chapter": "bg-purple-100 text-purple-700",
    thesis: "bg-pink-100 text-pink-700",
    report: "bg-gray-100 text-gray-700",
    other: "bg-gray-100 text-gray-700",
  },
  PUBLICATION_STATUS_LABELS: {
    idea: "Idea",
    drafting: "Drafting",
    "internal-review": "Internal Review",
    submitted: "Submitted",
    "under-review": "Under Review",
    revision: "Revision",
    accepted: "Accepted",
    "in-press": "In Press",
    published: "Published",
  },
  PUBLICATION_STATUS_COLORS: {
    idea: "bg-gray-100 text-gray-700",
    drafting: "bg-yellow-100 text-yellow-700",
    "internal-review": "bg-blue-100 text-blue-700",
    submitted: "bg-orange-100 text-orange-700",
    "under-review": "bg-purple-100 text-purple-700",
    revision: "bg-red-100 text-red-700",
    accepted: "bg-green-100 text-green-700",
    "in-press": "bg-emerald-100 text-emerald-700",
    published: "bg-teal-100 text-teal-700",
  },
  PUBLICATION_PIPELINE_STAGES: [
    "idea",
    "drafting",
    "internal-review",
    "submitted",
    "under-review",
    "revision",
    "accepted",
    "in-press",
    "published",
  ],
  AUTHOR_ROLE_LABELS: {
    first: "First Author",
    "co-first": "Co-First Author",
    middle: "Middle Author",
    last: "Senior Author",
    corresponding: "Corresponding",
  },
}));

const mockCreatePublicationMutateAsync = vi.fn();
const mockUpdatePublicationMutateAsync = vi.fn();
const mockImportFromDOIMutateAsync = vi.fn();

vi.mock("@/lib/hooks/use-publications", () => ({
  useCreatePublication: vi.fn(() => ({
    mutateAsync: mockCreatePublicationMutateAsync,
    isPending: false,
  })),
  useUpdatePublication: vi.fn(() => ({
    mutateAsync: mockUpdatePublicationMutateAsync,
    isPending: false,
  })),
  useImportFromDOI: vi.fn(() => ({
    mutateAsync: mockImportFromDOIMutateAsync,
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  })),
}));

vi.mock("@/lib/stores/workspace-store", () => ({
  useWorkspaceStore: vi.fn(() => ({
    currentWorkspaceId: "workspace-1",
  })),
}));

vi.mock("@/components/voice", () => ({
  VoiceInputInline: () => <button data-testid="voice-input">Voice</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Test Data
// ============================================================================

function createMockPublication(overrides = {}) {
  return {
    id: "pub-1",
    user_id: "user-1",
    title: "Machine Learning in Academic Settings",
    publication_type: "journal-article" as const,
    status: "published" as const,
    abstract: "A study of ML in academia",
    journal: "Nature Machine Intelligence",
    year: 2024,
    doi: "10.1234/test",
    citation_count: 42,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    workspace_id: "workspace-1",
    publication_authors: [
      { id: "a1", publication_id: "pub-1", name: "Alice Smith", author_role: "first" as const, is_corresponding: true, author_order: 1, created_at: "2024-01-01" },
      { id: "a2", publication_id: "pub-1", name: "Bob Jones", author_role: "middle" as const, is_corresponding: false, author_order: 2, created_at: "2024-01-01" },
    ],
    ...overrides,
  } as any;
}

// ============================================================================
// PublicationCard Tests
// ============================================================================

import { PublicationCard } from "@/components/publications/publication-card";

describe("PublicationCard", () => {
  it("renders publication title", () => {
    render(<PublicationCard publication={createMockPublication()} />);
    expect(screen.getByText("Machine Learning in Academic Settings")).toBeInTheDocument();
  });

  it("renders publication type badge", () => {
    render(<PublicationCard publication={createMockPublication()} />);
    expect(screen.getByText("Journal Article")).toBeInTheDocument();
  });

  it("renders authors", () => {
    render(<PublicationCard publication={createMockPublication()} />);
    expect(screen.getByText("Alice Smith, Bob Jones")).toBeInTheDocument();
  });

  it("renders 'et al.' for more than 3 authors", () => {
    const pub = createMockPublication({
      publication_authors: [
        { name: "Alice", author_role: "first", is_corresponding: true },
        { name: "Bob", author_role: "middle", is_corresponding: false },
        { name: "Charlie", author_role: "middle", is_corresponding: false },
        { name: "Dave", author_role: "last", is_corresponding: false },
      ],
    });
    render(<PublicationCard publication={pub} />);
    expect(screen.getByText("Alice et al.")).toBeInTheDocument();
  });

  it("renders 'No authors' when no authors", () => {
    const pub = createMockPublication({ publication_authors: [] });
    render(<PublicationCard publication={pub} />);
    expect(screen.getByText("No authors")).toBeInTheDocument();
  });

  it("renders journal and year", () => {
    render(<PublicationCard publication={createMockPublication()} />);
    expect(screen.getByText("Nature Machine Intelligence")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it("renders DOI link", () => {
    render(<PublicationCard publication={createMockPublication()} />);
    const doiLink = screen.getByText("DOI");
    expect(doiLink.closest("a")).toHaveAttribute("href", "https://doi.org/10.1234/test");
  });

  it("renders 'No DOI' when doi is null", () => {
    const pub = createMockPublication({ doi: null });
    render(<PublicationCard publication={pub} />);
    expect(screen.getByText("No DOI")).toBeInTheDocument();
  });

  it("renders citation count", () => {
    render(<PublicationCard publication={createMockPublication()} />);
    expect(screen.getByText("42 citations")).toBeInTheDocument();
  });

  it("calls onView when title is clicked", () => {
    const onView = vi.fn();
    render(<PublicationCard publication={createMockPublication()} onView={onView} />);
    fireEvent.click(screen.getByText("Machine Learning in Academic Settings"));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it("renders first author badge", () => {
    render(<PublicationCard publication={createMockPublication()} />);
    expect(screen.getByText("First Author")).toBeInTheDocument();
  });

  it("applies dragging styles when isDragging", () => {
    const { container } = render(
      <PublicationCard publication={createMockPublication()} isDragging />
    );
    expect(container.querySelector(".opacity-50")).toBeInTheDocument();
  });
});

// ============================================================================
// PublicationPipeline Tests
// ============================================================================

import { PublicationPipeline } from "@/components/publications/publication-pipeline";

describe("PublicationPipeline", () => {
  it("renders all pipeline stage columns", () => {
    render(<PublicationPipeline publications={[]} />);
    expect(screen.getByText("Idea")).toBeInTheDocument();
    expect(screen.getByText("Drafting")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("renders publications in correct columns", () => {
    const publications = [
      createMockPublication({ id: "pub-1", title: "Paper A", status: "idea" }),
      createMockPublication({ id: "pub-2", title: "Paper B", status: "published" }),
    ];
    render(<PublicationPipeline publications={publications} />);
    expect(screen.getByText("Paper A")).toBeInTheDocument();
    expect(screen.getByText("Paper B")).toBeInTheDocument();
  });

  it("shows 'Drop here' for empty columns", () => {
    render(<PublicationPipeline publications={[]} />);
    const dropIndicators = screen.getAllByText("Drop here");
    expect(dropIndicators.length).toBeGreaterThan(0);
  });

  it("shows publication count in column header", () => {
    const publications = [
      createMockPublication({ id: "pub-1", status: "idea" }),
      createMockPublication({ id: "pub-2", status: "idea" }),
    ];
    render(<PublicationPipeline publications={publications} />);
    // Should show "2" next to "Idea"
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

// ============================================================================
// AddPublicationModal Tests
// ============================================================================

import { AddPublicationModal } from "@/components/publications/add-publication-modal";

describe("AddPublicationModal", () => {
  it("returns null when not open", () => {
    const { container } = render(
      <AddPublicationModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal header when open", () => {
    render(<AddPublicationModal isOpen={true} onClose={vi.fn()} />);
    const elements = screen.getAllByText("Add Publication");
    expect(elements.length).toBeGreaterThanOrEqual(1);
    // Header h2 contains "Add Publication"
    const header = elements.find((el) => el.tagName === "H2");
    expect(header).toBeInTheDocument();
  });

  it("renders title input", () => {
    render(<AddPublicationModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("Publication title")).toBeInTheDocument();
  });

  it("renders type and status selects", () => {
    render(<AddPublicationModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders Add Author button", () => {
    render(<AddPublicationModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Add Author")).toBeInTheDocument();
  });

  it("disables submit button when title is empty", () => {
    render(<AddPublicationModal isOpen={true} onClose={vi.fn()} />);
    // The header has "Add Publication" as h2, the button also has "Add Publication"
    const submitButtons = screen.getAllByText("Add Publication");
    // The second one is the button in the footer
    const submitButton = submitButtons.find((el) => el.closest("button") !== null);
    expect(submitButton?.closest("button")).toBeDisabled();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<AddPublicationModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows target journal fields for early-stage publications", () => {
    render(<AddPublicationModal isOpen={true} onClose={vi.fn()} />);
    // Default status is "idea" which should show target journal
    expect(screen.getByText("Target Journal")).toBeInTheDocument();
  });
});

// ============================================================================
// ImportDOIModal Tests
// ============================================================================

import { ImportDOIModal } from "@/components/publications/import-doi-modal";

describe("ImportDOIModal", () => {
  it("returns null when not open", () => {
    const { container } = render(
      <ImportDOIModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal header when open", () => {
    render(<ImportDOIModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Import from DOI")).toBeInTheDocument();
  });

  it("renders DOI input", () => {
    render(<ImportDOIModal isOpen={true} onClose={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("10.1000/xyz123 or https://doi.org/...")
    ).toBeInTheDocument();
  });

  it("disables Import button when DOI is empty", () => {
    render(<ImportDOIModal isOpen={true} onClose={vi.fn()} />);
    const importButton = screen.getByText("Import").closest("button");
    expect(importButton).toBeDisabled();
  });

  it("enables Import button when DOI is entered", () => {
    render(<ImportDOIModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(
      screen.getByPlaceholderText("10.1000/xyz123 or https://doi.org/..."),
      { target: { value: "10.1234/test" } }
    );
    const importButton = screen.getByText("Import").closest("button");
    expect(importButton).not.toBeDisabled();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<ImportDOIModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders description text", () => {
    render(<ImportDOIModal isOpen={true} onClose={vi.fn()} />);
    expect(
      screen.getByText(/Enter a DOI or a DOI URL to automatically import/)
    ).toBeInTheDocument();
  });
});

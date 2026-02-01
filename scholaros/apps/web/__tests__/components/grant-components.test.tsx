import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "../utils/test-utils";

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

// ============================================================================
// Mocks
// ============================================================================

vi.mock("lucide-react", () => ({
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
  Brain: ({ className }: { className?: string }) => <span data-testid="icon-brain" className={className} />,
  CheckCircle: ({ className }: { className?: string }) => <span data-testid="icon-check" className={className} />,
  ArrowRight: ({ className }: { className?: string }) => <span data-testid="icon-arrow" className={className} />,
  FileText: ({ className }: { className?: string }) => <span data-testid="icon-file" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="icon-loader" className={className} />,
}));

const mockProcessDocumentMutateAsync = vi.fn();

vi.mock("@/lib/hooks/use-documents", () => ({
  useProcessDocument: vi.fn(() => ({
    mutateAsync: mockProcessDocumentMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  })),
}));

vi.mock("@/components/documents/document-upload", () => ({
  DocumentUpload: ({
    onUploadComplete,
    onCancel,
  }: {
    workspaceId?: string;
    onUploadComplete: (id: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="document-upload">
      <button onClick={() => onUploadComplete("doc-1")}>Upload</button>
      <button onClick={onCancel}>Cancel Upload</button>
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// GrantDocumentModal Tests
// ============================================================================

import { GrantDocumentModal } from "@/components/grants/grant-document-modal";

describe("GrantDocumentModal", () => {
  it("returns null when not open", () => {
    const { container } = render(
      <GrantDocumentModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal header when open", () => {
    render(<GrantDocumentModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Import Grant from Document")).toBeInTheDocument();
  });

  it("renders upload step initially", () => {
    render(<GrantDocumentModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("document-upload")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload a grant announcement/)
    ).toBeInTheDocument();
  });

  it("renders progress steps", () => {
    render(<GrantDocumentModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("upload")).toBeInTheDocument();
    expect(screen.getByText("processing")).toBeInTheDocument();
    expect(screen.getByText("review")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<GrantDocumentModal isOpen={true} onClose={onClose} />);
    // The X button is the close button
    const closeButtons = screen.getAllByRole("button");
    // Find the button that contains the X icon (close button in header)
    const closeBtn = closeButtons.find(
      (btn) => btn.querySelector("[data-testid='icon-x']") !== null
    );
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("moves to processing step after upload", async () => {
    mockProcessDocumentMutateAsync.mockResolvedValueOnce({
      data: {
        title: "NSF Grant",
        agency: "NSF",
        description: "Research funding",
        deadline: "2024-12-31",
        amount_min: 50000,
        amount_max: 200000,
      },
    });

    render(<GrantDocumentModal isOpen={true} onClose={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Upload"));
      await flushPromises();
    });

    // Since the mock resolves immediately, it transitions through processing to review
    const hasReview = screen.queryByText(/AI extracted/);
    const hasProcessing = screen.queryByText(/Analyzing/);
    expect(hasReview || hasProcessing).toBeTruthy();
  });

  it("shows review step with extracted data", async () => {
    mockProcessDocumentMutateAsync.mockResolvedValueOnce({
      data: {
        title: "NSF Grant Opportunity",
        agency: "National Science Foundation",
        description: "Research funding for AI",
      },
    });

    render(
      <GrantDocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onGrantDataExtracted={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Upload"));
      await flushPromises();
    });

    expect(screen.getByDisplayValue("NSF Grant Opportunity")).toBeInTheDocument();
  });

  it("stays on processing step when processing fails", async () => {
    mockProcessDocumentMutateAsync.mockRejectedValueOnce(new Error("Failed"));

    render(<GrantDocumentModal isOpen={true} onClose={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Upload"));
      await flushPromises();
    });

    // When processing fails, the component stays on processing step
    // The step indicator shows "processing" as active
    const progressSteps = screen.getAllByText("processing");
    expect(progressSteps.length).toBeGreaterThan(0);
    // Should NOT show the review step
    expect(screen.queryByText("Add to Watchlist")).not.toBeInTheDocument();
  });

  it("calls onGrantDataExtracted when Add to Watchlist is clicked", async () => {
    mockProcessDocumentMutateAsync.mockResolvedValueOnce({
      data: {
        title: "Test Grant",
        agency: "Test Agency",
      },
    });

    const onGrantDataExtracted = vi.fn();
    render(
      <GrantDocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onGrantDataExtracted={onGrantDataExtracted}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Upload"));
      await flushPromises();
    });

    expect(screen.getByText("Add to Watchlist")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Add to Watchlist"));
    expect(onGrantDataExtracted).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Grant" })
    );
  });

  it("shows complete step after confirming", async () => {
    mockProcessDocumentMutateAsync.mockResolvedValueOnce({
      data: { title: "Test Grant" },
    });

    render(
      <GrantDocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onGrantDataExtracted={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Upload"));
      await flushPromises();
    });

    expect(screen.getByText("Add to Watchlist")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Add to Watchlist"));

    expect(screen.getByText("Grant Added Successfully")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "../utils/test-utils";
import {
  ErrorBoundary,
  QueryErrorFallback,
  EmptyState,
  LoadingSkeleton,
} from "@/components/error-boundary";

// ============================================================================
// ErrorBoundary Tests
// ============================================================================

describe("ErrorBoundary", () => {
  // Suppress console.error during tests since we intentionally throw
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Everything is fine</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
  });

  it("renders default error UI when a child throws", () => {
    function ThrowingComponent(): React.ReactElement {
      throw new Error("Test error message");
    }

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    function ThrowingComponent(): React.ReactElement {
      throw new Error("Test error");
    }

    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
    expect(
      screen.queryByText("Something went wrong")
    ).not.toBeInTheDocument();
  });

  it("calls onError callback when error occurs", () => {
    const onError = vi.fn();

    function ThrowingComponent(): React.ReactElement {
      throw new Error("Callback test error");
    }

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Callback test error");
  });

  it("resets error state when Try again is clicked", () => {
    let shouldThrow = true;

    function ConditionalThrower(): React.ReactElement {
      if (shouldThrow) {
        throw new Error("Temporary error");
      }
      return <div>Recovered content</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    );

    // Initially shows error
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the condition and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));

    // Should now show recovered content
    expect(screen.getByText("Recovered content")).toBeInTheDocument();
  });

  it("shows generic message when error has no message", () => {
    function ThrowingComponent(): React.ReactElement {
      throw new Error();
    }

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(
      screen.getByText("An unexpected error occurred")
    ).toBeInTheDocument();
  });
});

// ============================================================================
// QueryErrorFallback Tests
// ============================================================================

describe("QueryErrorFallback", () => {
  it("renders error message", () => {
    render(
      <QueryErrorFallback error={new Error("Failed to fetch tasks")} />
    );
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch tasks")).toBeInTheDocument();
  });

  it("renders retry button when resetErrorBoundary is provided", () => {
    const reset = vi.fn();
    render(
      <QueryErrorFallback
        error={new Error("Network error")}
        resetErrorBoundary={reset}
      />
    );
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("calls resetErrorBoundary when retry is clicked", () => {
    const reset = vi.fn();
    render(
      <QueryErrorFallback
        error={new Error("Network error")}
        resetErrorBoundary={reset}
      />
    );
    fireEvent.click(screen.getByText("Retry"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when no handler provided", () => {
    render(<QueryErrorFallback error={new Error("Error")} />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });
});

// ============================================================================
// EmptyState Tests
// ============================================================================

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No tasks found" />);
    expect(screen.getByText("No tasks found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="No tasks"
        description="Create your first task to get started"
      />
    );
    expect(
      screen.getByText("Create your first task to get started")
    ).toBeInTheDocument();
  });

  it("does not render description when absent", () => {
    render(<EmptyState title="No tasks" />);
    expect(
      screen.queryByText("Create your first task")
    ).not.toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No tasks"
        action={{ label: "Create Task", onClick }}
      />
    );
    expect(screen.getByText("Create Task")).toBeInTheDocument();
  });

  it("calls action onClick when button clicked", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No tasks"
        action={{ label: "Create Task", onClick }}
      />
    );
    fireEvent.click(screen.getByText("Create Task"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render action button when no action provided", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(
      <EmptyState
        title="No items"
        icon={<span data-testid="custom-icon">icon</span>}
      />
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});

// ============================================================================
// LoadingSkeleton Tests
// ============================================================================

describe("LoadingSkeleton", () => {
  it("renders 3 skeleton items by default", () => {
    const { container } = render(<LoadingSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("renders specified number of items", () => {
    const { container } = render(<LoadingSkeleton count={5} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(5);
  });

  it("applies custom className", () => {
    const { container } = render(<LoadingSkeleton className="h-24" count={1} />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton?.className).toContain("h-24");
  });

  it("applies default h-16 className", () => {
    const { container } = render(<LoadingSkeleton count={1} />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton?.className).toContain("h-16");
  });
});

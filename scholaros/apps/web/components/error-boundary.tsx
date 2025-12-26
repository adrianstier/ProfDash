"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">
            Something went wrong
          </h2>
          <p className="mb-4 text-center text-sm text-red-600 dark:text-red-300">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Query error fallback component
interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

export function QueryErrorFallback({
  error,
  resetErrorBoundary,
}: QueryErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <AlertTriangle className="mb-2 h-8 w-8 text-red-500" />
      <p className="mb-2 text-sm font-medium text-red-700 dark:text-red-400">
        Failed to load data
      </p>
      <p className="mb-3 text-xs text-red-600 dark:text-red-300">
        {error.message}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Loading skeleton component
interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export function LoadingSkeleton({ className = "h-16", count = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-md bg-muted ${className}`}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/today"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            Go to Today
          </Link>
        </div>
      </div>
    </div>
  );
}

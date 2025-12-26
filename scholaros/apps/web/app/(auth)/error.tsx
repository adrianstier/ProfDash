"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Auth error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message || "An error occurred during authentication."}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/login"
            className="text-sm text-primary hover:underline"
          >
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}

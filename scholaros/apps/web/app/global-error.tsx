"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">500</h1>
            <h2 className="mt-2 text-xl font-semibold text-gray-700">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {error.message || "An unexpected error occurred."}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs text-gray-400">
                Error ID: {error.digest}
              </p>
            )}
            <div className="mt-6">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

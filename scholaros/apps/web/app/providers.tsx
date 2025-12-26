"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast";

// Query key factory for consistent key management
export const queryKeys = {
  tasks: {
    all: ["tasks"] as const,
    lists: () => [...queryKeys.tasks.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },
  projects: {
    all: ["projects"] as const,
    lists: () => [...queryKeys.projects.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },
  workspaces: {
    all: ["workspaces"] as const,
    lists: () => [...queryKeys.workspaces.all, "list"] as const,
    detail: (id: string) => [...queryKeys.workspaces.all, id] as const,
    members: (id: string) => [...queryKeys.workspaces.all, id, "members"] as const,
  },
  calendar: {
    connection: ["calendar", "connection"] as const,
    events: (params?: Record<string, unknown>) =>
      ["calendar", "events", params] as const,
    calendars: ["calendar", "calendars"] as const,
  },
  grants: {
    search: (filters: Record<string, unknown>) =>
      ["grants", "search", filters] as const,
    watchlist: (workspaceId: string) =>
      ["grants", "watchlist", workspaceId] as const,
    savedSearches: (workspaceId: string) =>
      ["grants", "saved-searches", workspaceId] as const,
  },
  publications: {
    all: ["publications"] as const,
    lists: () => [...queryKeys.publications.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.publications.lists(), filters] as const,
    details: () => [...queryKeys.publications.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.publications.details(), id] as const,
  },
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is fresh for 1 minute - won't refetch during this time
            staleTime: 60 * 1000,
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Don't refetch on window focus by default (reduces API calls)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (user can manually refresh)
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

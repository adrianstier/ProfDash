"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GoogleCalendarListItem } from "@scholaros/shared";

// API response types
export interface CalendarConnectionStatus {
  connected: boolean;
  provider?: string;
  sync_enabled?: boolean;
  selected_calendars?: string[];
  last_sync_at?: string;
  created_at?: string;
}

export interface CalendarEventFromAPI {
  id: string;
  user_id: string;
  external_id: string;
  calendar_id: string | null;
  summary: string | null;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  status: string | null;
  raw_data: Record<string, unknown> | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

// Fetch functions
async function fetchConnectionStatus(): Promise<CalendarConnectionStatus> {
  const response = await fetch("/api/calendar/connection");
  if (!response.ok) {
    if (response.status === 404) {
      return { connected: false };
    }
    throw new Error("Failed to fetch connection status");
  }
  return response.json();
}

async function fetchCalendarEvents(params: {
  start?: string;
  end?: string;
  refresh?: boolean;
}): Promise<CalendarEventFromAPI[]> {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set("start", params.start);
  if (params.end) searchParams.set("end", params.end);
  if (params.refresh) searchParams.set("refresh", "true");

  const response = await fetch(`/api/calendar/events?${searchParams}`);
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error("Failed to fetch calendar events");
  }
  return response.json();
}

async function fetchCalendarList(): Promise<GoogleCalendarListItem[]> {
  const response = await fetch("/api/calendar/calendars");
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error("Failed to fetch calendar list");
  }
  return response.json();
}

async function initiateGoogleAuth(): Promise<{ authUrl: string }> {
  const response = await fetch("/api/auth/google");
  if (!response.ok) {
    throw new Error("Failed to initiate Google auth");
  }
  return response.json();
}

async function disconnectGoogle(): Promise<void> {
  const response = await fetch("/api/auth/google", { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to disconnect Google");
  }
}

async function updateCalendarConnection(params: {
  sync_enabled?: boolean;
  selected_calendars?: string[];
}): Promise<CalendarConnectionStatus> {
  const response = await fetch("/api/calendar/connection", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error("Failed to update calendar connection");
  }
  return response.json();
}

// Hooks

export function useCalendarConnection() {
  return useQuery({
    queryKey: ["calendar", "connection"],
    queryFn: fetchConnectionStatus,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCalendarEvents(params: {
  start?: string;
  end?: string;
  refresh?: boolean;
  enabled?: boolean;
}) {
  const { start, end, refresh, enabled = true } = params;

  return useQuery({
    queryKey: ["calendar", "events", { start, end, refresh }],
    queryFn: () => fetchCalendarEvents({ start, end, refresh }),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCalendarList() {
  return useQuery({
    queryKey: ["calendar", "list"],
    queryFn: fetchCalendarList,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useConnectGoogleCalendar() {
  return useMutation({
    mutationFn: initiateGoogleAuth,
    onSuccess: (data) => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
  });
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateCalendarConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCalendarConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", "connection"] });
    },
  });
}

export function useRefreshCalendarEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => fetchCalendarEvents({ refresh: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PersonnelRole } from "@scholaros/shared";

// API response type (with string dates from JSON)
export interface PersonnelFromAPI {
  id: string;
  workspace_id?: string | null;
  user_id: string;
  name: string;
  role: PersonnelRole;
  year?: number | null;
  funding?: string | null;
  email?: string | null;
  last_meeting?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonnelInput {
  name: string;
  role: PersonnelRole;
  workspace_id?: string;
  year?: number | null;
  funding?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface UpdatePersonnelInput {
  name?: string;
  role?: PersonnelRole;
  year?: number | null;
  funding?: string | null;
  email?: string | null;
  last_meeting?: string | null;
  notes?: string | null;
}

// Query keys
export const personnelKeys = {
  all: ["personnel"] as const,
  list: (filters?: { workspace_id?: string; role?: string }) =>
    [...personnelKeys.all, "list", filters] as const,
  detail: (id: string) => [...personnelKeys.all, "detail", id] as const,
};

// Fetch personnel list
async function fetchPersonnel(filters?: {
  workspace_id?: string;
  role?: string;
}): Promise<PersonnelFromAPI[]> {
  const params = new URLSearchParams();
  if (filters?.workspace_id) params.set("workspace_id", filters.workspace_id);
  if (filters?.role) params.set("role", filters.role);

  const url = `/api/personnel${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch personnel");
  }

  return response.json();
}

// Fetch single personnel
async function fetchPersonnelById(id: string): Promise<PersonnelFromAPI> {
  const response = await fetch(`/api/personnel/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch personnel");
  }

  return response.json();
}

// Create personnel
async function createPersonnel(
  input: CreatePersonnelInput
): Promise<PersonnelFromAPI> {
  const response = await fetch("/api/personnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create personnel");
  }

  return response.json();
}

// Update personnel
async function updatePersonnel({
  id,
  ...input
}: UpdatePersonnelInput & { id: string }): Promise<PersonnelFromAPI> {
  const response = await fetch(`/api/personnel/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update personnel");
  }

  return response.json();
}

// Delete personnel
async function deletePersonnel(id: string): Promise<void> {
  const response = await fetch(`/api/personnel/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete personnel");
  }
}

// Hook: Get personnel list
export function usePersonnel(filters?: {
  workspace_id?: string;
  role?: string;
}) {
  return useQuery({
    queryKey: personnelKeys.list(filters),
    queryFn: () => fetchPersonnel(filters),
  });
}

// Hook: Get single personnel
export function usePersonnelById(id: string | undefined) {
  return useQuery({
    queryKey: personnelKeys.detail(id!),
    queryFn: () => fetchPersonnelById(id!),
    enabled: !!id,
  });
}

// Hook: Create personnel
export function useCreatePersonnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPersonnel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personnelKeys.all });
    },
  });
}

// Hook: Update personnel
export function useUpdatePersonnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePersonnel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: personnelKeys.all });
      queryClient.invalidateQueries({ queryKey: personnelKeys.detail(data.id) });
    },
  });
}

// Hook: Delete personnel
export function useDeletePersonnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePersonnel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personnelKeys.all });
    },
  });
}

// Hook: Update last meeting
export function useUpdateLastMeeting() {
  const updatePersonnel = useUpdatePersonnel();

  return {
    ...updatePersonnel,
    mutate: (id: string) =>
      updatePersonnel.mutate({
        id,
        last_meeting: new Date().toISOString(),
      }),
    mutateAsync: (id: string) =>
      updatePersonnel.mutateAsync({
        id,
        last_meeting: new Date().toISOString(),
      }),
  };
}

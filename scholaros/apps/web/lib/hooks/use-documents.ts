"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Document {
  id: string;
  workspace_id: string | null;
  user_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  extracted_text: string | null;
  page_count: number | null;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  extraction_type: string;
  model_used: string;
  prompt_version: string | null;
  extracted_data: Record<string, unknown>;
  confidence_score: number | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_corrections: Record<string, unknown> | null;
  created_at: string;
}

export interface DocumentWithRelations extends Document {
  document_extractions: DocumentExtraction[];
  grant_documents: Array<{
    id: string;
    document_type: string;
    funding_opportunities: Record<string, unknown> | null;
  }>;
  personnel_documents: Array<{
    id: string;
    document_type: string;
    personnel: Record<string, unknown> | null;
  }>;
}

export interface UploadDocumentInput {
  file: File;
  workspace_id?: string;
  description?: string;
  tags?: string[];
}

export interface ProcessDocumentInput {
  extraction_type:
    | "grant_opportunity"
    | "grant_application"
    | "cv_resume"
    | "budget"
    | "timeline"
    | "tasks"
    | "general";
  context?: string;
}

export interface ProcessDocumentResult {
  success: boolean;
  extraction: DocumentExtraction;
  data: Record<string, unknown>;
}

// Query keys
export const documentKeys = {
  all: ["documents"] as const,
  list: (filters?: { workspace_id?: string }) =>
    [...documentKeys.all, "list", filters] as const,
  detail: (id: string) => [...documentKeys.all, "detail", id] as const,
};

// API functions
async function fetchDocuments(filters?: {
  workspace_id?: string;
}): Promise<Document[]> {
  const params = new URLSearchParams();
  if (filters?.workspace_id) params.set("workspace_id", filters.workspace_id);

  const url = `/api/documents${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch documents");
  }

  return response.json();
}

async function fetchDocumentById(id: string): Promise<DocumentWithRelations> {
  const response = await fetch(`/api/documents/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch document");
  }

  return response.json();
}

async function uploadDocument(input: UploadDocumentInput): Promise<Document> {
  const formData = new FormData();
  formData.append("file", input.file);

  if (input.workspace_id) {
    formData.append("workspace_id", input.workspace_id);
  }
  if (input.description) {
    formData.append("description", input.description);
  }
  if (input.tags && input.tags.length > 0) {
    formData.append("tags", JSON.stringify(input.tags));
  }

  const response = await fetch("/api/documents", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload document");
  }

  return response.json();
}

async function processDocument(
  id: string,
  input: ProcessDocumentInput
): Promise<ProcessDocumentResult> {
  const response = await fetch(`/api/documents/${id}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to process document");
  }

  return response.json();
}

async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete document");
  }
}

// Hooks

export function useDocuments(filters?: { workspace_id?: string }) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => fetchDocuments(filters),
  });
}

export function useDocumentById(id: string | undefined) {
  return useQuery({
    queryKey: documentKeys.detail(id!),
    queryFn: () => fetchDocumentById(id!),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useProcessDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: ProcessDocumentInput & { id: string }) =>
      processDocument(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to get file type label
export function getFileTypeLabel(mimeType: string): string {
  const typeMap: Record<string, string> = {
    "application/pdf": "PDF",
    "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word",
    "text/plain": "Text",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
  };
  return typeMap[mimeType] || "File";
}

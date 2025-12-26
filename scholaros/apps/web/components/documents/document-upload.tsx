"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  File,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  useUploadDocument,
  formatFileSize,
  getFileTypeLabel,
} from "@/lib/hooks/use-documents";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface DocumentUploadProps {
  workspaceId?: string;
  onUploadComplete?: (documentId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function DocumentUpload({
  workspaceId,
  onUploadComplete,
  onCancel,
  className = "",
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = useUploadDocument();

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload a PDF, Word document, or text file.";
    }
    if (file.size > MAX_SIZE) {
      return "File is too large. Maximum size is 50MB.";
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const result = await uploadDocument.mutateAsync({
        file: selectedFile,
        workspace_id: workspaceId,
        description: description || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      });

      onUploadComplete?.(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setDescription("");
    setTags("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
        } ${selectedFile ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleInputChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center gap-3">
            <File className="h-10 w-10 text-green-600" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {getFileTypeLabel(selectedFile.type)} •{" "}
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="rounded p-1 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-1 text-sm font-medium">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, or Text files up to 50MB
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Metadata fields */}
      {selectedFile && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Tags (optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="grant, NSF, 2024 (comma-separated)"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm hover:bg-muted"
            disabled={uploadDocument.isPending}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploadDocument.isPending}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {uploadDocument.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : uploadDocument.isSuccess ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Uploaded
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload
            </>
          )}
        </button>
      </div>
    </div>
  );
}

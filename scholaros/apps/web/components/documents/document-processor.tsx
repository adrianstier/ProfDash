"use client";

import { useState } from "react";
import {
  Brain,
  FileText,
  Users,
  DollarSign,
  Calendar,
  CheckSquare,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useProcessDocument,
  type Document,
  type ProcessDocumentInput,
} from "@/lib/hooks/use-documents";

const EXTRACTION_TYPES: Array<{
  value: ProcessDocumentInput["extraction_type"];
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "grant_opportunity",
    label: "Grant/RFP",
    description: "Extract grant details, deadlines, funding amounts",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: "grant_application",
    label: "Grant Application",
    description: "Parse submitted applications, aims, budget",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    value: "cv_resume",
    label: "CV/Resume",
    description: "Extract education, publications, experience",
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: "budget",
    label: "Budget",
    description: "Parse financial information and categories",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Extract milestones and project phases",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    value: "tasks",
    label: "Tasks",
    description: "Extract action items and to-dos",
    icon: <CheckSquare className="h-5 w-5" />,
  },
  {
    value: "general",
    label: "General",
    description: "Extract key information from any document",
    icon: <Sparkles className="h-5 w-5" />,
  },
];

interface DocumentProcessorProps {
  document: Document;
  onProcessed?: (data: Record<string, unknown>) => void;
  onClose?: () => void;
}

export function DocumentProcessor({
  document,
  onProcessed,
  onClose,
}: DocumentProcessorProps) {
  const [selectedType, setSelectedType] =
    useState<ProcessDocumentInput["extraction_type"]>("general");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const processDocument = useProcessDocument();

  const handleProcess = async () => {
    try {
      const response = await processDocument.mutateAsync({
        id: document.id,
        extraction_type: selectedType,
        context: context || undefined,
      });

      setResult(response.data);
      onProcessed?.(response.data);
    } catch (error) {
      console.error("Processing failed:", error);
    }
  };

  const toggleField = (field: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(field)) {
      newExpanded.delete(field);
    } else {
      newExpanded.add(field);
    }
    setExpandedFields(newExpanded);
  };

  const renderValue = (value: unknown, key: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">Not found</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">Empty</span>;
      }

      const isExpanded = expandedFields.has(key);
      const displayItems = isExpanded ? value : value.slice(0, 3);

      return (
        <div>
          <ul className="list-inside list-disc space-y-1">
            {displayItems.map((item, i) => (
              <li key={i} className="text-sm">
                {typeof item === "object"
                  ? JSON.stringify(item, null, 2)
                  : String(item)}
              </li>
            ))}
          </ul>
          {value.length > 3 && (
            <button
              onClick={() => toggleField(key)}
              className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Show {value.length - 3}{" "}
                  more
                </>
              )}
            </button>
          )}
        </div>
      );
    }

    if (typeof value === "object") {
      const isExpanded = expandedFields.has(key);
      const entries = Object.entries(value as Record<string, unknown>);

      return (
        <div>
          <button
            onClick={() => toggleField(key)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Expand ({entries.length}{" "}
                fields)
              </>
            )}
          </button>
          {isExpanded && (
            <div className="mt-2 rounded-md bg-muted/50 p-2">
              <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
            </div>
          )}
        </div>
      );
    }

    return <span className="text-sm">{String(value)}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Document Analysis</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Document info */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="font-medium">{document.original_filename}</p>
        <p className="text-sm text-muted-foreground">
          Status: {document.status}
          {document.page_count && ` • ${document.page_count} pages`}
        </p>
      </div>

      {!result ? (
        <>
          {/* Extraction type selection */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              What would you like to extract?
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXTRACTION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                    selectedType === type.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {type.icon}
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {type.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional context */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Additional context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add any context to help the AI understand the document better..."
              className="w-full rounded-md border bg-background px-3 py-2"
              rows={2}
            />
          </div>

          {/* Error */}
          {processDocument.isError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4" />
              {processDocument.error instanceof Error
                ? processDocument.error.message
                : "Processing failed"}
            </div>
          )}

          {/* Process button */}
          <button
            onClick={handleProcess}
            disabled={processDocument.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {processDocument.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing document...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Analyze with AI
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {/* Results */}
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Analysis Complete</span>
          </div>

          <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border p-4">
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="border-b pb-2 last:border-0">
                <p className="mb-1 text-sm font-medium capitalize text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </p>
                {renderValue(value, key)}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setResult(null)}
              className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Analyze Again
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

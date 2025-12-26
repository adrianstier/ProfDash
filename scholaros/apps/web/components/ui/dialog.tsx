"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  icon,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);

      // Focus the dialog
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 0);

      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full rounded-2xl border bg-card p-6 shadow-xl animate-scale-in",
          sizeClasses[size],
          "mx-4"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h2
                id="dialog-title"
                className="font-display text-lg font-semibold leading-tight"
              >
                {title}
              </h2>
              {description && (
                <p
                  id="dialog-description"
                  className="mt-1 text-sm text-muted-foreground"
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="sm" icon={icon}>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn-ghost"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 shadow-sm",
            variant === "destructive"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isLoading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Dialog>
  );
}

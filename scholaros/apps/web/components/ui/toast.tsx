"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Convenience methods
export function useToastActions() {
  const { addToast } = useToast();

  return {
    success: (title: string, description?: string) =>
      addToast({ type: "success", title, description }),
    error: (title: string, description?: string) =>
      addToast({ type: "error", title, description }),
    warning: (title: string, description?: string) =>
      addToast({ type: "warning", title, description }),
    info: (title: string, description?: string) =>
      addToast({ type: "info", title, description }),
  };
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} index={index} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  index: number;
}

function ToastItem({ toast, onRemove, index }: ToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const styles = {
    success: "border-green-200 bg-green-50/95 dark:border-green-800/50 dark:bg-green-950/90",
    error: "border-red-200 bg-red-50/95 dark:border-red-800/50 dark:bg-red-950/90",
    warning: "border-amber-200 bg-amber-50/95 dark:border-amber-800/50 dark:bg-amber-950/90",
    info: "border-blue-200 bg-blue-50/95 dark:border-blue-800/50 dark:bg-blue-950/90",
  };

  const iconBgStyles = {
    success: "bg-green-100 dark:bg-green-900/50",
    error: "bg-red-100 dark:bg-red-900/50",
    warning: "bg-amber-100 dark:bg-amber-900/50",
    info: "bg-blue-100 dark:bg-blue-900/50",
  };

  const iconStyles = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm animate-slide-down",
        styles[toast.type]
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      role="alert"
    >
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl shrink-0", iconBgStyles[toast.type])}>
        <Icon className={cn("h-4 w-4", iconStyles[toast.type])} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

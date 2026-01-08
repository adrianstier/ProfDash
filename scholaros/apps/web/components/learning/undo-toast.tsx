"use client";

/**
 * Undo Toast - Reversible Actions System
 *
 * Research Mapping:
 * - Issue #23: No Undo for Task Actions
 *   "Completing a task shows no 'Undo' option. Late adopters who misclick need easy reversal."
 * - Persona: Dr. Lisa Anderson (Late Adopter) - "Needs clear undo/help options"
 *
 * This component provides an undo system for task actions,
 * giving users confidence to interact without fear of mistakes.
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, X, Trash2, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UndoAction {
  id: string;
  type: "complete" | "delete" | "update";
  message: string;
  undoFn: () => Promise<void>;
  timestamp: number;
}

interface UndoContextType {
  addUndoAction: (action: Omit<UndoAction, "id" | "timestamp">) => void;
  clearAll: () => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

export function useUndoAction() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndoAction must be used within UndoProvider");
  }
  return context;
}

interface UndoProviderProps {
  children: React.ReactNode;
}

export function UndoProvider({ children }: UndoProviderProps) {
  const [actions, setActions] = useState<UndoAction[]>([]);

  const addUndoAction = useCallback((action: Omit<UndoAction, "id" | "timestamp">) => {
    const newAction: UndoAction = {
      ...action,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };

    setActions((prev) => [...prev, newAction]);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      setActions((prev) => prev.filter((a) => a.id !== newAction.id));
    }, 8000);
  }, []);

  const clearAll = useCallback(() => {
    setActions([]);
  }, []);

  const handleUndo = async (action: UndoAction) => {
    try {
      await action.undoFn();
      setActions((prev) => prev.filter((a) => a.id !== action.id));
    } catch (error) {
      console.error("Undo failed:", error);
    }
  };

  const handleDismiss = (actionId: string) => {
    setActions((prev) => prev.filter((a) => a.id !== actionId));
  };

  return (
    <UndoContext.Provider value={{ addUndoAction, clearAll }}>
      {children}

      {/* Undo toast stack */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {actions.map((action) => (
            <UndoToastItem
              key={action.id}
              action={action}
              onUndo={() => handleUndo(action)}
              onDismiss={() => handleDismiss(action.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </UndoContext.Provider>
  );
}

interface UndoToastItemProps {
  action: UndoAction;
  onUndo: () => void;
  onDismiss: () => void;
}

function UndoToastItem({ action, onUndo, onDismiss }: UndoToastItemProps) {
  const [progress, setProgress] = useState(100);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    const duration = 8000;
    const interval = 50;
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const handleUndo = async () => {
    setIsUndoing(true);
    await onUndo();
  };

  const icon = {
    complete: <CheckCircle className="h-4 w-4 text-green-500" />,
    delete: <Trash2 className="h-4 w-4 text-red-500" />,
    update: <Circle className="h-4 w-4 text-blue-500" />,
  }[action.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      className="relative w-80 overflow-hidden rounded-xl border bg-card shadow-lg"
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-primary/50"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{action.message}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click undo to reverse this action
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={isUndoing}
          className={cn(
            "mt-3 w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isUndoing
              ? "bg-muted text-muted-foreground cursor-wait"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {isUndoing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Undo2 className="h-4 w-4" />
              </motion.div>
              Undoing...
            </>
          ) : (
            <>
              <Undo2 className="h-4 w-4" />
              Undo
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// Standalone toast for simple use cases
interface UndoToastProps {
  message: string;
  onUndo: () => Promise<void>;
  onDismiss: () => void;
  type?: "complete" | "delete" | "update";
}

export function UndoToast({ message, onUndo, onDismiss, type = "complete" }: UndoToastProps) {
  const action: UndoAction = {
    id: "standalone",
    type,
    message,
    undoFn: onUndo,
    timestamp: Date.now(),
  };

  return (
    <UndoToastItem
      action={action}
      onUndo={onUndo}
      onDismiss={onDismiss}
    />
  );
}

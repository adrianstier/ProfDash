"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTaskStore } from "@/lib/stores/task-store";
import { useChatStore } from "@/lib/stores/chat-store";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: "navigation" | "tasks" | "chat" | "general";
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

// Check if user is typing in an input field
function isTypingInInput(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  const isEditable = activeElement.getAttribute("contenteditable") === "true";
  const isInput =
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    isEditable;

  return isInput;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;
  const router = useRouter();
  const { toggleSelectionMode, clearSelection } = useTaskStore();
  const { toggleChat, openChat } = useChatStore();
  const commandPaletteRef = useRef<(() => void) | null>(null);

  // Register command palette opener
  const registerCommandPalette = useCallback((opener: () => void) => {
    commandPaletteRef.current = opener;
  }, []);

  // Define shortcuts - memoized to prevent unnecessary re-renders
  const shortcuts = useMemo<KeyboardShortcut[]>(() => [
    // Navigation shortcuts
    {
      key: "g",
      description: "Go to Today",
      category: "navigation",
      action: () => router.push("/today"),
    },
    {
      key: "u",
      description: "Go to Upcoming",
      category: "navigation",
      action: () => router.push("/upcoming"),
    },
    {
      key: "b",
      description: "Go to Board",
      category: "navigation",
      action: () => router.push("/board"),
    },
    {
      key: "l",
      description: "Go to List",
      category: "navigation",
      action: () => router.push("/list"),
    },
    {
      key: "c",
      description: "Go to Calendar",
      category: "navigation",
      action: () => router.push("/calendar"),
    },
    {
      key: "p",
      description: "Go to Projects",
      category: "navigation",
      action: () => router.push("/projects"),
    },
    {
      key: "d",
      description: "Go to Grants",
      category: "navigation",
      action: () => router.push("/grants"),
    },

    // Task shortcuts
    {
      key: "n",
      description: "New Task (focus quick-add)",
      category: "tasks",
      action: () => {
        const quickAdd = document.querySelector<HTMLInputElement>(
          '[data-quick-add="true"]'
        );
        quickAdd?.focus();
      },
    },
    {
      key: "s",
      description: "Toggle Selection Mode",
      category: "tasks",
      action: () => toggleSelectionMode(),
    },
    {
      key: "Escape",
      description: "Clear Selection / Close Modal",
      category: "tasks",
      action: () => clearSelection(),
    },

    // Chat shortcuts
    {
      key: "m",
      description: "Toggle Chat",
      category: "chat",
      action: () => toggleChat(),
    },
    {
      key: "m",
      shift: true,
      description: "Open Chat",
      category: "chat",
      action: () => openChat(),
    },

    // General shortcuts
    {
      key: "k",
      meta: true,
      description: "Open Command Palette",
      category: "general",
      action: () => commandPaletteRef.current?.(),
    },
    {
      key: "k",
      ctrl: true,
      description: "Open Command Palette",
      category: "general",
      action: () => commandPaletteRef.current?.(),
    },
    {
      key: "/",
      description: "Focus Search",
      category: "general",
      action: () => {
        const search = document.querySelector<HTMLInputElement>(
          '[data-search="true"]'
        );
        search?.focus();
      },
    },
    {
      key: "?",
      shift: true,
      description: "Show Keyboard Shortcuts",
      category: "general",
      action: () => {
        // Dispatch custom event for shortcuts modal
        window.dispatchEvent(new CustomEvent("show-shortcuts-modal"));
      },
    },
  ], [router, toggleSelectionMode, clearSelection, toggleChat, openChat]);

  // Handle keydown
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      if (isTypingInInput() && event.key !== "Escape") {
        return;
      }

      // Find matching shortcut
      const shortcut = shortcuts.find((s) => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = s.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = s.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = s.alt ? event.altKey : !event.altKey;

        // Special handling for Cmd/Ctrl+K (allow either)
        if (s.key === "k" && (s.meta || s.ctrl)) {
          return keyMatch && (event.metaKey || event.ctrlKey);
        }

        return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [enabled, shortcuts]
  );

  // Set up event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    shortcuts,
    registerCommandPalette,
  };
}

// Hook for components to listen for shortcuts modal
export function useShortcutsModalListener(onShow: () => void) {
  useEffect(() => {
    const handler = () => onShow();
    window.addEventListener("show-shortcuts-modal", handler);
    return () => window.removeEventListener("show-shortcuts-modal", handler);
  }, [onShow]);
}

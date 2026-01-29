"use client";

import { useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useShortcutsModalListener, type KeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";

// Detect OS for key display
const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

interface ShortcutKeyProps {
  shortcut: KeyboardShortcut;
}

function ShortcutKey({ shortcut }: ShortcutKeyProps) {
  const keys: string[] = [];

  if (shortcut.ctrl) {
    keys.push(isMac ? "⌃" : "Ctrl");
  }
  if (shortcut.meta) {
    keys.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.alt) {
    keys.push(isMac ? "⌥" : "Alt");
  }
  if (shortcut.shift) {
    keys.push(isMac ? "⇧" : "Shift");
  }

  // Format the main key
  let mainKey = shortcut.key.toUpperCase();
  if (shortcut.key === "Escape") mainKey = "Esc";
  if (shortcut.key === "/") mainKey = "/";
  if (shortcut.key === "?") mainKey = "?";

  keys.push(mainKey);

  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className={cn(
            "inline-flex h-6 min-w-[24px] items-center justify-center rounded border",
            "bg-muted px-1.5 text-xs font-medium text-muted-foreground",
            "border-border shadow-sm"
          )}
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

interface ShortcutRowProps {
  shortcut: KeyboardShortcut;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{shortcut.description}</span>
      <ShortcutKey shortcut={shortcut} />
    </div>
  );
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: "g", description: "Go to Today", category: "navigation", action: () => {} },
  { key: "u", description: "Go to Upcoming", category: "navigation", action: () => {} },
  { key: "b", description: "Go to Board", category: "navigation", action: () => {} },
  { key: "l", description: "Go to List", category: "navigation", action: () => {} },
  { key: "c", description: "Go to Calendar", category: "navigation", action: () => {} },
  { key: "p", description: "Go to Projects", category: "navigation", action: () => {} },
  { key: "d", description: "Go to Grants", category: "navigation", action: () => {} },

  // Tasks
  { key: "n", description: "New Task (focus quick-add)", category: "tasks", action: () => {} },
  { key: "s", description: "Toggle Selection Mode", category: "tasks", action: () => {} },
  { key: "Escape", description: "Clear Selection / Close Modal", category: "tasks", action: () => {} },

  // Chat
  { key: "m", description: "Toggle Chat", category: "chat", action: () => {} },
  { key: "m", shift: true, description: "Open Chat Panel", category: "chat", action: () => {} },

  // General
  { key: "k", meta: true, description: "Open Command Palette", category: "general", action: () => {} },
  { key: "/", description: "Focus Search", category: "general", action: () => {} },
  { key: "?", shift: true, description: "Show Keyboard Shortcuts", category: "general", action: () => {} },
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  // Listen for the custom event to show the modal
  useShortcutsModalListener(() => setOpen(true));

  const navigationShortcuts = SHORTCUTS.filter((s) => s.category === "navigation");
  const taskShortcuts = SHORTCUTS.filter((s) => s.category === "tasks");
  const chatShortcuts = SHORTCUTS.filter((s) => s.category === "chat");
  const generalShortcuts = SHORTCUTS.filter((s) => s.category === "general");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="sr-only">
            List of available keyboard shortcuts organized by category
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4" role="region" aria-label="Keyboard shortcuts reference">
          {/* Navigation */}
          <section aria-labelledby="nav-shortcuts-heading">
            <h3 id="nav-shortcuts-heading" className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Navigation
            </h3>
            <div className="space-y-1 divide-y" role="list">
              {navigationShortcuts.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </section>

          {/* Tasks */}
          <section aria-labelledby="task-shortcuts-heading">
            <h3 id="task-shortcuts-heading" className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Tasks
            </h3>
            <div className="space-y-1 divide-y" role="list">
              {taskShortcuts.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </section>

          {/* Chat */}
          <section aria-labelledby="chat-shortcuts-heading">
            <h3 id="chat-shortcuts-heading" className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Chat
            </h3>
            <div className="space-y-1 divide-y" role="list">
              {chatShortcuts.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </section>

          {/* General */}
          <section aria-labelledby="general-shortcuts-heading">
            <h3 id="general-shortcuts-heading" className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              General
            </h3>
            <div className="space-y-1 divide-y" role="list">
              {generalShortcuts.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs" aria-label="question mark">?</kbd> anywhere to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keyboard shortcuts button for UI
export function KeyboardShortcutsButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 text-muted-foreground"
      onClick={() => window.dispatchEvent(new CustomEvent("show-shortcuts-modal"))}
    >
      <Keyboard className="h-4 w-4" />
      <span className="hidden md:inline">Shortcuts</span>
      <kbd className="hidden md:inline-flex h-5 min-w-[20px] items-center justify-center rounded border bg-muted px-1 text-[10px] font-medium">
        ?
      </kbd>
    </Button>
  );
}

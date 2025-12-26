"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/lib/stores/agent-store";

/**
 * Keyboard shortcut handler for the Agent Chat.
 *
 * Shortcuts:
 * - Cmd/Ctrl + K: Toggle agent chat
 * - Escape: Close agent chat (when open)
 */
export function AgentKeyboardShortcut() {
  const { isOpen, openChat, closeChat, toggleChat } = useAgentStore();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K to toggle chat
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        // Don't trigger if user is typing in an input
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        event.preventDefault();
        toggleChat();
      }

      // Escape to close chat
      if (event.key === "Escape" && isOpen) {
        // Don't close if user is in a modal or dropdown
        const hasOpenModal = document.querySelector("[role='dialog']");
        if (!hasOpenModal) {
          closeChat();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openChat, closeChat, toggleChat]);

  return null;
}

export default AgentKeyboardShortcut;

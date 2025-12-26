"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  FileText,
  ChevronDown,
  ClipboardPaste,
  Bot,
  ListChecks,
  Target,
} from "lucide-react";
import { ExtractTasksModal } from "./extract-tasks-modal";
import { ExtractTasksFromDocumentModal } from "./extract-tasks-from-document";
import { useAgentStore } from "@/lib/stores/agent-store";

export function AIQuickActions() {
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { openChat, selectAgent } = useAgentStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAgentAction = (agentType: "task" | "planner" | null) => {
    if (agentType) {
      selectAgent(agentType);
    }
    openChat();
    setShowDropdown(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900"
        >
          <Sparkles className="h-4 w-4" />
          AI Actions
          <ChevronDown className="h-4 w-4" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border bg-card shadow-lg">
            {/* Extract Section */}
            <div className="border-b px-3 py-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Extract Tasks
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={() => {
                  setShowExtractModal(true);
                  setShowDropdown(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">From Text</p>
                  <p className="text-xs text-muted-foreground">
                    Paste meeting notes, emails
                  </p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowDocumentModal(true);
                  setShowDropdown(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">From Document</p>
                  <p className="text-xs text-muted-foreground">
                    Upload PDF, Word, text files
                  </p>
                </div>
              </button>
            </div>

            {/* AI Agents Section */}
            <div className="border-t border-b px-3 py-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                AI Agents
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={() => handleAgentAction("task")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <ListChecks className="h-4 w-4 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium">Task Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    Prioritize, schedule, organize
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleAgentAction("planner")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <Target className="h-4 w-4 text-cyan-500" />
                <div className="text-left">
                  <p className="font-medium">Planning Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    Goals, weekly planning
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleAgentAction(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <Bot className="h-4 w-4 text-purple-500" />
                <div className="text-left">
                  <p className="font-medium">Ask Anything</p>
                  <p className="text-xs text-muted-foreground">
                    General AI assistant
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <ExtractTasksModal
        isOpen={showExtractModal}
        onClose={() => setShowExtractModal(false)}
      />

      <ExtractTasksFromDocumentModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
      />
    </>
  );
}

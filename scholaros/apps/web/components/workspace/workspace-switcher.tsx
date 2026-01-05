"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const { currentWorkspaceId, setCurrentWorkspace } = useWorkspaceStore();

  // Find current workspace or default to first
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId && workspaces[0]) {
      setCurrentWorkspace(workspaces[0].id, workspaces[0].role);
    }
  }, [workspaces, currentWorkspaceId, setCurrentWorkspace]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/50 px-3.5 py-2.5">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Link
        href="/settings/workspace/new"
        className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/50 px-3.5 py-2.5 text-sm text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/5"
      >
        <Plus className="h-4 w-4" />
        Create Workspace
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-card px-3.5 py-2.5 text-left transition-all",
          isOpen
            ? "border-primary/50 shadow-sm ring-2 ring-primary/20"
            : "border-border/50 hover:border-border hover:bg-accent/50"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {currentWorkspace?.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-sm font-medium">{currentWorkspace?.name}</span>
        </div>
        <ChevronsUpDown className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[220px] rounded-xl border border-border/50 bg-popover p-1.5 shadow-xl animate-slide-down"
          role="listbox"
        >
          <div className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Workspaces
          </div>
          <div className="space-y-0.5">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  setCurrentWorkspace(workspace.id, workspace.role);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all",
                  workspace.id === currentWorkspaceId
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
                role="option"
                aria-selected={workspace.id === currentWorkspaceId}
              >
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                  workspace.id === currentWorkspaceId
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                )}>
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-left">{workspace.name}</span>
                {workspace.id === currentWorkspaceId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
          <div className="my-1.5 border-t border-border/50" />
          <div className="space-y-0.5">
            <Link
              href="/settings/workspace"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Workspace Settings
            </Link>
            <Link
              href="/settings/workspace/new"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Create Workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

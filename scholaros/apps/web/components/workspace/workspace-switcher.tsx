"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import Link from "next/link";

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const { currentWorkspaceId, setCurrentWorkspace } = useWorkspaceStore();

  // Find current workspace or default to first
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  // Auto-select first workspace if none selected
  if (workspaces.length > 0 && !currentWorkspaceId && currentWorkspace) {
    setCurrentWorkspace(currentWorkspace.id, currentWorkspace.role);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <div className="h-6 w-6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Link
        href="/settings/workspace/new"
        className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Create Workspace
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-left hover:bg-accent"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
            {currentWorkspace?.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-sm font-medium">{currentWorkspace?.name}</span>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[200px] rounded-md border bg-popover p-1 shadow-md">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Workspaces
            </div>
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  setCurrentWorkspace(workspace.id, workspace.role);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-left">{workspace.name}</span>
                {workspace.id === currentWorkspaceId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
            <div className="my-1 border-t" />
            <Link
              href="/settings/workspace"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Workspace Settings
            </Link>
            <Link
              href="/settings/workspace/new"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Create Workspace
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { AgentChat } from "@/components/ai/agent-chat";
import { AgentKeyboardShortcut } from "@/components/ai/agent-keyboard-shortcut";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <>
      {children}
      <TaskDetailDrawer />
      {/* AI Agent Chat - floating interface */}
      <AgentChat />
      {/* Keyboard shortcut handler for agent chat */}
      <AgentKeyboardShortcut />
    </>
  );
}

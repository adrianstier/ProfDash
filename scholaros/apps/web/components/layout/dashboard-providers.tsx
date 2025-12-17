"use client";

import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <>
      {children}
      <TaskDetailDrawer />
    </>
  );
}

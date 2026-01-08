"use client";

import { useMutation } from "@tanstack/react-query";
import type { SmartParseResult } from "@scholaros/shared";

// Smart parse natural language to structured task
export function useSmartParse() {
  return useMutation({
    mutationFn: async ({
      text,
      workspaceId,
    }: {
      text: string;
      workspaceId: string;
    }) => {
      const response = await fetch("/api/ai/smart-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          workspace_id: workspaceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse task");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to parse task");
      }

      return result.result as SmartParseResult;
    },
  });
}

// Helper to format parsed task for display
export function formatParsedTask(result: SmartParseResult): string {
  const { main_task, subtasks, summary } = result;

  let formatted = `**${main_task.title}**`;

  if (main_task.description) {
    formatted += `\n${main_task.description}`;
  }

  if (subtasks.length > 0) {
    formatted += "\n\nSubtasks:";
    subtasks.forEach((subtask, i) => {
      formatted += `\n${i + 1}. ${subtask.text}`;
    });
  }

  if (summary) {
    formatted += `\n\n_${summary}_`;
  }

  return formatted;
}

// Helper to convert parsed result to task creation payload
export function parsedResultToTask(
  result: SmartParseResult,
  workspaceId: string
): {
  title: string;
  description?: string;
  category: string;
  priority: string;
  due?: string;
  workspace_id: string;
  assignees?: string[];
  project_id?: string;
} {
  const { main_task } = result;

  return {
    title: main_task.title,
    description: main_task.description,
    category: main_task.category || "misc",
    priority: main_task.priority,
    due: main_task.due_date,
    workspace_id: workspaceId,
    project_id: main_task.project_id,
  };
}

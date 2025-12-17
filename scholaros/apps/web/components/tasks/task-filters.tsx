"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  X,
  ChevronDown,
} from "lucide-react";
import type { TaskCategory, TaskPriority, TaskStatus } from "@scholaros/shared";
import { useTaskStore } from "@/lib/stores/task-store";

const statusOptions: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "todo", label: "To Do" },
  { value: "progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const priorityOptions: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "p1", label: "P1 - Urgent" },
  { value: "p2", label: "P2 - High" },
  { value: "p3", label: "P3 - Medium" },
  { value: "p4", label: "P4 - Low" },
];

const categoryOptions: { value: TaskCategory | "all"; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "research", label: "Research" },
  { value: "teaching", label: "Teaching" },
  { value: "grants", label: "Grants" },
  { value: "admin", label: "Admin" },
  { value: "grad-mentorship", label: "Graduate Mentorship" },
  { value: "undergrad-mentorship", label: "Undergrad Mentorship" },
  { value: "misc", label: "Miscellaneous" },
];

const sortOptions: { value: "priority" | "due" | "created_at" | "title"; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due Date" },
  { value: "created_at", label: "Created Date" },
  { value: "title", label: "Title" },
];

export function TaskFilters() {
  const { filters, sortBy, sortDirection, setFilter, clearFilters, setSort } = useTaskStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.status !== null ||
    filters.priority !== null ||
    filters.category !== null ||
    filters.search !== "";

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.category,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Search and Quick Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {filters.search && (
            <button
              onClick={() => setFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            hasActiveFilters
              ? "border-primary bg-primary/10 text-primary"
              : "hover:bg-muted"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Sort Controls */}
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSort(e.target.value as typeof sortBy, sortDirection)}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort by {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSort(sortBy, sortDirection === "asc" ? "desc" : "asc")}
            className="rounded-md border p-2 hover:bg-muted"
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
          >
            {sortDirection === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="flex flex-wrap gap-3 rounded-md border bg-muted/30 p-3">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={filters.status || "all"}
              onChange={(e) =>
                setFilter("status", e.target.value === "all" ? null : (e.target.value as TaskStatus))
              }
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <select
              value={filters.priority || "all"}
              onChange={(e) =>
                setFilter("priority", e.target.value === "all" ? null : (e.target.value as TaskPriority))
              }
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select
              value={filters.category || "all"}
              onChange={(e) =>
                setFilter("category", e.target.value === "all" ? null : (e.target.value as TaskCategory))
              }
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

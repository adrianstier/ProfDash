"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  X,
  ChevronDown,
  Circle,
  Clock,
  CheckCircle2,
  Flag,
  Tag,
} from "lucide-react";
import type { TaskCategory, TaskPriority, TaskStatus } from "@scholaros/shared";
import { useTaskStore } from "@/lib/stores/task-store";
import { cn } from "@/lib/utils";

const statusOptions: { value: TaskStatus | "all"; label: string; icon: typeof Circle; color: string }[] = [
  { value: "all", label: "All", icon: Circle, color: "text-muted-foreground" },
  { value: "todo", label: "To Do", icon: Circle, color: "text-slate-500" },
  { value: "progress", label: "In Progress", icon: Clock, color: "text-blue-500" },
  { value: "done", label: "Done", icon: CheckCircle2, color: "text-green-500" },
];

const priorityOptions: { value: TaskPriority | "all"; label: string; color: string }[] = [
  { value: "all", label: "All", color: "text-muted-foreground" },
  { value: "p1", label: "Urgent", color: "text-priority-p1" },
  { value: "p2", label: "High", color: "text-priority-p2" },
  { value: "p3", label: "Medium", color: "text-priority-p3" },
  { value: "p4", label: "Low", color: "text-muted-foreground" },
];

const categoryOptions: { value: TaskCategory | "all"; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "research", label: "Research" },
  { value: "teaching", label: "Teaching" },
  { value: "grants", label: "Grants" },
  { value: "admin", label: "Admin" },
  { value: "grad-mentorship", label: "Graduate" },
  { value: "undergrad-mentorship", label: "Undergrad" },
  { value: "misc", label: "Misc" },
];

const sortOptions: { value: "priority" | "due" | "created_at" | "title"; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due Date" },
  { value: "created_at", label: "Created" },
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
    <div className="space-y-4">
      {/* Search and Quick Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="input-base pl-11 pr-10"
          />
          {filters.search && (
            <button
              onClick={() => setFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
            hasActiveFilters || isExpanded
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "hover:bg-muted hover:border-border"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </button>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSort(e.target.value as typeof sortBy, sortDirection)}
            className="input-base py-2.5 pr-10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSort(sortBy, sortDirection === "asc" ? "desc" : "asc")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200",
              "hover:bg-muted hover:border-border"
            )}
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
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="rounded-2xl border bg-card p-5 space-y-5 animate-slide-down">
          {/* Status Filter */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Circle className="h-4 w-4" />
              Status
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = filters.status === opt.value || (opt.value === "all" && !filters.status);
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter("status", opt.value === "all" ? null : opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", !isActive && opt.color)} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Flag className="h-4 w-4" />
              Priority
            </div>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((opt) => {
                const isActive = filters.priority === opt.value || (opt.value === "all" && !filters.priority);
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter("priority", opt.value === "all" ? null : opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {opt.value !== "all" && (
                      <Flag className={cn("h-3.5 w-3.5", !isActive && opt.color)} />
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="h-4 w-4" />
              Category
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((opt) => {
                const isActive = filters.category === opt.value || (opt.value === "all" && !filters.category);
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter("category", opt.value === "all" ? null : opt.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

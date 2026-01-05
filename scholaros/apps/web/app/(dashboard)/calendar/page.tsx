"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  Loader2,
  Settings,
  Plus,
  X,
  ChevronDown,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { useTasks, useCreateTask, type TaskFromAPI } from "@/lib/hooks/use-tasks";
import {
  useCalendarConnection,
  useCalendarEvents,
  type CalendarEventFromAPI,
} from "@/lib/hooks/use-calendar";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToastActions } from "@/components/ui/toast";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Unified event type for calendar display
interface CalendarDisplayEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  color: string;
  bgColor: string;
  textColor: string;
  type: "task" | "calendar-event";
  allDay?: boolean;
  status?: string;
  priority?: string;
  category?: string;
}

// Helper to get task color based on priority
function getTaskColor(priority?: string): { color: string; bgColor: string; textColor: string } {
  switch (priority) {
    case "p1":
      return {
        color: "bg-priority-p1",
        bgColor: "bg-priority-p1-light",
        textColor: "text-priority-p1",
      };
    case "p2":
      return {
        color: "bg-priority-p2",
        bgColor: "bg-priority-p2-light",
        textColor: "text-priority-p2",
      };
    case "p3":
      return {
        color: "bg-primary",
        bgColor: "bg-primary/10",
        textColor: "text-primary",
      };
    case "p4":
      return {
        color: "bg-muted-foreground",
        bgColor: "bg-muted",
        textColor: "text-muted-foreground",
      };
    default:
      return {
        color: "bg-primary",
        bgColor: "bg-primary/10",
        textColor: "text-primary",
      };
  }
}

// Quick add modal for creating tasks
function QuickAddModal({
  date,
  onClose,
  workspaceId,
}: {
  date: Date;
  onClose: () => void;
  workspaceId: string | null;
}) {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();
  const toast = useToastActions();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        due: date.toISOString().split("T")[0],
        status: "todo",
        priority: "p3",
        category: "misc",
        workspace_id: workspaceId,
        description: null,
        project_id: null,
        assignees: [],
        tags: [],
      });
      toast.success("Task created");
      onClose();
    } catch {
      toast.error("Failed to create task");
    }
  };

  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Add Task</h3>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="input-base"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!title.trim() || createTask.isPending}
              className="btn-primary flex-1 py-2.5"
            >
              {createTask.isPending ? "Adding..." : "Add Task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost px-4 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Event popover to show all events on a date
function EventPopover({
  date,
  events,
  onClose,
  onAddTask,
}: {
  date: Date;
  events: CalendarDisplayEvent[];
  onClose: () => void;
  onAddTask: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      ref={popoverRef}
      className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-2xl border bg-card shadow-xl animate-scale-in"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">{formattedDate}</span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 scrollbar-hide">
        {events.length === 0 ? (
          <div className="py-6 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No events on this date</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                  event.bgColor,
                  event.type === "task" && event.status === "done" && "opacity-50"
                )}
              >
                {event.type === "task" ? (
                  event.status === "done" ? (
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", event.textColor)} />
                  ) : (
                    <CheckSquare className={cn("h-4 w-4 shrink-0", event.textColor)} />
                  )
                ) : (
                  <CalendarIcon className="h-4 w-4 shrink-0 text-purple-500" />
                )}
                <span
                  className={cn(
                    "truncate font-medium",
                    event.textColor,
                    event.type === "task" && event.status === "done" && "line-through"
                  )}
                >
                  {event.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t p-3">
        <button
          onClick={onAddTask}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTasks, setShowTasks] = useState(true);
  const [showCalendarEvents, setShowCalendarEvents] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [popoverDate, setPopoverDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate date range for the current month view (including overflow days)
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Calculate the actual start/end dates shown on the calendar
  const calendarStart = new Date(year, month, 1 - startingDayOfWeek);
  const calendarEnd = new Date(year, month + 1, 0);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useTasks({
    workspace_id: currentWorkspaceId,
  });

  // Fetch calendar connection status
  const { data: calendarConnection } = useCalendarConnection();

  // Fetch calendar events if connected
  const { data: calendarEvents, isLoading: eventsLoading } = useCalendarEvents({
    start: calendarStart.toISOString(),
    end: calendarEnd.toISOString(),
    enabled: calendarConnection?.connected && calendarConnection?.sync_enabled,
  });

  // Combine tasks and calendar events into unified display events
  const displayEvents = useMemo(() => {
    const events: CalendarDisplayEvent[] = [];

    // Add tasks with due dates
    if (showTasks && tasks) {
      tasks.forEach((task: TaskFromAPI) => {
        if (task.due) {
          const colors = getTaskColor(task.priority);
          events.push({
            id: `task-${task.id}`,
            title: task.title,
            date: new Date(task.due),
            color: colors.color,
            bgColor: colors.bgColor,
            textColor: colors.textColor,
            type: "task",
            status: task.status,
            priority: task.priority,
            category: task.category,
          });
        }
      });
    }

    // Add calendar events
    if (showCalendarEvents && calendarEvents) {
      calendarEvents.forEach((event: CalendarEventFromAPI) => {
        events.push({
          id: `cal-${event.id}`,
          title: event.summary || "Untitled Event",
          date: new Date(event.start_time),
          endDate: new Date(event.end_time),
          color: "bg-purple-500",
          bgColor: "bg-purple-500/10",
          textColor: "text-purple-600 dark:text-purple-400",
          type: "calendar-event",
          allDay: event.all_day,
        });
      });
    }

    return events;
  }, [tasks, calendarEvents, showTasks, showCalendarEvents]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date): CalendarDisplayEvent[] => {
    return displayEvents.filter(
      (event) => event.date.toDateString() === date.toDateString()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Generate calendar days
  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month days
  for (let i = 0; i < startingDayOfWeek; i++) {
    const day = new Date(year, month, -startingDayOfWeek + i + 1);
    calendarDays.push({ date: day, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const isLoading = tasksLoading || eventsLoading;

  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      setPopoverDate(date);
    } else {
      setQuickAddDate(date);
    }
  };

  const handleMoreClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setPopoverDate(date);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/5 via-primary/5 to-pink-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Calendar
              </h1>
              <p className="text-muted-foreground">
                View tasks and events by date
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="btn-ghost inline-flex items-center gap-2 w-fit"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </header>

      {/* Controls */}
      <section className="flex flex-wrap items-center gap-4 animate-fade-in stagger-1">
        {/* Filter toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTasks(!showTasks)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              showTasks
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "hover:bg-muted hover:border-border"
            )}
          >
            <CheckSquare className="h-4 w-4" />
            Tasks
          </button>
          <button
            onClick={() => setShowCalendarEvents(!showCalendarEvents)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              showCalendarEvents
                ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm"
                : "hover:bg-muted hover:border-border"
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar Events
          </button>
        </div>

        {/* Connection Status */}
        {calendarConnection?.connected ? (
          <div className="flex items-center gap-2 rounded-xl bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Google Calendar connected
          </div>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link2 className="h-4 w-4" />
            Connect Google Calendar
          </Link>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}
      </section>

      {/* Calendar Navigation */}
      <section className="flex items-center justify-between animate-fade-in stagger-2">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-2xl font-semibold">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-muted transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Collapsible Legend */}
      <section className="animate-fade-in stagger-3">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              showLegend && "rotate-180"
            )}
          />
          {showLegend ? "Hide" : "Show"} legend
        </button>
        {showLegend && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border bg-card/50 p-4 text-sm animate-slide-down">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-md bg-priority-p1" />
              <span>P1 (Urgent)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-md bg-priority-p2" />
              <span>P2 (High)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-md bg-primary" />
              <span>P3 (Medium)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-md bg-muted-foreground" />
              <span>P4 (Low)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-md bg-purple-500" />
              <span>Calendar Event</span>
            </div>
          </div>
        )}
      </section>

      {/* Calendar Grid */}
      <section className="rounded-2xl border bg-card overflow-hidden animate-fade-in stagger-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-sm font-semibold text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const events = getEventsForDate(date);
            const today = isToday(date);
            const isPopoverOpen =
              popoverDate?.toDateString() === date.toDateString();

            return (
              <div
                key={index}
                className={cn(
                  "group relative min-h-28 border-b border-r p-2 transition-colors cursor-pointer",
                  !isCurrentMonth ? "bg-muted/20 hover:bg-muted/30" : "hover:bg-muted/50",
                  index % 7 === 6 && "border-r-0",
                  index >= 35 && "border-b-0",
                  today && "bg-primary/5"
                )}
                onClick={() => handleDateClick(date)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleDateClick(date);
                  }
                }}
              >
                {/* Date number and add button */}
                <div className="mb-2 flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold transition-all",
                      today && "bg-primary text-primary-foreground shadow-sm",
                      !today && !isCurrentMonth && "text-muted-foreground"
                    )}
                  >
                    {date.getDate()}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickAddDate(date);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg opacity-0 transition-all hover:bg-primary/10 group-hover:opacity-100"
                    aria-label={`Add task on ${date.toLocaleDateString()}`}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {events.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center gap-1.5 truncate rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                        event.bgColor,
                        event.textColor,
                        event.type === "task" &&
                          event.status === "done" &&
                          "opacity-50 line-through"
                      )}
                      title={`${event.title}${event.type === "task" ? " (Task)" : " (Event)"}`}
                    >
                      {event.type === "task" ? (
                        event.status === "done" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : (
                          <CheckSquare className="h-3 w-3 shrink-0" />
                        )
                      ) : (
                        <CalendarIcon className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                  {events.length > 2 && (
                    <button
                      onClick={(e) => handleMoreClick(date, e)}
                      className="w-full px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                    >
                      +{events.length - 2} more
                    </button>
                  )}
                </div>

                {/* Event popover */}
                {isPopoverOpen && (
                  <EventPopover
                    date={date}
                    events={events}
                    onClose={() => setPopoverDate(null)}
                    onAddTask={() => {
                      setPopoverDate(null);
                      setQuickAddDate(date);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick add modal */}
      {quickAddDate && (
        <QuickAddModal
          date={quickAddDate}
          onClose={() => setQuickAddDate(null)}
          workspaceId={currentWorkspaceId}
        />
      )}
    </div>
  );
}

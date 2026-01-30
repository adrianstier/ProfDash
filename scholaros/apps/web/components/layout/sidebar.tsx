"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { useTasks } from "@/lib/hooks/use-tasks";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  FileText,
  GraduationCap,
  Kanban,
  LayoutList,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Sunrise,
  Target,
  Users,
  Wallet,
  Command,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useAgentStore } from "@/lib/stores/agent-store";
import { useTaskStore } from "@/lib/stores/task-store";
import { OnlineUsersList } from "@/components/presence/user-presence-indicator";
import { FocusModeToggle } from "@/components/tasks/focus-mode-toggle";

// Mobile bottom nav items
const MOBILE_NAV_ITEMS = [
  { label: "Today", href: "/today", icon: Sunrise },
  { label: "Board", href: "/board", icon: Kanban },
  { label: "Projects", href: "/projects", icon: FileText },
  { label: "Calendar", href: "/calendar", icon: Calendar },
] as const;

interface SidebarProps {
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "today" | "overdue" | "upcoming";
}

interface NavSection {
  label: string;
  items: NavItem[];
  defaultExpanded?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Tasks",
    defaultExpanded: true,
    items: [
      { label: "Today", href: "/today", icon: Sunrise, badgeKey: "today" },
      { label: "Upcoming", href: "/upcoming", icon: Clock, badgeKey: "upcoming" },
      { label: "Board", href: "/board", icon: Kanban },
      { label: "List", href: "/list", icon: LayoutList },
      { label: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "Research",
    defaultExpanded: true,
    items: [
      { label: "Projects", href: "/projects", icon: FileText },
      { label: "Publications", href: "/publications", icon: BookOpen },
      { label: "Grants", href: "/grants", icon: Wallet },
    ],
  },
  {
    label: "Lab",
    defaultExpanded: false,
    items: [
      { label: "Personnel", href: "/personnel", icon: Users },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Teaching",
    defaultExpanded: false,
    items: [
      { label: "Courses", href: "/teaching", icon: GraduationCap },
    ],
  },
];

// Navigation sections visible in focus mode
const FOCUS_MODE_SECTIONS = new Set(["Tasks"]);
const FOCUS_MODE_ITEMS = new Set(["Today", "Board", "Projects"]);

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: tasks = [] } = useTasks();
  const { openChat, isOpen: isAgentChatOpen } = useAgentStore();
  const focusMode = useTaskStore((state) => state.focusMode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize expanded sections from NAV_SECTIONS defaults
  const [expandedSections, setExpandedSections] = useState<string[]>(() =>
    NAV_SECTIONS.filter((s) => s.defaultExpanded).map((s) => s.label)
  );

  // Calculate badge counts - memoized to avoid recomputing on every render
  const badgeCounts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;

    // Single pass through tasks array for better performance
    for (const task of tasks) {
      if (task.status === "done") continue;
      if (!task.due) continue;

      if (task.due === today) {
        todayCount++;
      } else if (task.due < today) {
        overdueCount++;
      } else {
        upcomingCount++;
      }
    }

    return {
      today: todayCount + overdueCount,
      overdue: overdueCount,
      upcoming: Math.min(upcomingCount, 99),
    } as Record<string, number>;
  }, [tasks]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label)
        ? prev.filter((s) => s !== label)
        : [...prev, label]
    );
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
    {/* Desktop Sidebar - Hidden on mobile */}
    <aside
      className={cn(
        "hidden sm:flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-out",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 transition-opacity duration-200",
            isCollapsed && "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Scholar<span className="text-primary">OS</span>
          </span>
        </Link>

        {/* Collapse button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
            isCollapsed && "absolute left-1/2 -translate-x-1/2"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Workspace Switcher */}
      {!isCollapsed && (
        <div className="px-3 pt-4 animate-fade-in">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 pt-3 animate-fade-in">
          <button
            className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-sm text-muted-foreground transition-all hover:bg-background hover:border-border hover:shadow-sm"
            aria-label="Search. Press forward slash to open"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground" aria-hidden="true">
              /
            </kbd>
          </button>
        </div>
      )}

      {/* AI Assistant Button */}
      <div className={cn("px-3 pt-3", isCollapsed && "pt-4")}>
        <button
          onClick={() => openChat()}
          className={cn(
            "group relative flex w-full items-center overflow-hidden rounded-xl transition-all duration-200",
            isAgentChatOpen
              ? "bg-primary/10 text-primary shadow-sm"
              : "bg-gradient-to-r from-primary/5 via-primary/10 to-amber-500/5 border border-primary/20 text-foreground hover:border-primary/40 hover:shadow-md",
            isCollapsed ? "justify-center p-3" : "gap-2.5 px-3.5 py-2.5"
          )}
          aria-label="Open AI Assistant. Press Cmd+K"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-amber-500 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium">AI Assistant</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground" aria-hidden="true">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Focus Mode Toggle */}
      {!isCollapsed && (
        <div className="px-3 pt-3 animate-fade-in">
          <FocusModeToggle showLabel className="w-full justify-start" />
        </div>
      )}
      {isCollapsed && (
        <div className="flex justify-center pt-3">
          <FocusModeToggle />
        </div>
      )}

      {/* Focus Mode Indicator */}
      {focusMode && !isCollapsed && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 animate-fade-in">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Focus Mode Active</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-hide" aria-label="Main menu">
        {NAV_SECTIONS.filter((section) => {
          // In focus mode, only show Tasks section and Projects from Research
          if (!focusMode) return true;
          return FOCUS_MODE_SECTIONS.has(section.label) || section.items.some((item) => FOCUS_MODE_ITEMS.has(item.label));
        }).map((section, sectionIndex) => {
          // Filter items within sections when in focus mode
          const visibleItems = focusMode
            ? section.items.filter((item) => FOCUS_MODE_ITEMS.has(item.label))
            : section.items;

          if (visibleItems.length === 0) return null;

          return (
          <div
            key={section.label}
            className={cn("animate-fade-in", sectionIndex > 0 && "mt-6")}
            style={{ animationDelay: `${sectionIndex * 50}ms` }}
          >
            {!isCollapsed && (
              <button
                onClick={() => toggleSection(section.label)}
                className="group flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                aria-expanded={expandedSections.includes(section.label)}
                aria-controls={`nav-section-${section.label.toLowerCase()}`}
              >
                {section.label}
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    expandedSections.includes(section.label) && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>
            )}

            {(isCollapsed || expandedSections.includes(section.label)) && (
              <ul
                className={cn("mt-1 space-y-0.5", !isCollapsed && "animate-slide-down")}
                id={`nav-section-${section.label.toLowerCase()}`}
                role="list"
              >
                {visibleItems.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                  const hasOverdue = item.badgeKey === "today" && badgeCounts.overdue > 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                          isActive
                            ? "nav-active-glow text-primary font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          isCollapsed && "justify-center px-0"
                        )}
                        aria-current={isActive ? "page" : undefined}
                        style={{ animationDelay: `${(sectionIndex * 50) + (itemIndex * 30)}ms` }}
                      >
                        {/* Active indicator with glow */}
                        {isActive && (
                          <>
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary shadow-sm" style={{ boxShadow: '2px 0 8px hsl(var(--primary) / 0.3)' }} />
                            <div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none" />
                          </>
                        )}

                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-150",
                            isActive && "scale-110"
                          )}
                          aria-hidden="true"
                        />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {badgeCount > 0 && (
                              <span
                                className={cn(
                                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold transition-colors",
                                  hasOverdue
                                    ? "bg-priority-p1-light text-priority-p1"
                                    : "bg-muted text-muted-foreground"
                                )}
                                aria-label={`${badgeCount} ${item.label.toLowerCase()} tasks`}
                              >
                                {badgeCount}
                              </span>
                            )}
                          </>
                        )}

                        {/* Tooltip for collapsed state - improved with animation */}
                        {isCollapsed && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50">
                            {/* Arrow */}
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-popover border-l border-b border-border rotate-45" />
                            {/* Tooltip content with entrance animation */}
                            <div className="relative px-3 py-2 rounded-lg bg-popover border shadow-lg text-sm font-medium whitespace-nowrap animate-tooltip">
                              {item.label}
                              {badgeCount > 0 && (
                                <span className={cn(
                                  "ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                                  hasOverdue
                                    ? "bg-priority-p1-light text-priority-p1"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {badgeCount}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          );
        })}
      </nav>

      {/* Online users */}
      {!isCollapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border animate-fade-in">
          <OnlineUsersList maxVisible={4} className="justify-start" />
        </div>
      )}

      {/* User section */}
      <div className="border-t border-sidebar-border p-3" role="region" aria-label="User account">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 rounded-xl p-2 mb-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20 text-sm font-semibold text-primary ring-2 ring-primary/10"
                aria-hidden="true"
              >
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.user_metadata?.full_name || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex gap-1.5">
              {!focusMode && (
                <Link
                  href="/settings"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-medium">Settings</span>
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Sign out of your account"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium">Sign out</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20 text-sm font-semibold text-primary ring-2 ring-primary/10"
              aria-hidden="true"
            >
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <Link
                href="/settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={handleSignOut}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* Mobile Bottom Navigation */}
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-sidebar-border bg-sidebar safe-area-inset-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[64px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {/* More button to open full sidebar overlay */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[64px]",
            isMobileMenuOpen
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Open full menu"
          aria-expanded={isMobileMenuOpen}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>

    {/* Mobile Menu Overlay */}
    {isMobileMenuOpen && (
      <>
        {/* Backdrop */}
        <div
          className="sm:hidden fixed inset-0 z-50 bg-black/50 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {/* Slide-up panel */}
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl border-t bg-sidebar animate-slide-up overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-base font-semibold tracking-tight">
                Scholar<span className="text-primary">OS</span>
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <div className="px-4 py-3 border-b">
            <WorkspaceSwitcher />
          </div>

          {/* AI Assistant Button */}
          <div className="px-4 py-3 border-b">
            <button
              onClick={() => {
                openChat();
                setIsMobileMenuOpen(false);
              }}
              className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-amber-500/5 border border-primary/20 px-3.5 py-2.5 text-foreground hover:border-primary/40"
            >
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-amber-500 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="flex-1 text-left text-sm font-medium">AI Assistant</span>
            </button>
          </div>

          {/* Scrollable Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="mb-4">
                <h3 className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </h3>
                <ul className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                    const hasOverdue = item.badgeKey === "today" && badgeCounts.overdue > 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {badgeCount > 0 && (
                            <span
                              className={cn(
                                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                                hasOverdue
                                  ? "bg-priority-p1-light text-priority-p1"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {badgeCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* User section */}
          <div className="border-t px-4 py-3 mb-safe">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20 text-sm font-semibold text-primary ring-2 ring-primary/10"
              >
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.user_metadata?.full_name || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs font-medium">Settings</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-xs font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  );
}

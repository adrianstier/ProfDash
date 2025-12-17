"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  GraduationCap,
  Kanban,
  LayoutList,
  LogOut,
  Search,
  Settings,
  Sunrise,
  Users,
  Wallet,
} from "lucide-react";

interface SidebarProps {
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Tasks",
    items: [
      { label: "Today", href: "/today", icon: Sunrise },
      { label: "Upcoming", href: "/upcoming", icon: CalendarDays },
      { label: "Board", href: "/board", icon: Kanban },
      { label: "List", href: "/list", icon: LayoutList },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Projects", href: "/projects", icon: FileText },
      { label: "Grants", href: "/grants", icon: Wallet },
    ],
  },
  {
    label: "Lab",
    items: [
      { label: "Personnel", href: "/personnel", icon: Users },
    ],
  },
  {
    label: "Teaching",
    items: [
      { label: "Courses", href: "/teaching", icon: GraduationCap },
    ],
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Tasks",
    "Research",
    "Lab",
    "Teaching",
  ]);

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
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CheckSquare className="h-5 w-5 text-primary" />
          <span>
            Scholar<span className="text-primary">OS</span>
          </span>
        </Link>
      </div>

      {/* Workspace Switcher */}
      <div className="px-3 pt-3">
        <WorkspaceSwitcher />
      </div>

      {/* Search */}
      <div className="p-3">
        <button className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-auto rounded bg-muted px-1.5 text-xs">/</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <button
              onClick={() => toggleSection(section.label)}
              className="flex w-full items-center justify-between px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {section.label}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  expandedSections.includes(section.label) && "rotate-180"
                )}
              />
            </button>
            {expandedSections.includes(section.label) && (
              <ul className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">
              {user.user_metadata?.full_name || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          <Link
            href="/settings"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

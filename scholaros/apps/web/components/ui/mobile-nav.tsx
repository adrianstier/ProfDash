"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Sunrise,
  Kanban,
  LayoutList,
  Calendar,
  FileText,
  Wallet,
  Users,
  GraduationCap,
  Settings,
  CheckSquare,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      { label: "Upcoming", href: "/upcoming", icon: Clock },
      { label: "Board", href: "/board", icon: Kanban },
      { label: "List", href: "/list", icon: LayoutList },
      { label: "Calendar", href: "/calendar", icon: Calendar },
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
    items: [{ label: "Personnel", href: "/personnel", icon: Users }],
  },
  {
    label: "Teaching",
    items: [{ label: "Courses", href: "/teaching", icon: GraduationCap }],
  },
];

// Bottom navigation for mobile - most common actions
const BOTTOM_NAV: NavItem[] = [
  { label: "Today", href: "/today", icon: Sunrise },
  { label: "Board", href: "/board", icon: Kanban },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Projects", href: "/projects", icon: FileText },
];

interface MobileNavProps {
  children?: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/95 backdrop-blur-sm px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <CheckSquare className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="font-display font-semibold text-lg">
            Scholar<span className="text-primary">OS</span>
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-all duration-200"
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Slide-out Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <nav
            className="fixed inset-y-0 left-0 z-50 w-80 bg-card shadow-2xl md:hidden animate-slide-right"
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="flex h-16 items-center justify-between border-b px-5">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <CheckSquare className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">
                  Scholar<span className="text-primary">OS</span>
                </span>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-all duration-200"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto p-5 h-[calc(100vh-4rem)]">
              {NAV_SECTIONS.map((section, sectionIndex) => (
                <div key={section.label} className={cn("mb-6", sectionIndex > 0 && "pt-2")}>
                  <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {/* Settings */}
              <div className="border-t pt-5">
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    pathname === "/settings"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </div>
            </div>
          </nav>
        </>
      )}

      {/* Page Content */}
      {children}

      {/* Bottom Tab Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm md:hidden safe-area-pb"
        role="navigation"
        aria-label="Quick navigation"
      >
        <ul className="flex h-18 items-center justify-around px-2">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                    isActive && "bg-primary/10"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setIsOpen(true)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] text-muted-foreground"
              aria-label="More navigation options"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg">
                <Menu className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

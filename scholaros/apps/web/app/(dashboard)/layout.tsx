import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardProviders } from "@/components/layout/dashboard-providers";
import { SkipLink } from "@/components/accessibility";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Skip link for keyboard navigation - WCAG 2.1 AA */}
      <SkipLink targetId="main-content" />

      {/* Sidebar navigation */}
      <Sidebar user={user} />

      {/* Main content area */}
      <main
        id="main-content"
        className="flex-1 overflow-auto bg-surface-2/50"
        role="main"
        aria-label="Main content"
        tabIndex={-1}
      >
        <div className="min-h-full">
          {/* Subtle grid pattern overlay */}
          <div className="fixed inset-0 pointer-events-none dot-pattern opacity-30 dark:opacity-20" />

          {/* Content container */}
          <div className="relative px-6 py-8 lg:px-8 xl:px-10">
            <div className="mx-auto max-w-7xl">
              <DashboardProviders>{children}</DashboardProviders>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

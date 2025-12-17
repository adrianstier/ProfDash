import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <main className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Scholar<span className="text-primary">OS</span>
        </h1>
        <p className="max-w-2xl text-center text-lg text-muted-foreground">
          An AI-native academic operations dashboard for professors, lab
          managers, and research teams. Manage tasks, manuscripts, grants,
          people, and calendars—all in one place.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Get Started
          </Link>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            title="Task Management"
            description="Todoist-style quick add, Kanban boards, and calendar views"
          />
          <FeatureCard
            title="Grant Discovery"
            description="Search Grants.gov, NIH, and NSF opportunities with AI-powered fit scoring"
          />
          <FeatureCard
            title="Team Collaboration"
            description="Multi-tenant workspaces with role-based permissions"
          />
          <FeatureCard
            title="AI Copilots"
            description="Extract tasks, summarize projects, and draft grant outlines"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

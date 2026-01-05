import Link from "next/link";
import {
  GraduationCap,
  CheckSquare,
  Wallet,
  Users,
  Sparkles,
  BookOpen,
  FlaskConical,
  Lightbulb,
  ArrowRight,
  Calendar,
  FileText,
  Target,
} from "lucide-react";

// Floating icons for the background animation
const floatingIcons = [
  { Icon: BookOpen, delay: "0s", duration: "20s", left: "5%", top: "15%" },
  { Icon: FlaskConical, delay: "2s", duration: "25s", left: "85%", top: "10%" },
  { Icon: GraduationCap, delay: "4s", duration: "22s", left: "10%", top: "75%" },
  { Icon: Lightbulb, delay: "1s", duration: "28s", left: "80%", top: "70%" },
  { Icon: Sparkles, delay: "3s", duration: "24s", left: "45%", top: "85%" },
  { Icon: Target, delay: "5s", duration: "26s", left: "70%", top: "40%" },
];

const features = [
  {
    icon: CheckSquare,
    title: "Task Management",
    description: "Todoist-style quick add, Kanban boards, and calendar views for academic workflows",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    icon: Wallet,
    title: "Grant Discovery",
    description: "Search Grants.gov, NIH, and NSF opportunities with AI-powered fit scoring",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Multi-tenant workspaces with role-based permissions for your lab",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    icon: Sparkles,
    title: "AI Copilots",
    description: "Extract tasks, summarize projects, and draft grant outlines automatically",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
];

const stats = [
  { value: "10K+", label: "Researchers" },
  { value: "500+", label: "Institutions" },
  { value: "1M+", label: "Tasks tracked" },
];

// Institutional logos (placeholder names - would be actual logos)
const trustedBy = [
  "Stanford",
  "MIT",
  "Harvard",
  "Berkeley",
  "Oxford",
  "Cambridge",
];

// Testimonials for social proof
const testimonials = [
  {
    quote: "ScholarOS transformed how I manage my lab. Everything from grants to student mentorship is now in one place.",
    author: "Dr. Sarah Chen",
    title: "Professor of Biology",
    institution: "Stanford University",
  },
  {
    quote: "The AI grant matching saved me weeks of searching. Found funding opportunities I never would have discovered.",
    author: "Dr. Michael Torres",
    title: "Associate Professor",
    institution: "MIT",
  },
  {
    quote: "Finally, a tool that understands academic workflows. My entire research group now uses ScholarOS.",
    author: "Dr. Emily Watson",
    title: "Department Chair",
    institution: "UC Berkeley",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-surface-2 to-accent/20">
      {/* Animated background pattern */}
      <div className="absolute inset-0 dot-pattern opacity-40" />

      {/* Floating academic icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map(({ Icon, delay, duration, left, top }, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-[0.06]"
            style={{
              left,
              top,
              animationDelay: delay,
              animationDuration: duration,
            }}
          >
            <Icon className="h-20 w-20 text-primary" />
          </div>
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <header className="relative z-10 w-full border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-semibold tracking-tight">
              Scholar<span className="text-primary">OS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn-primary inline-flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section - Balanced layout */}
      <main className="relative z-10 flex-1">
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered academic productivity
            </div>

            {/* Headline - More balanced sizing */}
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              Your academic
              <br />
              <span className="text-primary">command center.</span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              An AI-native operations dashboard for professors, lab managers, and
              research teams. Manage tasks, manuscripts, grants, people, and
              calendars—all in one intelligent workspace.
            </p>

            {/* CTA buttons - Better hierarchy */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="btn-primary btn-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all"
              >
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="btn-outline btn-lg"
              >
                <Calendar className="h-4 w-4" />
                Learn More
              </a>
            </div>

            {/* Stats - More compact */}
            <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12 border-t border-border/50 pt-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center animate-fade-in" style={{ animationDelay: `${(i + 1) * 100}ms` }}>
                  <p className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Trusted by institutions */}
            <div className="mt-10 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider font-medium">
                Trusted by researchers at
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                {trustedBy.map((institution, i) => (
                  <span
                    key={i}
                    className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
                  >
                    {institution}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 pb-24 scroll-mt-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center animate-fade-in">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything you need to
                <br />
                <span className="text-primary">accelerate your research</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Purpose-built tools for academic workflows, from task management to grant discovery
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, i) => (
                <FeatureCard key={i} {...feature} delay={i * 100} />
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container mx-auto px-4 pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center animate-fade-in">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Loved by researchers
                <br />
                <span className="text-primary">worldwide</span>
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-card hover:shadow-lg animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Quote mark */}
                  <div className="absolute top-4 right-4 text-4xl text-primary/10 font-serif">&ldquo;</div>

                  <p className="relative text-sm text-muted-foreground leading-relaxed mb-4">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 text-sm font-semibold text-primary">
                      {testimonial.author.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.title}, {testimonial.institution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/50 bg-gradient-to-br from-card/30 via-primary/5 to-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-20">
            <div className="mx-auto max-w-3xl text-center animate-fade-in">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to transform your workflow?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of researchers who have streamlined their academic operations with ScholarOS.
              </p>
              <Link
                href="/signup"
                className="btn-primary mt-8 inline-flex items-center gap-2 px-8 py-3 text-base shadow-lg shadow-primary/25"
              >
                Get Started for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">ScholarOS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for the academic community.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  bgColor,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  delay: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-card hover:shadow-lg animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${bgColor} transition-transform group-hover:scale-110`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

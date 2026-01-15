"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepWelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

export function StepWelcome({ onNext, onSkip }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo / Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
        <Sparkles className="h-10 w-10 text-primary-foreground" />
      </div>

      {/* Title */}
      <h1 className="mt-8 text-3xl font-bold tracking-tight">
        Welcome to ScholarOS
      </h1>

      {/* Description */}
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Your AI-powered academic productivity platform. Let&apos;s get you set up in
        just a few steps.
      </p>

      {/* Features Preview */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Smart Task Management"
          description="Organize research, teaching, and administrative tasks"
        />
        <FeatureCard
          title="Project Tracking"
          description="Track manuscripts, grants, and publications"
        />
        <FeatureCard
          title="AI-Powered Insights"
          description="Get intelligent suggestions and summaries"
        />
      </div>

      {/* Actions */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onNext} className="gap-2">
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="lg" onClick={onSkip}>
          Skip Setup
        </Button>
      </div>

      {/* Time estimate */}
      <p className="mt-4 text-xs text-muted-foreground">
        Takes about 2 minutes to complete
      </p>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

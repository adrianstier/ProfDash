"use client";

import { PartyPopper, ArrowRight, Sparkles, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
// cn available for conditional styling if needed

interface StepCompletionProps {
  onComplete: () => void;
}

export function StepCompletion({ onComplete }: StepCompletionProps) {
  return (
    <div className="w-full max-w-lg text-center">
      {/* Celebration Icon */}
      <div className="relative mx-auto h-24 w-24">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
          <PartyPopper className="h-12 w-12 text-primary-foreground" />
        </div>
      </div>

      {/* Title */}
      <h2 className="mt-8 text-3xl font-bold tracking-tight">
        You&apos;re All Set!
      </h2>

      {/* Description */}
      <p className="mt-4 text-lg text-muted-foreground">
        Welcome to ScholarOS. You&apos;re ready to take control of your academic
        productivity.
      </p>

      {/* Quick Tips */}
      <div className="mt-10 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          QUICK TIPS TO GET STARTED
        </h3>
        <div className="grid gap-3 text-left">
          <QuickTip
            icon={Zap}
            title="Press Q"
            description="to quickly add tasks from anywhere"
          />
          <QuickTip
            icon={Sparkles}
            title="Press ⌘K"
            description="to search tasks, projects, and navigate"
          />
          <QuickTip
            icon={BookOpen}
            title="Explore Projects"
            description="to track your manuscripts and grants"
          />
        </div>
      </div>

      {/* CTA */}
      <Button size="lg" onClick={onComplete} className="mt-10 gap-2">
        Go to Dashboard
        <ArrowRight className="h-4 w-4" />
      </Button>

      {/* Confetti animation placeholder */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Add confetti animation here if desired */}
      </div>
    </div>
  );
}

interface QuickTipProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function QuickTip({ icon: Icon, title, description }: QuickTipProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

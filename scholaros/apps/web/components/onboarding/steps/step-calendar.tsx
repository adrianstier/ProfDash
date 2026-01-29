"use client";

import { useState } from "react";
import { Calendar, ArrowRight, ArrowLeft, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
// cn available for conditional styling if needed
import { useOnboardingInteraction } from "@/lib/hooks/use-onboarding";

interface StepCalendarProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepCalendar({ onNext, onBack }: StepCalendarProps) {
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const recordInteraction = useOnboardingInteraction();

  const handleConnectCalendar = async () => {
    setIsConnecting(true);
    recordInteraction();

    // In a real implementation, this would trigger the Google OAuth flow
    // For now, we'll simulate a delay
    setTimeout(() => {
      setCalendarConnected(true);
      setIsConnecting(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Calendar className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Connect Your Calendar
        </h2>
        <p className="mt-2 text-muted-foreground">
          Sync your Google Calendar to see events alongside tasks
        </p>
      </div>

      {/* Content */}
      <div className="mt-8">
        {calendarConnected ? (
          <div className="rounded-2xl border bg-green-500/5 border-green-500/20 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Calendar Connected!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your Google Calendar is now synced with ScholarOS.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Benefits */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold">Why connect your calendar?</h3>
              <ul className="mt-4 space-y-3">
                <BenefitItem text="See meetings and events in your task views" />
                <BenefitItem text="Block time for focused work automatically" />
                <BenefitItem text="Get smart scheduling suggestions" />
                <BenefitItem text="Never miss a deadline or meeting" />
              </ul>
            </div>

            {/* Google Connect Button */}
            <Button
              onClick={handleConnectCalendar}
              disabled={isConnecting}
              variant="outline"
              className="w-full gap-3 h-14 text-base"
            >
              <GoogleIcon />
              {isConnecting ? "Connecting..." : "Connect Google Calendar"}
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>

            {/* Privacy Note */}
            <p className="text-center text-xs text-muted-foreground">
              We only read your calendar events. We never modify or share your
              calendar data.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          {calendarConnected ? "Continue" : "Skip for Now"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {!calendarConnected && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can connect your calendar anytime from Settings
        </p>
      )}
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-3 w-3 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground">{text}</span>
    </li>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

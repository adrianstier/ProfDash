"use client";

import { useState } from "react";
import { User, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingInteraction } from "@/lib/hooks/use-onboarding";

interface StepProfileProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepProfile({ onNext, onBack }: StepProfileProps) {
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const recordInteraction = useOnboardingInteraction();

  const roles = [
    { id: "faculty", label: "Faculty", icon: "🎓" },
    { id: "postdoc", label: "Postdoc", icon: "🔬" },
    { id: "grad-student", label: "Graduate Student", icon: "📚" },
    { id: "lab-manager", label: "Lab Manager", icon: "🧪" },
    { id: "researcher", label: "Researcher", icon: "📊" },
    { id: "other", label: "Other", icon: "👤" },
  ];

  const canProceed = fullName.trim().length > 0;

  const handleFieldChange = () => {
    recordInteraction();
  };

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Complete Your Profile
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tell us a bit about yourself to personalize your experience
        </p>
      </div>

      {/* Form */}
      <div className="mt-8 space-y-6">
        {/* Full Name */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              handleFieldChange();
            }}
            placeholder="Dr. Jane Smith"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Institution */}
        <div className="space-y-2">
          <label htmlFor="institution" className="text-sm font-medium">
            Institution
          </label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="institution"
              type="text"
              value={institution}
              onChange={(e) => {
                setInstitution(e.target.value);
                handleFieldChange();
              }}
              placeholder="University of Example"
              className="w-full rounded-xl border bg-background pl-11 pr-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Your Role</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id);
                  handleFieldChange();
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-3 transition-all",
                  role === r.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:bg-muted"
                )}
              >
                <span className="text-xl">{r.icon}</span>
                <span className="text-xs font-medium">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Skip note */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        You can update these details later in Settings
      </p>
    </div>
  );
}

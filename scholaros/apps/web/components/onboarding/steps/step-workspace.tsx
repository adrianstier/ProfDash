"use client";

import { useState } from "react";
import { Users, ArrowRight, ArrowLeft, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingInteraction } from "@/lib/hooks/use-onboarding";

interface StepWorkspaceProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepWorkspace({ onNext, onBack }: StepWorkspaceProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<"personal" | "team">("personal");
  const recordInteraction = useOnboardingInteraction();

  const canProceed = workspaceName.trim().length > 0;

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Create Your Workspace
        </h2>
        <p className="mt-2 text-muted-foreground">
          A workspace organizes your tasks, projects, and team members
        </p>
      </div>

      {/* Form */}
      <div className="mt-8 space-y-6">
        {/* Workspace Name */}
        <div className="space-y-2">
          <label htmlFor="workspaceName" className="text-sm font-medium">
            Workspace Name <span className="text-destructive">*</span>
          </label>
          <input
            id="workspaceName"
            type="text"
            value={workspaceName}
            onChange={(e) => {
              setWorkspaceName(e.target.value);
              recordInteraction();
            }}
            placeholder="e.g., Smith Lab, My Research"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground">
            This can be your lab name, research group, or personal workspace
          </p>
        </div>

        {/* Workspace Type */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Workspace Type</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceTypeCard
              type="personal"
              icon={Lock}
              title="Personal"
              description="Just for you. Perfect for individual research and task management."
              isSelected={workspaceType === "personal"}
              onSelect={() => {
                setWorkspaceType("personal");
                recordInteraction();
              }}
            />
            <WorkspaceTypeCard
              type="team"
              icon={Globe}
              title="Team"
              description="Collaborate with lab members, students, or research partners."
              isSelected={workspaceType === "team"}
              onSelect={() => {
                setWorkspaceType("team");
                recordInteraction();
              }}
            />
          </div>
        </div>

        {/* Team workspace info */}
        {workspaceType === "team" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium">Team Workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You&apos;ll be able to invite team members after setup. As the owner,
              you&apos;ll have full control over permissions and access.
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
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface WorkspaceTypeCardProps {
  type: "personal" | "team";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

function WorkspaceTypeCard({
  icon: Icon,
  title,
  description,
  isSelected,
  onSelect,
}: WorkspaceTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "hover:bg-muted"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          isSelected ? "bg-primary/10" : "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            isSelected ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

"use client";

import { useState } from "react";
import {
  Plus,
  Users,
  MoreHorizontal,
  Mail,
  Calendar,
  Loader2,
  X,
  Trash2,
  Edit,
  CheckCircle,
  Upload,
  GraduationCap,
  Briefcase,
  BookOpen,
  UserCheck,
  Clock,
} from "lucide-react";
import type { PersonnelRole } from "@scholaros/shared";
import {
  usePersonnel,
  useCreatePersonnel,
  useDeletePersonnel,
  useUpdateLastMeeting,
  type PersonnelFromAPI,
  type CreatePersonnelInput,
} from "@/lib/hooks/use-personnel";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { CVImportModal } from "@/components/personnel/cv-import-modal";
import { VoiceInputInline } from "@/components/voice";
import { cn } from "@/lib/utils";

const roleConfig: Record<PersonnelRole, { color: string; bgColor: string; icon: typeof GraduationCap }> = {
  "phd-student": {
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    icon: GraduationCap,
  },
  postdoc: {
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Briefcase,
  },
  undergrad: {
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: BookOpen,
  },
  staff: {
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: Briefcase,
  },
  collaborator: {
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    icon: UserCheck,
  },
};

const roleLabels: Record<PersonnelRole, string> = {
  "phd-student": "PhD Student",
  postdoc: "Postdoc",
  undergrad: "Undergrad",
  staff: "Staff",
  collaborator: "Collaborator",
};

const roleOptions: PersonnelRole[] = [
  "phd-student",
  "postdoc",
  "undergrad",
  "staff",
  "collaborator",
];

function formatLastMeeting(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const days = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function getDaysSinceLastMeeting(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePersonnelInput) => void;
  isLoading: boolean;
}

function AddPersonModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: AddPersonModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<PersonnelRole>("phd-student");
  const [year, setYear] = useState("");
  const [email, setEmail] = useState("");
  const [funding, setFunding] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      role,
      year: year ? parseInt(year, 10) : null,
      email: email || null,
      funding: funding || null,
      notes: notes || null,
    });
  };

  const handleClose = () => {
    setName("");
    setRole("phd-student");
    setYear("");
    setEmail("");
    setFunding("");
    setNotes("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Add Person</h2>
            <p className="text-sm text-muted-foreground">Add a new team member</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder="Full name"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Role <span className="text-destructive">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as PersonnelRole)}
              className="input-base"
              disabled={isLoading}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="input-base"
                placeholder="e.g., 3"
                min="1"
                max="10"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="email@example.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Funding</label>
            <input
              type="text"
              value={funding}
              onChange={(e) => setFunding(e.target.value)}
              className="input-base"
              placeholder="e.g., NSF Fellowship"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Notes</label>
              <VoiceInputInline
                onTranscription={(text) => setNotes((prev) => prev ? `${prev} ${text}` : text)}
                disabled={isLoading}
              />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-base min-h-[80px] resize-none"
              placeholder="Research focus, projects, etc."
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn-ghost"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-2"
              disabled={isLoading || !name}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Person
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PersonnelPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: personnel = [], isLoading } = usePersonnel({
    workspace_id: currentWorkspaceId ?? undefined,
  });
  const createPersonnel = useCreatePersonnel();
  const deletePersonnel = useDeletePersonnel();
  const updateLastMeeting = useUpdateLastMeeting();

  const [filterRole, setFilterRole] = useState<PersonnelRole | "all">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredPersonnel =
    filterRole === "all"
      ? personnel
      : personnel.filter((p) => p.role === filterRole);

  const needsMeeting = personnel.filter((p) => {
    return getDaysSinceLastMeeting(p.last_meeting) >= 7;
  });

  const handleAddPerson = async (data: CreatePersonnelInput) => {
    try {
      await createPersonnel.mutateAsync({
        ...data,
        workspace_id: currentWorkspaceId ?? undefined,
      });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to add person:", error);
    }
  };

  const handleDelete = async (person: PersonnelFromAPI) => {
    if (!confirm(`Delete "${person.name}"? This cannot be undone.`)) return;
    try {
      await deletePersonnel.mutateAsync(person.id);
    } catch (error) {
      console.error("Failed to delete person:", error);
    }
  };

  const handleMarkMet = async (person: PersonnelFromAPI) => {
    try {
      await updateLastMeeting.mutateAsync(person.id);
      setMenuOpen(null);
    } catch (error) {
      console.error("Failed to update meeting:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading personnel...</p>
      </div>
    );
  }

  const statCards = [
    {
      key: "total",
      label: "Total Members",
      value: personnel.length,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "phd",
      label: "PhD Students",
      value: personnel.filter((p) => p.role === "phd-student").length,
      icon: GraduationCap,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      key: "postdoc",
      label: "Postdocs",
      value: personnel.filter((p) => p.role === "postdoc").length,
      icon: Briefcase,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      key: "meeting",
      label: "Needs Meeting",
      value: needsMeeting.length,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/5 via-primary/5 to-blue-500/5 border border-border/50 p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Personnel
              </h1>
              <p className="text-muted-foreground">
                Manage lab members and collaborators
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import CV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Person
            </button>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fade-in stagger-1">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  stat.bgColor
                )}
                style={{ opacity: 0.3 }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-display font-semibold tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={cn("rounded-xl p-2.5", stat.bgColor)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Filter */}
      <section className="animate-fade-in stagger-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              "all",
              "phd-student",
              "postdoc",
              "undergrad",
              "staff",
              "collaborator",
            ] as const
          ).map((role) => {
            const isActive = filterRole === role;
            const config = role !== "all" ? roleConfig[role] : null;
            const Icon = config?.icon;
            return (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {Icon && <Icon className={cn("h-4 w-4", !isActive && config?.color)} />}
                {role === "all" ? "All" : roleLabels[role]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Personnel List */}
      <section className="space-y-4 animate-fade-in stagger-3">
        {filteredPersonnel.map((person, i) => {
          const daysSinceLastMeeting = getDaysSinceLastMeeting(person.last_meeting);
          const needsMeetingSoon = daysSinceLastMeeting >= 7;
          const config = roleConfig[person.role];
          const RoleIcon = config.icon;

          return (
            <div
              key={person.id}
              className="group rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-border animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold",
                  config.bgColor,
                  config.color
                )}>
                  {person.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base truncate">{person.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                          config.bgColor,
                          config.color
                        )}>
                          <RoleIcon className="h-3 w-3" />
                          {roleLabels[person.role]}
                        </span>
                        {person.year && (
                          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            Year {person.year}
                          </span>
                        )}
                        {person.funding && (
                          <span className="rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                            {person.funding}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setMenuOpen(menuOpen === person.id ? null : person.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl opacity-0 hover:bg-muted group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {menuOpen === person.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border bg-card p-1.5 shadow-xl animate-slide-down">
                            <button
                              onClick={() => handleMarkMet(person)}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Mark as Met
                            </button>
                            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <Edit className="h-4 w-4 text-muted-foreground" />
                              Edit
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={() => handleDelete(person)}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {person.notes && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {person.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    {person.email && (
                      <a
                        href={`mailto:${person.email}`}
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        {person.email}
                      </a>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        needsMeetingSoon
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                      Last met: {formatLastMeeting(person.last_meeting)}
                      {needsMeetingSoon && (
                        <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium">
                          Due
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPersonnel.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">No personnel yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add lab members to get started</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Person
            </button>
          </div>
        )}
      </section>

      <AddPersonModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddPerson}
        isLoading={createPersonnel.isPending}
      />

      <CVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        workspaceId={currentWorkspaceId ?? undefined}
        onPersonnelDataExtracted={async (data) => {
          // Create the personnel from extracted data
          try {
            await createPersonnel.mutateAsync({
              name: data.name,
              role: data.role || "collaborator",
              email: data.email,
              notes: data.notes,
              workspace_id: currentWorkspaceId ?? undefined,
            });
            setIsImportModalOpen(false);
          } catch (error) {
            console.error("Failed to create personnel:", error);
          }
        }}
      />
    </div>
  );
}

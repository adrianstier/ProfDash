"use client";

import { useState } from "react";
import { Plus, Users, MoreHorizontal, Mail, Calendar } from "lucide-react";
import type { Personnel, PersonnelRole } from "@scholaros/shared";

const roleColors: Record<PersonnelRole, string> = {
  "phd-student": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  postdoc: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  undergrad: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  staff: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  collaborator: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const roleLabels: Record<PersonnelRole, string> = {
  "phd-student": "PhD Student",
  postdoc: "Postdoc",
  undergrad: "Undergrad",
  staff: "Staff",
  collaborator: "Collaborator",
};

// Mock data
const mockPersonnel: Personnel[] = [
  {
    id: "1",
    user_id: "user-1",
    name: "Alice Chen",
    role: "phd-student",
    year: 3,
    funding: "NSF Fellowship",
    email: "alice@university.edu",
    last_meeting: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    notes: "Working on ML scheduling paper",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "2",
    user_id: "user-1",
    name: "Bob Martinez",
    role: "postdoc",
    funding: "NIH R01",
    email: "bob@university.edu",
    last_meeting: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "3",
    user_id: "user-1",
    name: "Carol Kim",
    role: "phd-student",
    year: 1,
    funding: "RA - DOE Grant",
    email: "carol@university.edu",
    last_meeting: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "4",
    user_id: "user-1",
    name: "David Lee",
    role: "undergrad",
    year: 4,
    email: "david@university.edu",
    notes: "Senior thesis on NLP",
    created_at: new Date(),
    updated_at: new Date(),
  },
];

function formatLastMeeting(date: Date | null | undefined): string {
  if (!date) return "Never";
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default function PersonnelPage() {
  const [personnel] = useState<Personnel[]>(mockPersonnel);
  const [filterRole, setFilterRole] = useState<PersonnelRole | "all">("all");

  const filteredPersonnel = filterRole === "all"
    ? personnel
    : personnel.filter(p => p.role === filterRole);

  const needsMeeting = personnel.filter(p => {
    if (!p.last_meeting) return true;
    const daysSince = Math.floor((Date.now() - p.last_meeting.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= 7;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personnel</h1>
          <p className="text-muted-foreground">
            Manage lab members and collaborators
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Person
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Members</p>
          <p className="text-2xl font-bold">{personnel.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">PhD Students</p>
          <p className="text-2xl font-bold">
            {personnel.filter(p => p.role === "phd-student").length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Postdocs</p>
          <p className="text-2xl font-bold">
            {personnel.filter(p => p.role === "postdoc").length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Needs Meeting</p>
          <p className="text-2xl font-bold text-orange-500">{needsMeeting.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "phd-student", "postdoc", "undergrad", "staff", "collaborator"] as const).map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filterRole === role
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {role === "all" ? "All" : roleLabels[role]}
          </button>
        ))}
      </div>

      {/* Personnel List */}
      <div className="space-y-3">
        {filteredPersonnel.map((person) => {
          const daysSinceLastMeeting = person.last_meeting
            ? Math.floor((Date.now() - person.last_meeting.getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;
          const needsMeetingSoon = daysSinceLastMeeting >= 7;

          return (
            <div
              key={person.id}
              className="group flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
                {person.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{person.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${roleColors[person.role]}`}>
                        {roleLabels[person.role]}
                      </span>
                      {person.year && (
                        <span className="text-xs text-muted-foreground">
                          Year {person.year}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                {person.funding && (
                  <p className="text-sm text-muted-foreground">
                    Funding: {person.funding}
                  </p>
                )}
                {person.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {person.notes}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {person.email && (
                    <a
                      href={`mailto:${person.email}`}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Mail className="h-3 w-3" />
                      {person.email}
                    </a>
                  )}
                  <span
                    className={`flex items-center gap-1 ${
                      needsMeetingSoon ? "text-orange-500" : ""
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    Last met: {formatLastMeeting(person.last_meeting)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPersonnel.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No personnel yet</p>
            <p className="text-sm">Add lab members to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

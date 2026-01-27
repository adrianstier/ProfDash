"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FlaskConical,
  Users,
  FileCheck,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Loader2,
  MapPin,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExperimentList } from "./ExperimentList";
import { PermitList } from "./PermitList";
import { PermitAlertBanner } from "./PermitAlertBanner";
import { SiteManager } from "./SiteManager";

interface ResearchProjectDashboardProps {
  projectId: string;
  workspaceId: string;
}

interface DashboardData {
  project: {
    id: string;
    title: string;
    type: string;
  };
  experiments: {
    total: number;
    planning: number;
    active: number;
    fieldwork: number;
    analysis: number;
    completed: number;
    on_hold: number;
  };
  permits: {
    total: number;
    active: number;
    pending: number;
    expiring_soon: number;
  };
  team: {
    total_members: number;
  };
  fieldwork: {
    upcoming_count: number;
    upcoming: Array<{
      id: string;
      title: string;
      start_date: string;
      end_date: string;
      status: string;
      site?: { id: string; name: string; code?: string | null } | null;
      experiment?: { id: string; title: string; code?: string | null } | null;
    }>;
  };
  expiring_permits: Array<{
    id: string;
    title: string;
    permit_type: string;
    expiration_date: string;
    days_until: number | null;
  }>;
  needs_attention: Array<{
    type: string;
    message: string;
    severity: "warning" | "critical";
    link?: string;
  }>;
}

type TabId = "overview" | "experiments" | "team" | "fieldwork" | "permits" | "sites";

async function fetchDashboard(projectId: string): Promise<DashboardData> {
  const response = await fetch(`/api/research/projects/${projectId}/dashboard`);
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard");
  }
  return response.json();
}

export function ResearchProjectDashboard({
  projectId,
  workspaceId,
}: ResearchProjectDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["research-dashboard", projectId],
    queryFn: () => fetchDashboard(projectId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Failed to load dashboard data
      </div>
    );
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "experiments", label: "Experiments", count: dashboard.experiments.total },
    { id: "team", label: "Team", count: dashboard.team.total_members },
    { id: "fieldwork", label: "Fieldwork", count: dashboard.fieldwork.upcoming_count },
    { id: "permits", label: "Permits", count: dashboard.permits.total },
    { id: "sites", label: "Sites" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab dashboard={dashboard} projectId={projectId} />
      )}

      {activeTab === "experiments" && (
        <ExperimentList projectId={projectId} workspaceId={workspaceId} />
      )}

      {activeTab === "team" && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Team Overview</h3>
          <p className="mt-2 text-sm">
            Team management is available at the experiment level. Select an experiment
            to manage its team.
          </p>
          <p className="mt-4 text-2xl font-bold">{dashboard.team.total_members}</p>
          <p className="text-sm text-muted-foreground">Total team members across all experiments</p>
        </div>
      )}

      {activeTab === "fieldwork" && (
        <FieldworkTab dashboard={dashboard} />
      )}

      {activeTab === "permits" && (
        <PermitList projectId={projectId} workspaceId={workspaceId} />
      )}

      {activeTab === "sites" && (
        <SiteManager workspaceId={workspaceId} />
      )}
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({
  dashboard,
  projectId,
}: {
  dashboard: DashboardData;
  projectId: string;
}) {
  return (
    <div className="space-y-6">
      {/* Permit alerts */}
      <PermitAlertBanner projectId={projectId} />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FlaskConical}
          label="Experiments"
          value={dashboard.experiments.total}
          subtitle={`${dashboard.experiments.active} active, ${dashboard.experiments.fieldwork} fieldwork`}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Users}
          label="Team Members"
          value={dashboard.team.total_members}
          subtitle="Across all experiments"
          iconColor="text-green-500"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Fieldwork"
          value={dashboard.fieldwork.upcoming_count}
          subtitle="Next 30 days"
          iconColor="text-orange-500"
        />
        <StatCard
          icon={FileCheck}
          label="Active Permits"
          value={dashboard.permits.active}
          subtitle={
            dashboard.permits.expiring_soon > 0
              ? `${dashboard.permits.expiring_soon} expiring soon`
              : "All permits current"
          }
          iconColor="text-purple-500"
          warning={dashboard.permits.expiring_soon > 0}
        />
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs Attention */}
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </h3>
          </div>
          <div className="p-4">
            {dashboard.needs_attention.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                All good! No items need attention.
              </p>
            ) : (
              <ul className="space-y-3">
                {dashboard.needs_attention.map((item, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-md p-2",
                      item.severity === "critical" ? "bg-red-50" : "bg-yellow-50"
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        item.severity === "critical"
                          ? "text-red-500"
                          : "text-yellow-500"
                      )}
                    />
                    <span className="text-sm">{item.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Fieldwork */}
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Upcoming Fieldwork
            </h3>
          </div>
          <div className="p-4">
            {dashboard.fieldwork.upcoming.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No fieldwork scheduled in the next 30 days.
              </p>
            ) : (
              <ul className="space-y-3">
                {dashboard.fieldwork.upcoming.map((trip) => (
                  <li
                    key={trip.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{trip.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateRange(trip.start_date, trip.end_date)}
                        </span>
                        {trip.site && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {trip.site.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Experiment Status Breakdown */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="font-medium flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-blue-500" />
            Experiments by Status
          </h3>
        </div>
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatusPill label="Planning" count={dashboard.experiments.planning} color="gray" />
            <StatusPill label="Active" count={dashboard.experiments.active} color="blue" />
            <StatusPill label="Fieldwork" count={dashboard.experiments.fieldwork} color="orange" />
            <StatusPill label="Analysis" count={dashboard.experiments.analysis} color="purple" />
            <StatusPill label="Completed" count={dashboard.experiments.completed} color="green" />
            <StatusPill label="On Hold" count={dashboard.experiments.on_hold} color="yellow" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Fieldwork Tab
// ============================================================================

function FieldworkTab({ dashboard }: { dashboard: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Fieldwork Overview</h3>
        <p className="mt-2 text-sm">
          Fieldwork scheduling is available at the experiment level. Select an
          experiment to manage its fieldwork schedule.
        </p>
      </div>

      {dashboard.fieldwork.upcoming.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium">Upcoming Trips (Next 30 Days)</h3>
          </div>
          <div className="divide-y">
            {dashboard.fieldwork.upcoming.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{trip.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateRange(trip.start_date, trip.end_date)}
                    </span>
                    {trip.site && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {trip.site.name}
                      </span>
                    )}
                    {trip.experiment && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {trip.experiment.code || trip.experiment.title}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    trip.status === "confirmed" && "bg-blue-100 text-blue-700",
                    trip.status === "planned" && "bg-gray-100 text-gray-700",
                    trip.status === "in_progress" && "bg-orange-100 text-orange-700"
                  )}
                >
                  {trip.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconColor,
  warning,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  subtitle: string;
  iconColor: string;
  warning?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-4", warning && "border-amber-300 bg-amber-50")}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", iconColor)} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StatusPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "gray" | "blue" | "orange" | "purple" | "green" | "yellow";
}) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className={cn("rounded-lg p-3 text-center", colors[color])}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  if (start === end) {
    return startDate.toLocaleDateString("en-US", formatOptions);
  }

  return `${startDate.toLocaleDateString("en-US", formatOptions)} - ${endDate.toLocaleDateString("en-US", formatOptions)}`;
}

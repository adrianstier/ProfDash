import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/research/projects/[id]/dashboard - Get research project dashboard stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project access
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id, type, title")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.type !== "research") {
    return NextResponse.json(
      { error: "This endpoint is only for research projects" },
      { status: 400 }
    );
  }

  // Fetch all experiments
  const { data: experimentsData } = await supabase
    .from("experiments")
    .select("id, status, title, fieldwork_start, fieldwork_end, lead_id, site_id")
    .eq("project_id", projectId);

  const experiments = experimentsData ?? [];

  // Count experiments by status
  const experimentStats = {
    total: experiments.length,
    planning: experiments.filter((e) => e.status === "planning").length,
    active: experiments.filter((e) => e.status === "active").length,
    fieldwork: experiments.filter((e) => e.status === "fieldwork").length,
    analysis: experiments.filter((e) => e.status === "analysis").length,
    completed: experiments.filter((e) => e.status === "completed").length,
    on_hold: experiments.filter((e) => e.status === "on_hold").length,
  };

  // Fetch permits
  const { data: permitsData } = await supabase
    .from("permits")
    .select("id, status, title, permit_type, expiration_date, renewal_reminder_days")
    .eq("project_id", projectId)
    .neq("status", "expired");

  const permits = permitsData ?? [];

  // Identify expiring permits
  const now = new Date();
  const expiringPermits = permits
    .filter((permit) => {
      if (!permit.expiration_date) return false;
      const expDate = new Date(permit.expiration_date);
      const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= (permit.renewal_reminder_days || 60);
    })
    .map((permit) => ({
      id: permit.id,
      title: permit.title,
      permit_type: permit.permit_type,
      expiration_date: permit.expiration_date,
      days_until: permit.expiration_date
        ? Math.ceil(
            (new Date(permit.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
    }))
    .sort((a, b) => (a.days_until ?? 999) - (b.days_until ?? 999));

  // Fetch upcoming fieldwork
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const experimentIds = experiments.map((e) => e.id);

  let fieldwork: Array<{
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    status: string;
    site: unknown;
    experiment: unknown;
  }> = [];

  if (experimentIds.length > 0) {
    const { data: fieldworkData } = await supabase
      .from("fieldwork_schedules")
      .select(
        `
        id,
        title,
        start_date,
        end_date,
        status,
        site:field_sites(id, name, code),
        experiment:experiments(id, title, code)
      `
      )
      .in("experiment_id", experimentIds)
      .gte("start_date", now.toISOString().split("T")[0])
      .lte("start_date", thirtyDaysFromNow.toISOString().split("T")[0])
      .order("start_date", { ascending: true })
      .limit(5);

    fieldwork = (fieldworkData ?? []) as typeof fieldwork;
  }

  // Fetch unique team members across all experiments
  let uniqueTeamMembers = new Set<string>();

  if (experimentIds.length > 0) {
    const { data: teamAssignmentsData } = await supabase
      .from("experiment_team_assignments")
      .select("personnel_id")
      .in("experiment_id", experimentIds);

    const teamAssignments = teamAssignmentsData ?? [];
    uniqueTeamMembers = new Set(teamAssignments.map((a) => a.personnel_id));
  }

  // Build needs attention items
  const needsAttention: Array<{
    type: string;
    message: string;
    severity: "warning" | "critical";
    link?: string;
  }> = [];

  // Add expiring permits to needs attention
  expiringPermits.forEach((permit) => {
    if (permit.days_until !== null && permit.days_until <= 14) {
      needsAttention.push({
        type: "permit",
        message: `Permit "${permit.title}" ${permit.days_until < 0 ? "expired" : `expires in ${permit.days_until} days`}`,
        severity: permit.days_until <= 7 ? "critical" : "warning",
      });
    }
  });

  // Check for experiments without leads
  experiments
    .filter((e) => !e.lead_id && e.status !== "completed")
    .forEach((exp) => {
      needsAttention.push({
        type: "experiment",
        message: `"${exp.title}" has no assigned lead`,
        severity: "warning",
      });
    });

  const dashboard = {
    project: {
      id: project.id,
      title: project.title,
      type: project.type,
    },
    experiments: experimentStats,
    permits: {
      total: permits.length,
      active: permits.filter((p) => p.status === "active").length,
      pending: permits.filter((p) => p.status === "pending").length,
      expiring_soon: expiringPermits.length,
    },
    team: {
      total_members: uniqueTeamMembers.size,
    },
    fieldwork: {
      upcoming_count: fieldwork.length,
      upcoming: fieldwork.map((f) => ({
        id: f.id,
        title: f.title,
        start_date: f.start_date,
        end_date: f.end_date,
        status: f.status,
        site: f.site,
        experiment: f.experiment,
      })),
    },
    expiring_permits: expiringPermits.slice(0, 3),
    needs_attention: needsAttention.slice(0, 5),
  };

  return NextResponse.json(dashboard);
}

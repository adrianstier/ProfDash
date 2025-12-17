"use client";

import { useState } from "react";
import { Plus, Wallet, MoreHorizontal, ExternalLink, DollarSign, Calendar } from "lucide-react";
import type { Project, GrantStage } from "@scholaros/shared";

const stageColors: Record<GrantStage, string> = {
  discovery: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "fit-assessment": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "intent-loi": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  drafting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  "internal-routing": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  submission: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  awarded: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  closeout: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const stageLabels: Record<GrantStage, string> = {
  discovery: "Discovery",
  "fit-assessment": "Fit Assessment",
  "intent-loi": "LOI/Intent",
  drafting: "Drafting",
  "internal-routing": "Internal Routing",
  submission: "Submitted",
  awarded: "Awarded",
  active: "Active",
  closeout: "Closeout",
};

interface GrantProject extends Omit<Project, "metadata"> {
  metadata?: {
    agency?: string;
    amount?: number;
    deadline?: string;
  };
}

// Mock data
const mockGrants: GrantProject[] = [
  {
    id: "1",
    workspace_id: "ws-1",
    type: "grant",
    title: "NSF CAREER: AI-Driven Academic Operations",
    summary: "5-year CAREER award to develop AI systems for academic productivity",
    status: "active",
    stage: "drafting",
    metadata: {
      agency: "NSF",
      amount: 750000,
      deadline: "2025-02-15",
    },
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "2",
    workspace_id: "ws-1",
    type: "grant",
    title: "NIH R01: Machine Learning in Healthcare",
    summary: "Research on applying ML techniques to healthcare outcomes",
    status: "active",
    stage: "submission",
    metadata: {
      agency: "NIH",
      amount: 1200000,
    },
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "3",
    workspace_id: "ws-1",
    type: "grant",
    title: "DOE Early Career: Sustainable Computing",
    status: "active",
    stage: "discovery",
    metadata: {
      agency: "DOE",
      deadline: "2025-04-01",
    },
    created_at: new Date(),
    updated_at: new Date(),
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function GrantsPage() {
  const [grants] = useState<GrantProject[]>(mockGrants);

  const totalPipeline = grants
    .filter(g => ["drafting", "submission", "internal-routing"].includes(g.stage as string))
    .reduce((sum, g) => sum + (g.metadata?.amount || 0), 0);

  const activeGrants = grants.filter(g => g.stage === "active" || g.stage === "awarded");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grants</h1>
          <p className="text-muted-foreground">
            Track funding opportunities and submissions
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Grant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">In Pipeline</p>
          <p className="text-2xl font-bold">{grants.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pipeline Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPipeline)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Awards</p>
          <p className="text-2xl font-bold">{activeGrants.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending Decision</p>
          <p className="text-2xl font-bold">
            {grants.filter(g => g.stage === "submission").length}
          </p>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">Upcoming Deadlines</h2>
        <div className="space-y-2">
          {grants
            .filter(g => g.metadata?.deadline)
            .sort((a, b) =>
              new Date(a.metadata?.deadline || 0).getTime() -
              new Date(b.metadata?.deadline || 0).getTime()
            )
            .slice(0, 3)
            .map(grant => (
              <div key={grant.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{grant.title}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(grant.metadata?.deadline || "").toLocaleDateString()}
                </span>
              </div>
            ))}
          {grants.filter(g => g.metadata?.deadline).length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
          )}
        </div>
      </div>

      {/* Grant List */}
      <div className="space-y-3">
        {grants.map((grant) => (
          <div
            key={grant.id}
            className="group flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
              <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{grant.title}</h3>
                  {grant.metadata?.agency && (
                    <span className="text-sm text-muted-foreground">
                      {grant.metadata.agency}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {grant.stage && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        stageColors[grant.stage as GrantStage] || "bg-gray-100"
                      }`}
                    >
                      {stageLabels[grant.stage as GrantStage] || grant.stage}
                    </span>
                  )}
                  <button className="opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {grant.summary && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {grant.summary}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {grant.metadata?.amount && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(grant.metadata.amount)}
                  </span>
                )}
                {grant.metadata?.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due {new Date(grant.metadata.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ))}

        {grants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wallet className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No grants yet</p>
            <p className="text-sm">Add a grant opportunity to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

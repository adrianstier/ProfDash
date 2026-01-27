"use client";

import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  usePermits,
  getDaysUntilExpiration,
  getExpirationUrgency,
  getPermitTypeConfig,
} from "@/lib/hooks/use-permits";
import type { PermitWithDetails } from "@scholaros/shared";

interface PermitAlertBannerProps {
  projectId: string;
  className?: string;
  onPermitClick?: (permit: PermitWithDetails) => void;
}

export function PermitAlertBanner({
  projectId,
  className,
  onPermitClick,
}: PermitAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { data: permits = [] } = usePermits(projectId, { includeExpired: true });

  // Filter to critical or warning permits that haven't been dismissed
  const alertPermits = permits.filter((permit) => {
    if (dismissed.has(permit.id)) return false;

    const urgency = getExpirationUrgency(
      permit.expiration_date,
      permit.renewal_reminder_days
    );
    return urgency === "expired" || urgency === "critical" || urgency === "warning";
  });

  // Sort by urgency (expired first, then by days until expiration)
  const sortedAlerts = alertPermits.sort((a, b) => {
    const daysA = getDaysUntilExpiration(a.expiration_date) ?? 999;
    const daysB = getDaysUntilExpiration(b.expiration_date) ?? 999;
    return daysA - daysB;
  });

  if (sortedAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (permitId: string) => {
    setDismissed((prev) => new Set([...prev, permitId]));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {sortedAlerts.map((permit) => (
        <PermitAlertItem
          key={permit.id}
          permit={permit}
          onDismiss={() => handleDismiss(permit.id)}
          onClick={() => onPermitClick?.(permit)}
        />
      ))}
    </div>
  );
}

interface PermitAlertItemProps {
  permit: PermitWithDetails;
  onDismiss: () => void;
  onClick?: () => void;
}

function PermitAlertItem({ permit, onDismiss, onClick }: PermitAlertItemProps) {
  const daysUntil = getDaysUntilExpiration(permit.expiration_date);
  const urgency = getExpirationUrgency(
    permit.expiration_date,
    permit.renewal_reminder_days
  );
  const typeConfig = getPermitTypeConfig(permit.permit_type);

  const getAlertStyles = () => {
    switch (urgency) {
      case "expired":
        return {
          bg: "bg-red-50 border-red-200",
          icon: "text-red-600",
          text: "text-red-800",
          textMuted: "text-red-600",
        };
      case "critical":
        return {
          bg: "bg-orange-50 border-orange-200",
          icon: "text-orange-600",
          text: "text-orange-800",
          textMuted: "text-orange-600",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 border-yellow-200",
          icon: "text-yellow-600",
          text: "text-yellow-800",
          textMuted: "text-yellow-600",
        };
      default:
        return {
          bg: "bg-gray-50 border-gray-200",
          icon: "text-gray-600",
          text: "text-gray-800",
          textMuted: "text-gray-600",
        };
    }
  };

  const styles = getAlertStyles();

  const getMessage = () => {
    if (daysUntil === null) return "Expiration date unknown";
    if (daysUntil < 0) return `Expired ${Math.abs(daysUntil)} days ago`;
    if (daysUntil === 0) return "Expires today";
    if (daysUntil === 1) return "Expires tomorrow";
    return `Expires in ${daysUntil} days`;
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border p-3",
        styles.bg
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={cn("h-5 w-5 shrink-0", styles.icon)} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={styles.text}>{typeConfig.icon}</span>
            <span className={cn("font-medium", styles.text)}>{permit.title}</span>
            {permit.permit_number && (
              <span className={cn("text-sm", styles.textMuted)}>
                #{permit.permit_number}
              </span>
            )}
          </div>
          <p className={cn("text-sm", styles.textMuted)}>{getMessage()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onClick && (
          <button
            onClick={onClick}
            className={cn(
              "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              urgency === "expired"
                ? "bg-red-600 text-white hover:bg-red-700"
                : urgency === "critical"
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-yellow-600 text-white hover:bg-yellow-700"
            )}
          >
            {urgency === "expired" ? "View" : "Renew"}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className={cn("rounded p-1 hover:bg-white/50", styles.textMuted)}
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Alert Summary
// ============================================================================

interface PermitAlertSummaryProps {
  projectId: string;
  className?: string;
  onClick?: () => void;
}

export function PermitAlertSummary({
  projectId,
  className,
  onClick,
}: PermitAlertSummaryProps) {
  const { data: permits = [] } = usePermits(projectId, { includeExpired: true });

  // Count by urgency
  const counts = permits.reduce(
    (acc, permit) => {
      const urgency = getExpirationUrgency(
        permit.expiration_date,
        permit.renewal_reminder_days
      );
      if (urgency === "expired") acc.expired++;
      else if (urgency === "critical") acc.critical++;
      else if (urgency === "warning") acc.warning++;
      return acc;
    },
    { expired: 0, critical: 0, warning: 0 }
  );

  const total = counts.expired + counts.critical + counts.warning;

  if (total === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        counts.expired > 0
          ? "bg-red-100 text-red-700 hover:bg-red-200"
          : counts.critical > 0
            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      <span>
        {counts.expired > 0 && `${counts.expired} expired`}
        {counts.expired > 0 && (counts.critical > 0 || counts.warning > 0) && ", "}
        {counts.critical > 0 && `${counts.critical} expiring soon`}
        {counts.critical > 0 && counts.warning > 0 && ", "}
        {counts.warning > 0 && `${counts.warning} upcoming`}
      </span>
    </button>
  );
}

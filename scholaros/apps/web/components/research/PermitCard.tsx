"use client";

import { useState } from "react";
import {
  Calendar,
  FileText,
  MapPin,
  FlaskConical,
  AlertTriangle,
  MoreHorizontal,
  Edit2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPermitStatusConfig,
  getPermitTypeConfig,
  getDaysUntilExpiration,
  getExpirationUrgency,
} from "@/lib/hooks/use-permits";
import type { PermitWithDetails } from "@scholaros/shared";

interface PermitCardProps {
  permit: PermitWithDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function PermitCard({
  permit,
  onEdit,
  onDelete,
  className,
}: PermitCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = getPermitStatusConfig(permit.status);
  const typeConfig = getPermitTypeConfig(permit.permit_type);
  const daysUntil = getDaysUntilExpiration(permit.expiration_date);
  const urgency = getExpirationUrgency(
    permit.expiration_date,
    permit.renewal_reminder_days
  );

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Not set";
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getUrgencyStyles = () => {
    switch (urgency) {
      case "expired":
        return "border-red-500 bg-red-50";
      case "critical":
        return "border-orange-500 bg-orange-50";
      case "warning":
        return "border-yellow-500 bg-yellow-50";
      default:
        return "";
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card transition-shadow hover:shadow-md",
        getUrgencyStyles(),
        className
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeConfig.icon}</span>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                {typeConfig.label}
              </span>
              {permit.permit_number && (
                <span className="text-sm text-muted-foreground">
                  #{permit.permit_number}
                </span>
              )}
            </div>
            <h4 className="mt-1 font-medium">{permit.title}</h4>
            {permit.issuing_authority && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {permit.issuing_authority}
              </p>
            )}
          </div>

          {/* Status badge */}
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusConfig.bgColor,
              statusConfig.textColor
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Expiration warning */}
        {urgency && urgency !== "ok" && daysUntil !== null && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-md p-2 text-sm",
              urgency === "expired" && "bg-red-100 text-red-700",
              urgency === "critical" && "bg-orange-100 text-orange-700",
              urgency === "warning" && "bg-yellow-100 text-yellow-700"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>
              {urgency === "expired"
                ? `Expired ${Math.abs(daysUntil)} days ago`
                : `Expires in ${daysUntil} days`}
            </span>
          </div>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {/* Expiration date */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Expires: {formatDate(permit.expiration_date)}</span>
          </div>

          {/* Site */}
          {permit.site && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{permit.site.name}</span>
            </div>
          )}

          {/* Experiment */}
          {permit.experiment && (
            <div className="flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" />
              <span>{permit.experiment.title}</span>
            </div>
          )}
        </div>

        {/* PI */}
        {permit.pi_name && (
          <div className="mt-2 text-sm text-muted-foreground">
            PI: {permit.pi_name}
          </div>
        )}

        {/* Documents */}
        {permit.documents && permit.documents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {permit.documents.slice(0, 3).map((doc, i) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                <FileText className="h-3 w-3" />
                {doc.name}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
            {permit.documents.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{permit.documents.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        {permit.notes && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {permit.notes}
          </p>
        )}
      </div>

      {/* Actions menu */}
      {(onEdit || onDelete) && (
        <div className="absolute right-2 top-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1.5 opacity-0 hover:bg-muted group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover py-1 shadow-md">
                {onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

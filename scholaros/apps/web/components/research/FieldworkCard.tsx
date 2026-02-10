"use client";

import { useState } from "react";
import {
  MapPin,
  Calendar,
  Plane,
  Home,
  FileCheck,
  MoreHorizontal,
  Edit2,
  Trash2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@scholaros/shared";
import {
  getFieldworkStatusConfig,
  getDaysUntilFieldwork,
  getFieldworkDuration,
} from "@/lib/hooks/use-fieldwork";
import type { FieldworkScheduleWithDetails } from "@scholaros/shared";

interface FieldworkCardProps {
  schedule: FieldworkScheduleWithDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function FieldworkCard({
  schedule,
  onEdit,
  onDelete,
  className,
}: FieldworkCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = getFieldworkStatusConfig(schedule.status);
  const daysUntil = getDaysUntilFieldwork(schedule.start_date);
  const duration = getFieldworkDuration(schedule.start_date, schedule.end_date);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    const d = typeof date === "string" ? parseLocalDate(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDateRangeDisplay = () => {
    if (!schedule.start_date && !schedule.end_date) return "Dates not set";

    const start = formatDate(schedule.start_date);
    const end = formatDate(schedule.end_date);

    if (start === end) return start;
    return `${start} - ${end}`;
  };

  const getUrgencyStyles = () => {
    if (daysUntil === null) return "";
    if (daysUntil < 0) return ""; // Past
    if (daysUntil === 0) return "border-orange-500 bg-orange-50"; // Today
    if (daysUntil <= 7) return "border-yellow-500 bg-yellow-50"; // This week
    return "";
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
            <h4 className="font-medium">{schedule.title}</h4>
            {schedule.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {schedule.description}
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

        {/* Countdown / Status message */}
        {daysUntil !== null && schedule.status !== "completed" && schedule.status !== "cancelled" && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-md p-2 text-sm",
              daysUntil < 0 && "bg-gray-100 text-gray-700",
              daysUntil === 0 && "bg-orange-100 text-orange-700",
              daysUntil > 0 && daysUntil <= 7 && "bg-yellow-100 text-yellow-700",
              daysUntil > 7 && "bg-blue-100 text-blue-700"
            )}
          >
            <Clock className="h-4 w-4" />
            <span>
              {daysUntil < 0
                ? `Started ${Math.abs(daysUntil)} days ago`
                : daysUntil === 0
                  ? "Starts today"
                  : daysUntil === 1
                    ? "Starts tomorrow"
                    : `Starts in ${daysUntil} days`}
            </span>
          </div>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {/* Dates */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{getDateRangeDisplay()}</span>
            {duration && duration > 1 && (
              <span className="text-xs">({duration} days)</span>
            )}
          </div>

          {/* Site */}
          {schedule.site && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{schedule.site.name}</span>
              {schedule.site.code && (
                <span className="text-xs">({schedule.site.code})</span>
              )}
            </div>
          )}

          {/* Experiment */}
          {schedule.experiment && (
            <div className="flex items-center gap-1 text-xs">
              <span className="rounded bg-muted px-1.5 py-0.5">
                {schedule.experiment.code || schedule.experiment.title}
              </span>
            </div>
          )}
        </div>

        {/* Checklist row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs">
          <div
            className={cn(
              "flex items-center gap-1",
              schedule.travel_booked ? "text-green-600" : "text-muted-foreground"
            )}
          >
            <Plane className="h-3.5 w-3.5" />
            <span>{schedule.travel_booked ? "Travel booked" : "Travel pending"}</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1",
              schedule.accommodation_booked
                ? "text-green-600"
                : "text-muted-foreground"
            )}
          >
            <Home className="h-3.5 w-3.5" />
            <span>
              {schedule.accommodation_booked ? "Accommodation booked" : "Accommodation pending"}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1",
              schedule.permits_verified ? "text-green-600" : "text-muted-foreground"
            )}
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>
              {schedule.permits_verified ? "Permits verified" : "Permits pending"}
            </span>
          </div>
        </div>

        {/* Logistics notes */}
        {schedule.logistics_notes && (
          <p className="mt-2 text-sm text-muted-foreground">
            {schedule.logistics_notes}
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

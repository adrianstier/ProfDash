"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Repeat,
  Calendar,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type RecurrenceFrequency,
  type DayOfWeek,
  type RecurrenceRule,
  parseRRule,
  generateRRule,
  rruleToText,
  getNextOccurrences,
  formatOccurrenceDate,
  RECURRENCE_PRESETS,
  DAY_ABBREVIATIONS,
} from "@/lib/utils/recurrence";

interface RecurrencePickerProps {
  value?: string | null; // RRULE string
  onChange: (rrule: string | null) => void;
  startDate?: Date | null; // Task's due date to calculate occurrences
  disabled?: boolean;
}

type PresetType = "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom";

const PRESETS: { value: PresetType; label: string; rrule: string | null }[] = [
  { value: "none", label: "Does not repeat", rrule: null },
  { value: "daily", label: "Daily", rrule: RECURRENCE_PRESETS.daily },
  { value: "weekdays", label: "Every weekday (Mon-Fri)", rrule: RECURRENCE_PRESETS.weekdays },
  { value: "weekly", label: "Weekly", rrule: RECURRENCE_PRESETS.weekly },
  { value: "biweekly", label: "Every 2 weeks", rrule: RECURRENCE_PRESETS.biweekly },
  { value: "monthly", label: "Monthly", rrule: RECURRENCE_PRESETS.monthly },
  { value: "yearly", label: "Yearly", rrule: RECURRENCE_PRESETS.yearly },
  { value: "custom", label: "Custom...", rrule: null },
];

const DAYS: DayOfWeek[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function RecurrencePicker({
  value,
  onChange,
  startDate,
  disabled = false,
}: RecurrencePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  // Custom rule state
  const [customFrequency, setCustomFrequency] = useState<RecurrenceFrequency>("WEEKLY");
  const [customInterval, setCustomInterval] = useState(1);
  const [customByDay, setCustomByDay] = useState<DayOfWeek[]>([]);
  const [customEndType, setCustomEndType] = useState<"never" | "until" | "count">("never");
  const [customUntil, setCustomUntil] = useState<string>("");
  const [customCount, setCustomCount] = useState(10);

  // Determine current preset from value
  const currentPreset = useMemo((): PresetType => {
    if (!value) return "none";

    for (const preset of PRESETS) {
      if (preset.rrule === value) {
        return preset.value;
      }
    }
    return "custom";
  }, [value]);

  // Human-readable text for the current rule
  const displayText = useMemo(() => {
    if (!value) return "Does not repeat";
    return rruleToText(value);
  }, [value]);

  // Next occurrences preview
  const nextOccurrences = useMemo(() => {
    if (!value || !startDate) return [];
    return getNextOccurrences(value, startDate, 3, []);
  }, [value, startDate]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: PresetType) => {
    if (preset === "none") {
      onChange(null);
      setIsOpen(false);
    } else if (preset === "custom") {
      // Initialize custom dialog with current rule or defaults
      const rule = value ? parseRRule(value) : null;
      if (rule) {
        setCustomFrequency(rule.frequency);
        setCustomInterval(rule.interval || 1);
        setCustomByDay(rule.byDay || []);
        if (rule.until) {
          setCustomEndType("until");
          setCustomUntil(rule.until.toISOString().split("T")[0]);
        } else if (rule.count) {
          setCustomEndType("count");
          setCustomCount(rule.count);
        } else {
          setCustomEndType("never");
        }
      } else {
        setCustomFrequency("WEEKLY");
        setCustomInterval(1);
        setCustomByDay([]);
        setCustomEndType("never");
        setCustomUntil("");
        setCustomCount(10);
      }
      setIsOpen(false);
      setCustomDialogOpen(true);
    } else {
      const selectedPreset = PRESETS.find(p => p.value === preset);
      if (selectedPreset?.rrule) {
        onChange(selectedPreset.rrule);
      }
      setIsOpen(false);
    }
  }, [value, onChange]);

  // Handle custom rule save
  const handleCustomSave = useCallback(() => {
    const rule: RecurrenceRule = {
      frequency: customFrequency,
      interval: customInterval > 1 ? customInterval : undefined,
    };

    if (customFrequency === "WEEKLY" && customByDay.length > 0) {
      rule.byDay = customByDay;
    }

    if (customEndType === "until" && customUntil) {
      rule.until = new Date(customUntil);
    } else if (customEndType === "count" && customCount > 0) {
      rule.count = customCount;
    }

    onChange(generateRRule(rule));
    setCustomDialogOpen(false);
  }, [customFrequency, customInterval, customByDay, customEndType, customUntil, customCount, onChange]);

  // Toggle day selection for weekly custom
  const toggleDay = useCallback((day: DayOfWeek) => {
    setCustomByDay(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
    );
  }, []);

  // Custom rule preview
  const customPreview = useMemo(() => {
    const rule: RecurrenceRule = {
      frequency: customFrequency,
      interval: customInterval > 1 ? customInterval : undefined,
    };

    if (customFrequency === "WEEKLY" && customByDay.length > 0) {
      rule.byDay = customByDay;
    }

    if (customEndType === "until" && customUntil) {
      rule.until = new Date(customUntil);
    } else if (customEndType === "count" && customCount > 0) {
      rule.count = customCount;
    }

    return rruleToText(generateRRule(rule));
  }, [customFrequency, customInterval, customByDay, customEndType, customUntil, customCount]);

  // Next occurrences for custom preview
  const customNextOccurrences = useMemo(() => {
    if (!startDate) return [];

    const rule: RecurrenceRule = {
      frequency: customFrequency,
      interval: customInterval > 1 ? customInterval : undefined,
    };

    if (customFrequency === "WEEKLY" && customByDay.length > 0) {
      rule.byDay = customByDay;
    }

    if (customEndType === "until" && customUntil) {
      rule.until = new Date(customUntil);
    } else if (customEndType === "count" && customCount > 0) {
      rule.count = customCount;
    }

    return getNextOccurrences(generateRRule(rule), startDate, 3, []);
  }, [startDate, customFrequency, customInterval, customByDay, customEndType, customUntil, customCount]);

  return (
    <>
      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
            value
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-input bg-background text-muted-foreground hover:bg-accent",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Repeat className="h-4 w-4" />
          <span className="max-w-[200px] truncate">{displayText}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[240px] rounded-xl border bg-popover p-2 shadow-lg">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                    currentPreset === preset.value && "bg-accent"
                  )}
                >
                  {currentPreset === preset.value ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span>{preset.label}</span>
                </button>
              ))}

              {/* Next occurrences preview */}
              {value && nextOccurrences.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
                    Next occurrences
                  </p>
                  <div className="space-y-1 px-3 py-1">
                    {nextOccurrences.map((date, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Calendar className="h-3 w-3" />
                        <span>{formatOccurrenceDate(date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear button */}
              {value && (
                <button
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg border-t px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                  Remove recurrence
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Custom Recurrence Dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Custom Recurrence
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Frequency and Interval */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Repeat every</span>
              <input
                type="number"
                min={1}
                max={99}
                value={customInterval}
                onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Select
                value={customFrequency}
                onValueChange={(v) => setCustomFrequency(v as RecurrenceFrequency)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{customInterval === 1 ? "day" : "days"}</SelectItem>
                  <SelectItem value="WEEKLY">{customInterval === 1 ? "week" : "weeks"}</SelectItem>
                  <SelectItem value="MONTHLY">{customInterval === 1 ? "month" : "months"}</SelectItem>
                  <SelectItem value="YEARLY">{customInterval === 1 ? "year" : "years"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days of Week (for weekly) */}
            {customFrequency === "WEEKLY" && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Repeat on</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
                        customByDay.includes(day)
                          ? "bg-primary text-primary-foreground"
                          : "border bg-background hover:bg-accent"
                      )}
                    >
                      {DAY_ABBREVIATIONS[day].charAt(0)}
                    </button>
                  ))}
                </div>
                {customByDay.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty to repeat on the same day each week
                  </p>
                )}
              </div>
            )}

            {/* End Condition */}
            <div className="space-y-3">
              <span className="text-sm text-muted-foreground">Ends</span>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="endType"
                    checked={customEndType === "never"}
                    onChange={() => setCustomEndType("never")}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Never</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="endType"
                    checked={customEndType === "until"}
                    onChange={() => setCustomEndType("until")}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">On</span>
                  <input
                    type="date"
                    value={customUntil}
                    onChange={(e) => {
                      setCustomUntil(e.target.value);
                      setCustomEndType("until");
                    }}
                    className="rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={customEndType !== "until"}
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="endType"
                    checked={customEndType === "count"}
                    onChange={() => setCustomEndType("count")}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">After</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customCount}
                    onChange={(e) => {
                      setCustomCount(Math.max(1, parseInt(e.target.value) || 1));
                      setCustomEndType("count");
                    }}
                    className="w-16 rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={customEndType !== "count"}
                  />
                  <span className="text-sm">occurrences</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium">{customPreview}</p>
              {startDate && customNextOccurrences.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Next occurrences:</p>
                  {customNextOccurrences.map((date, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Calendar className="h-3 w-3" />
                      <span>{formatOccurrenceDate(date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setCustomDialogOpen(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCustomSave}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact recurrence badge for display in task cards
 */
interface RecurrenceBadgeProps {
  rrule: string | null | undefined;
  className?: string;
}

export function RecurrenceBadge({ rrule, className }: RecurrenceBadgeProps) {
  if (!rrule) return null;

  const text = rruleToText(rrule);

  return (
    <Badge
      variant="secondary"
      className={cn("inline-flex items-center gap-1 text-xs", className)}
    >
      <Repeat className="h-3 w-3" />
      <span className="max-w-[100px] truncate">{text}</span>
    </Badge>
  );
}

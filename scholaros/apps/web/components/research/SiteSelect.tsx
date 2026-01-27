"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFieldSites } from "@/lib/hooks/use-field-sites";
import type { FieldSiteFromAPI } from "@scholaros/shared";

interface SiteSelectProps {
  workspaceId: string;
  value?: string | null;
  onChange: (siteId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showCreateOption?: boolean;
  onCreateClick?: () => void;
  className?: string;
}

export function SiteSelect({
  workspaceId,
  value,
  onChange,
  placeholder = "Select a site...",
  disabled = false,
  showCreateOption = false,
  onCreateClick,
  className,
}: SiteSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: sites = [], isLoading } = useFieldSites(workspaceId, true);

  const selectedSite = sites.find((site) => site.id === value);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {selectedSite ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{selectedSite.name}</span>
            {selectedSite.code && (
              <span className="text-xs text-muted-foreground">
                ({selectedSite.code})
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">
            {isLoading ? "Loading..." : placeholder}
          </span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="max-h-60 overflow-auto p-1">
              {/* Clear option */}
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                >
                  Clear selection
                </button>
              )}

              {sites.length === 0 && !isLoading ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No field sites available.
                  {showCreateOption && onCreateClick && (
                    <button
                      type="button"
                      onClick={() => {
                        onCreateClick();
                        setOpen(false);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-primary hover:bg-accent"
                    >
                      <Plus className="h-4 w-4" />
                      Add Field Site
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {sites.map((site) => (
                    <SiteOption
                      key={site.id}
                      site={site}
                      isSelected={site.id === value}
                      onSelect={() => {
                        onChange(site.id);
                        setOpen(false);
                      }}
                    />
                  ))}

                  {showCreateOption && onCreateClick && (
                    <button
                      type="button"
                      onClick={() => {
                        onCreateClick();
                        setOpen(false);
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-sm border-t px-2 py-2 text-sm text-primary hover:bg-accent"
                    >
                      <Plus className="h-4 w-4" />
                      Add new site
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface SiteOptionProps {
  site: FieldSiteFromAPI;
  isSelected: boolean;
  onSelect: () => void;
}

function SiteOption({ site, isSelected, onSelect }: SiteOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <Check
        className={cn(
          "h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-1 flex-col items-start">
        <span className="font-medium">{site.name}</span>
        {site.code && (
          <span className="text-xs text-muted-foreground">{site.code}</span>
        )}
      </div>
      {site.location?.country && (
        <span className="text-xs text-muted-foreground">
          {site.location.country}
        </span>
      )}
    </button>
  );
}

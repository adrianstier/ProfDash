"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  PUBLICATION_STATUS_LABELS,
  PUBLICATION_STATUS_COLORS,
  PUBLICATION_PIPELINE_STAGES,
  type PublicationStatus,
} from "@scholaros/shared";
import { PublicationCard } from "./publication-card";
import type { PublicationWithAuthors } from "@/lib/hooks/use-publications";
import { useUpdatePublication } from "@/lib/hooks/use-publications";

interface PublicationPipelineProps {
  publications: PublicationWithAuthors[];
  onEdit?: (publication: PublicationWithAuthors) => void;
  onDelete?: (publication: PublicationWithAuthors) => void;
  onView?: (publication: PublicationWithAuthors) => void;
}

export function PublicationPipeline({
  publications,
  onEdit,
  onDelete,
  onView,
}: PublicationPipelineProps) {
  const updatePublication = useUpdatePublication();

  // Group publications by status
  const publicationsByStatus = useMemo(() => {
    const grouped: Record<PublicationStatus, PublicationWithAuthors[]> = {
      idea: [],
      drafting: [],
      "internal-review": [],
      submitted: [],
      "under-review": [],
      revision: [],
      accepted: [],
      "in-press": [],
      published: [],
    };

    publications.forEach((pub) => {
      if (grouped[pub.status]) {
        grouped[pub.status].push(pub);
      }
    });

    return grouped;
  }, [publications]);

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, publication: PublicationWithAuthors) => {
    e.dataTransfer.setData("publicationId", publication.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: PublicationStatus) => {
    e.preventDefault();
    const publicationId = e.dataTransfer.getData("publicationId");

    if (publicationId) {
      try {
        await updatePublication.mutateAsync({
          id: publicationId,
          status: newStatus,
        });
      } catch (error) {
        console.error("Failed to update publication status:", error);
      }
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PUBLICATION_PIPELINE_STAGES.map((status) => {
        const pubs = publicationsByStatus[status];
        const statusLabel = PUBLICATION_STATUS_LABELS[status];
        const statusColor = PUBLICATION_STATUS_COLORS[status];

        return (
          <div
            key={status}
            className="flex w-72 flex-shrink-0 flex-col rounded-lg border bg-muted/30"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    statusColor
                  )}
                >
                  {statusLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {pubs.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 p-2 min-h-[200px]">
              {pubs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                  Drop here
                </div>
              ) : (
                pubs.map((pub) => (
                  <div
                    key={pub.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pub)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <PublicationCard
                      publication={pub}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onView={onView}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

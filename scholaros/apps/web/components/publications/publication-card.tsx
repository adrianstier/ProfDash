"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  Calendar,
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2,
  Link2,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_TYPE_COLORS,
  AUTHOR_ROLE_LABELS,
} from "@scholaros/shared";
import type { PublicationWithAuthors } from "@/lib/hooks/use-publications";

interface PublicationCardProps {
  publication: PublicationWithAuthors;
  onEdit?: (publication: PublicationWithAuthors) => void;
  onDelete?: (publication: PublicationWithAuthors) => void;
  onView?: (publication: PublicationWithAuthors) => void;
  isDragging?: boolean;
}

export function PublicationCard({
  publication,
  onEdit,
  onDelete,
  onView,
  isDragging,
}: PublicationCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Format authors for display
  const formatAuthors = () => {
    const authors = publication.publication_authors;
    if (!authors || authors.length === 0) return "No authors";

    if (authors.length <= 3) {
      return authors.map((a) => a.name).join(", ");
    }

    return `${authors[0].name} et al.`;
  };

  // Find first/corresponding author
  const getAuthorBadge = () => {
    const authors = publication.publication_authors;
    if (!authors || authors.length === 0) return null;

    const firstAuthor = authors.find(
      (a) => a.author_role === "first" || a.author_role === "co-first"
    );
    const corresponding = authors.find((a) => a.is_corresponding);

    if (firstAuthor) {
      return (
        <span className="text-xs text-blue-600 dark:text-blue-400">
          {AUTHOR_ROLE_LABELS[firstAuthor.author_role]}
        </span>
      );
    }
    if (corresponding) {
      return (
        <span className="text-xs text-purple-600 dark:text-purple-400">
          Corresponding
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      {/* Header: Type badge and menu */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            PUBLICATION_TYPE_COLORS[publication.publication_type]
          )}
        >
          {PUBLICATION_TYPE_LABELS[publication.publication_type]}
        </span>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border bg-popover py-1 shadow-lg">
                {onView && (
                  <button
                    onClick={() => {
                      onView(publication);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <FileText className="h-4 w-4" />
                    View Details
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(publication);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(publication);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h3
        className="mb-2 line-clamp-2 text-sm font-medium leading-tight cursor-pointer hover:text-primary"
        onClick={() => onView?.(publication)}
      >
        {publication.title}
      </h3>

      {/* Authors */}
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{formatAuthors()}</span>
        {getAuthorBadge()}
      </div>

      {/* Journal/venue and year */}
      {(publication.journal || publication.year) && (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          {publication.journal && (
            <span className="truncate italic">{publication.journal}</span>
          )}
          {publication.year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {publication.year}
            </span>
          )}
        </div>
      )}

      {/* Footer: DOI and citations */}
      <div className="flex items-center justify-between pt-2 border-t">
        {publication.doi ? (
          <a
            href={`https://doi.org/${publication.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 className="h-3 w-3" />
            DOI
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No DOI</span>
        )}

        {publication.citation_count !== undefined && publication.citation_count > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Quote className="h-3 w-3" />
            {publication.citation_count} citations
          </span>
        )}
      </div>
    </div>
  );
}

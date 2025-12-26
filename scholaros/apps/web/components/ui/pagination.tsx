"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { getPageNumbers } from "@/lib/hooks/use-pagination";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showItemCount?: boolean;
  compact?: boolean;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showItemCount = true,
  compact = false,
}: PaginationProps) {
  const pageNumbers = getPageNumbers(page, totalPages, compact ? 5 : 7);

  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  if (totalItems === 0) return null;

  const buttonBaseClass = "flex items-center justify-center rounded-xl border text-sm transition-all duration-200 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className={cn(
        "flex items-center",
        compact ? "gap-2" : "justify-between gap-4 flex-wrap"
      )}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Item count */}
      {showItemCount && !compact && (
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {startIndex + 1}-{endIndex}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalItems}</span>{" "}
          items
        </div>
      )}

      {/* Page buttons */}
      <div className="flex items-center gap-1.5">
        {/* First page */}
        {!compact && (
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPreviousPage}
            className={cn(buttonBaseClass, "h-9 w-9")}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* Previous page */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          className={cn(buttonBaseClass, "h-9 w-9")}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((pageNum, index) =>
          pageNum === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition-all duration-200",
                pageNum === page
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border hover:bg-muted"
              )}
              aria-label={`Go to page ${pageNum}`}
              aria-current={pageNum === page ? "page" : undefined}
            >
              {pageNum}
            </button>
          )
        )}

        {/* Next page */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className={cn(buttonBaseClass, "h-9 w-9")}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Last page */}
        {!compact && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            className={cn(buttonBaseClass, "h-9 w-9")}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Page size selector */}
      {showPageSizeSelector && onPageSizeChange && !compact && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="input-base h-9 w-auto py-0 text-sm"
            aria-label="Items per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
      )}
    </div>
  );
}

/**
 * Simple pagination with just prev/next buttons
 */
interface SimplePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SimplePagination({
  page,
  totalPages,
  onPageChange,
}: SimplePaginationProps) {
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Pagination" role="navigation">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPreviousPage}
        className="btn-ghost inline-flex items-center gap-1.5"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>
      <span className="text-sm font-medium px-3 py-1.5 rounded-lg bg-muted" aria-live="polite">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
        className="btn-ghost inline-flex items-center gap-1.5"
        aria-label="Go to next page"
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

/**
 * Load more button for infinite scroll style pagination
 */
interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  hasMore: boolean;
  loadedCount: number;
  totalCount: number;
}

export function LoadMoreButton({
  onClick,
  isLoading,
  hasMore,
  loadedCount,
  totalCount,
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-6" role="region" aria-label="Load more items">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="btn-ghost inline-flex items-center gap-2"
        aria-busy={isLoading}
        aria-label={isLoading ? "Loading more items" : `Load more items. Currently showing ${loadedCount} of ${totalCount}`}
      >
        {isLoading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </>
        ) : (
          "Load More"
        )}
      </button>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(loadedCount / totalCount) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {loadedCount} of {totalCount}
        </span>
      </div>
    </div>
  );
}

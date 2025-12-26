"use client";

import { useState, useCallback } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
}

export interface UsePaginationReturn<T> {
  // Current state
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

  // Computed values
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;

  // Actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;

  // Helper for slicing data
  paginateData: (data: T[]) => T[];

  // For API pagination
  offset: number;
  limit: number;
}

/**
 * Hook for managing pagination state
 *
 * Can be used in two modes:
 * 1. Client-side pagination: Pass data array to paginateData()
 * 2. Server-side pagination: Use offset/limit for API requests
 */
export function usePagination<T = unknown>(
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    initialPageSize = 20,
    totalItems: externalTotalItems,
  } = options;

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [internalTotalItems, setInternalTotalItems] = useState(0);

  const totalItems = externalTotalItems ?? internalTotalItems;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure page is within bounds
  const boundedPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (boundedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const hasNextPage = boundedPage < totalPages;
  const hasPreviousPage = boundedPage > 1;
  const isFirstPage = boundedPage === 1;
  const isLastPage = boundedPage === totalPages;

  const setPage = useCallback(
    (newPage: number) => {
      const bounded = Math.min(Math.max(1, newPage), totalPages);
      setPageState(bounded);
    },
    [totalPages]
  );

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1); // Reset to first page when changing page size
  }, []);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPageState((p) => p + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPageState((p) => p - 1);
    }
  }, [hasPreviousPage]);

  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(totalPages);
  }, [totalPages]);

  // For client-side pagination
  const paginateData = useCallback(
    (data: T[]): T[] => {
      // Update internal total items count
      if (data.length !== internalTotalItems && externalTotalItems === undefined) {
        setInternalTotalItems(data.length);
      }
      return data.slice(startIndex, startIndex + pageSize);
    },
    [startIndex, pageSize, internalTotalItems, externalTotalItems]
  );

  // For server-side pagination
  const offset = startIndex;
  const limit = pageSize;

  return {
    page: boundedPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    paginateData,
    offset,
    limit,
  };
}

/**
 * Generate page numbers for pagination UI
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | "ellipsis")[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  const halfVisible = Math.floor((maxVisible - 3) / 2); // -3 for first, last, and one ellipsis

  // Always show first page
  pages.push(1);

  // Calculate range around current page
  let rangeStart = Math.max(2, currentPage - halfVisible);
  let rangeEnd = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust if at the beginning
  if (currentPage <= halfVisible + 2) {
    rangeEnd = Math.min(totalPages - 1, maxVisible - 2);
  }

  // Adjust if at the end
  if (currentPage >= totalPages - halfVisible - 1) {
    rangeStart = Math.max(2, totalPages - maxVisible + 3);
  }

  // Add ellipsis before range if needed
  if (rangeStart > 2) {
    pages.push("ellipsis");
  }

  // Add range
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis after range if needed
  if (rangeEnd < totalPages - 1) {
    pages.push("ellipsis");
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

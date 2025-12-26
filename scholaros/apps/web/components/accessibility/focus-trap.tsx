"use client";

import { useEffect, useRef, useCallback, ReactNode } from "react";

/**
 * Focus Trap Component
 *
 * Traps keyboard focus within a container. Essential for modal dialogs,
 * dropdown menus, and other overlay components to meet WCAG 2.1 AA.
 *
 * Features:
 * - Traps Tab/Shift+Tab within the container
 * - Returns focus to trigger element on close
 * - Supports Escape key to close
 */

interface FocusTrapProps {
  children: ReactNode;
  /** Whether the focus trap is active */
  active?: boolean;
  /** Element to return focus to when trap is deactivated */
  returnFocusTo?: HTMLElement | null;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Auto-focus the first focusable element */
  autoFocus?: boolean;
  /** CSS class for the container */
  className?: string;
}

const FOCUSABLE_SELECTORS = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function FocusTrap({
  children,
  active = true,
  returnFocusTo,
  onEscape,
  autoFocus = true,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => el.offsetParent !== null); // Filter out hidden elements
  }, []);

  // Handle Tab key navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active) return;

      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab from first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab from last element -> go to first
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
        return;
      }
    },
    [active, getFocusableElements, onEscape]
  );

  // Set up focus trap
  useEffect(() => {
    if (!active) return;

    // Store current active element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Auto-focus first focusable element
    if (autoFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // Small delay to ensure DOM is ready
        requestAnimationFrame(() => {
          focusableElements[0].focus();
        });
      }
    }

    // Add keyboard listener
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      // Return focus to previous element or specified element
      const returnTo = returnFocusTo || previousActiveElement.current;
      if (returnTo && typeof returnTo.focus === "function") {
        returnTo.focus();
      }
    };
  }, [active, autoFocus, getFocusableElements, handleKeyDown, returnFocusTo]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

/**
 * useArrowKeyNavigation Hook
 *
 * Enables arrow key navigation within a list of items.
 * Useful for menus, listboxes, and other composite widgets.
 */

interface UseArrowKeyNavigationOptions {
  /** Total number of items */
  itemCount: number;
  /** Whether navigation wraps around */
  wrap?: boolean;
  /** Whether to use horizontal (Left/Right) instead of vertical (Up/Down) */
  horizontal?: boolean;
  /** Callback when selection changes */
  onSelect?: (index: number) => void;
}

export function useArrowKeyNavigation({
  itemCount,
  wrap = true,
  horizontal = false,
  onSelect,
}: UseArrowKeyNavigationOptions) {
  const selectedIndex = useRef(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const prevKey = horizontal ? "ArrowLeft" : "ArrowUp";
      const nextKey = horizontal ? "ArrowRight" : "ArrowDown";

      if (e.key === prevKey) {
        e.preventDefault();
        let newIndex = selectedIndex.current - 1;
        if (newIndex < 0) {
          newIndex = wrap ? itemCount - 1 : 0;
        }
        selectedIndex.current = newIndex;
        onSelect?.(newIndex);
      } else if (e.key === nextKey) {
        e.preventDefault();
        let newIndex = selectedIndex.current + 1;
        if (newIndex >= itemCount) {
          newIndex = wrap ? 0 : itemCount - 1;
        }
        selectedIndex.current = newIndex;
        onSelect?.(newIndex);
      } else if (e.key === "Home") {
        e.preventDefault();
        selectedIndex.current = 0;
        onSelect?.(0);
      } else if (e.key === "End") {
        e.preventDefault();
        selectedIndex.current = itemCount - 1;
        onSelect?.(itemCount - 1);
      }
    },
    [itemCount, wrap, horizontal, onSelect]
  );

  return {
    selectedIndex: selectedIndex.current,
    setSelectedIndex: (index: number) => {
      selectedIndex.current = index;
    },
    handleKeyDown,
  };
}

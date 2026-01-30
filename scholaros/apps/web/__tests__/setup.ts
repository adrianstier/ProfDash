import React from "react";
import { afterEach, vi } from "vitest";

// Make React globally available for JSX
globalThis.React = React;

// Provide a full localStorage mock for environments where it may be incomplete
// (needed for Zustand persist middleware)
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.setItem !== "function") {
  const store: Record<string, string> = {};
  const localStorageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
  }
}

// Only run browser-specific setup in jsdom environment
if (typeof window !== "undefined") {
  // Import jest-dom matchers for component tests
  import("@testing-library/jest-dom/vitest");

  // Dynamic import cleanup
  import("@testing-library/react").then(({ cleanup }) => {
    afterEach(() => {
      cleanup();
    });
  });

  // Mock next/navigation
  vi.mock("next/navigation", () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    }),
    useSearchParams: () => ({
      get: vi.fn(),
    }),
    usePathname: () => "/",
  }));

  // Mock ResizeObserver (used by some UI components)
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  global.ResizeObserver = ResizeObserverMock;

  // Mock IntersectionObserver
  class IntersectionObserverMock implements IntersectionObserver {
    root: Element | null = null;
    rootMargin: string = "";
    thresholds: ReadonlyArray<number> = [];
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  global.IntersectionObserver = IntersectionObserverMock;

  // Mock matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

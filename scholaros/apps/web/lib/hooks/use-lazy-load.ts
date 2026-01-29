"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseLazyLoadOptions {
  /**
   * Root margin for the Intersection Observer
   * @default "100px"
   */
  rootMargin?: string;
  /**
   * Threshold for the Intersection Observer (0-1)
   * @default 0
   */
  threshold?: number;
  /**
   * Whether lazy loading is enabled
   * @default true
   */
  enabled?: boolean;
  /**
   * Callback when element becomes visible
   */
  onVisible?: () => void;
}

interface UseLazyLoadReturn {
  /**
   * Ref to attach to the element to observe
   */
  ref: React.RefObject<HTMLElement | null>;
  /**
   * Whether the element is currently visible
   */
  isVisible: boolean;
  /**
   * Whether the element has ever been visible (for "load once" patterns)
   */
  hasBeenVisible: boolean;
}

/**
 * Hook for lazy loading content using Intersection Observer
 *
 * @example
 * // Basic usage - load content when visible
 * function LazyImage({ src }: { src: string }) {
 *   const { ref, hasBeenVisible } = useLazyLoad();
 *   return (
 *     <div ref={ref}>
 *       {hasBeenVisible ? <Image src={src} /> : <Placeholder />}
 *     </div>
 *   );
 * }
 *
 * @example
 * // With callback
 * function LazyChart({ onLoad }: { onLoad: () => void }) {
 *   const { ref, hasBeenVisible } = useLazyLoad({
 *     rootMargin: "200px",
 *     onVisible: onLoad,
 *   });
 *   return (
 *     <div ref={ref}>
 *       {hasBeenVisible ? <ExpensiveChart /> : <ChartSkeleton />}
 *     </div>
 *   );
 * }
 */
export function useLazyLoad(options: UseLazyLoadOptions = {}): UseLazyLoadReturn {
  const {
    rootMargin = "100px",
    threshold = 0,
    enabled = true,
    onVisible,
  } = options;

  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      setHasBeenVisible(true);
      onVisible?.();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (visible && !hasBeenVisible) {
          setHasBeenVisible(true);
          onVisible?.();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, rootMargin, threshold, hasBeenVisible, onVisible]);

  return { ref, isVisible, hasBeenVisible };
}

interface UseLazyLoadImageOptions {
  /**
   * Placeholder image to show while loading
   */
  placeholder?: string;
  /**
   * Root margin for intersection observer
   * @default "100px"
   */
  rootMargin?: string;
}

interface UseLazyLoadImageReturn {
  /**
   * Ref to attach to the container element
   */
  containerRef: React.RefObject<HTMLElement | null>;
  /**
   * The src to use for the image (placeholder or actual)
   */
  src: string | undefined;
  /**
   * Whether the image is loading
   */
  isLoading: boolean;
  /**
   * Whether the image has loaded successfully
   */
  isLoaded: boolean;
  /**
   * Whether there was an error loading the image
   */
  hasError: boolean;
}

/**
 * Hook for lazy loading images with placeholder support
 *
 * @example
 * function LazyImage({ src, alt }: { src: string; alt: string }) {
 *   const { containerRef, src: imageSrc, isLoading } = useLazyLoadImage(src, {
 *     placeholder: "/placeholder.png",
 *   });
 *
 *   return (
 *     <div ref={containerRef} className={isLoading ? "blur-sm" : ""}>
 *       <img src={imageSrc} alt={alt} />
 *     </div>
 *   );
 * }
 */
export function useLazyLoadImage(
  actualSrc: string | undefined,
  options: UseLazyLoadImageOptions = {}
): UseLazyLoadImageReturn {
  const { placeholder, rootMargin = "100px" } = options;
  const containerRef = useRef<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Use lazy load to determine when to start loading
  useLazyLoad({
    rootMargin,
    onVisible: useCallback(() => setShouldLoad(true), []),
  });

  // Load image when visible
  useEffect(() => {
    if (!shouldLoad || !actualSrc) return;

    const img = new window.Image();

    img.onload = () => {
      setIsLoading(false);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
    };

    img.src = actualSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [shouldLoad, actualSrc]);

  const src = shouldLoad && !hasError ? actualSrc : placeholder;

  return {
    containerRef,
    src,
    isLoading: shouldLoad && isLoading,
    isLoaded,
    hasError,
  };
}

/**
 * Hook for infinite scroll / load more patterns
 *
 * @example
 * function InfiniteList({ onLoadMore, hasMore }: Props) {
 *   const { ref, isNearEnd } = useInfiniteScroll({
 *     onLoadMore,
 *     hasMore,
 *     threshold: 0.5,
 *   });
 *
 *   return (
 *     <div>
 *       {items.map(item => <Item key={item.id} item={item} />)}
 *       <div ref={ref}>{hasMore && <Loader />}</div>
 *     </div>
 *   );
 * }
 */
interface UseInfiniteScrollOptions {
  /**
   * Callback when the sentinel element is visible
   */
  onLoadMore: () => void;
  /**
   * Whether there is more content to load
   */
  hasMore: boolean;
  /**
   * Whether loading is in progress
   */
  isLoading?: boolean;
  /**
   * Root margin for the observer
   * @default "200px"
   */
  rootMargin?: string;
  /**
   * Threshold for the observer
   * @default 0
   */
  threshold?: number;
}

interface UseInfiniteScrollReturn {
  /**
   * Ref to attach to the sentinel element at the end of the list
   */
  ref: React.RefObject<HTMLElement | null>;
  /**
   * Whether the sentinel is currently visible
   */
  isNearEnd: boolean;
}

export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): UseInfiniteScrollReturn {
  const { onLoadMore, hasMore, isLoading = false, rootMargin = "200px", threshold = 0 } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [isNearEnd, setIsNearEnd] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsNearEnd(visible);

        if (visible && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore, rootMargin, threshold]);

  return { ref, isNearEnd };
}

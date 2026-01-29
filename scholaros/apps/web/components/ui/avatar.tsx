"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
  /**
   * Width in pixels (for Next.js Image optimization)
   * @default 40
   */
  width?: number;
  /**
   * Height in pixels (for Next.js Image optimization)
   * @default 40
   */
  height?: number;
  /**
   * Use unoptimized image loading (for external URLs that may not support optimization)
   * @default true for external URLs
   */
  unoptimized?: boolean;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, width = 40, height = 40, unoptimized, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    // Reset error state when src changes
    React.useEffect(() => {
      setHasError(false);
    }, [src]);

    if (!src || hasError) {
      return null;
    }

    // Determine if this is an external URL
    const isExternal = src.startsWith("http://") || src.startsWith("https://");
    // Use unoptimized for external URLs by default (to avoid Next.js image optimization domain issues)
    const shouldBeUnoptimized = unoptimized ?? isExternal;

    return (
      <Image
        ref={ref as React.Ref<HTMLImageElement>}
        src={src}
        alt={alt || "Avatar"}
        width={width}
        height={height}
        className={cn("aspect-square h-full w-full object-cover", className)}
        onError={() => setHasError(true)}
        unoptimized={shouldBeUnoptimized}
        // Priority loading for above-the-fold avatars can be added via props
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };

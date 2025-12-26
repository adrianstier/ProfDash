"use client";

/**
 * Skip Link Component
 *
 * Provides keyboard users a way to skip repetitive navigation and jump
 * directly to the main content. This is a WCAG 2.1 AA requirement.
 *
 * The link is visually hidden until focused, then appears at the top
 * of the viewport.
 */

interface SkipLinkProps {
  /** Target element ID to skip to (without #) */
  targetId?: string;
  /** Custom label for the skip link */
  label?: string;
}

export function SkipLink({
  targetId = "main-content",
  label = "Skip to main content",
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      {label}
    </a>
  );
}

/**
 * Multiple Skip Links Component
 *
 * For pages with multiple sections, provides skip links to each major area.
 */

interface SkipLinkItem {
  targetId: string;
  label: string;
}

interface SkipLinksProps {
  links: SkipLinkItem[];
}

export function SkipLinks({ links }: SkipLinksProps) {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:left-4 focus-within:top-4 focus-within:z-[100] focus-within:flex focus-within:flex-col focus-within:gap-2 focus-within:rounded-md focus-within:border focus-within:bg-background focus-within:p-2 focus-within:shadow-lg">
      {links.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById(link.targetId);
            if (target) {
              target.focus();
              target.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted focus:bg-primary focus:text-primary-foreground focus:outline-none"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

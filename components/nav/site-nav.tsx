"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Root,
  List,
  Item,
  Trigger,
  Content,
  Link as NavLink,
  Viewport,
  Indicator,
} from "@radix-ui/react-navigation-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavNode = {
  label: string;
  href: string;
  entryId: string;
  openInNewTab?: boolean;
  rel?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageEntryId?: string;
  children?: NavNode[];
};

function chunkForColumns<T>(items: T[], columns: number): T[][] {
  if (columns <= 1 || items.length <= columns) return [items];
  const perCol = Math.ceil(items.length / columns);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perCol) out.push(items.slice(i, i + perCol));
  return out;
}

const triggerBase =
  "group inline-flex h-10 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground " +
  "focus:outline-none disabled:pointer-events-none disabled:opacity-50 " +
  "data-[state=open]:bg-accent/60 data-[state=open]:text-accent-foreground";

function TopLevelLink({ node, index }: { node: NavNode; index: number }) {
  return (
    <Item>
      <NavLink asChild>
        <Link
          href={node.href}
          target={node.openInNewTab ? "_blank" : undefined}
          rel={node.rel || undefined}
          className={triggerBase}
          data-contentful-entry-id={node.entryId}
          data-contentful-field-id="label"
          data-nav-index={index}
        >
          {node.label}
        </Link>
      </NavLink>
    </Item>
  );
}

function TopLevelWithFlyout({ node, index }: { node: NavNode; index: number }) {
  const children = node.children ?? [];
  const columnCount = children.length >= 12 ? 4 : children.length >= 7 ? 3 : 2;
  const columns = chunkForColumns(children, columnCount);

  const hasDescription = Boolean(node.description);
  const hasImage = Boolean(node.imageUrl);
  const hasOverviewLink = Boolean(node.href && node.href !== "#");
  const showLeftColumn = hasDescription || hasImage || hasOverviewLink;

  return (
    <Item>
      <Trigger
        className={triggerBase}
        data-contentful-entry-id={node.entryId}
        data-contentful-field-id="label"
        data-nav-index={index}
      >
        {node.label}
        <ChevronDown
          aria-hidden
          className="relative top-[1px] ml-1 h-3.5 w-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180"
        />
      </Trigger>
      <Content
        className={cn(
          "left-0 top-0 w-full",
          // Crossfade between sibling panels — the Indicator handles the
          // horizontal "where did that come from" signal.
          "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out",
          "data-[motion^=from-]:fade-in-0 data-[motion^=to-]:fade-out-0",
          "duration-300 ease-out"
        )}
      >
        <div className="mx-auto max-w-7xl px-8 py-10">
          <div
            className={cn(
              "grid gap-10",
              showLeftColumn ? "grid-cols-12" : "grid-cols-1"
            )}
          >
            {showLeftColumn && (
              <div className="col-span-4 flex flex-col">
                {hasImage && (
                  <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={node.imageUrl}
                      alt={node.imageAlt ?? node.label}
                      className="h-full w-full object-cover"
                      data-contentful-entry-id={node.imageEntryId}
                      data-contentful-field-id="file"
                    />
                  </div>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {node.label}
                </p>
                {hasDescription && (
                  <p
                    className="text-sm text-muted-foreground leading-relaxed mb-4"
                    data-contentful-entry-id={node.entryId}
                    data-contentful-field-id="description"
                  >
                    {node.description}
                  </p>
                )}
                {hasOverviewLink && (
                  <Link
                    href={node.href}
                    target={node.openInNewTab ? "_blank" : undefined}
                    rel={node.rel || undefined}
                    className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    data-contentful-entry-id={node.entryId}
                    data-contentful-field-id="label"
                  >
                    Shop all {node.label}
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            )}

            <div
              className={cn(
                "grid gap-x-10 gap-y-8",
                showLeftColumn ? "col-span-8" : "",
                columnCount === 2 && "grid-cols-2",
                columnCount === 3 && "grid-cols-3",
                columnCount === 4 && "grid-cols-4"
              )}
            >
              {columns.map((col, ci) => (
                <div key={`col-${ci}`} className="flex flex-col gap-5">
                  {col.map((child, li) => (
                    <FlyoutBranch
                      key={`${ci}-${li}-${child.entryId}`}
                      node={child}
                      level={2}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Content>
    </Item>
  );
}

/**
 * Recursive branch renderer for the mega-menu.
 *
 * Rendered levels (`level` param):
 *   2 — column header    (bold section title, "High Chairs")
 *   3 — sub-item         (muted link under the header, "6-month starter")
 *   4 — deep sub-item    (smaller, indented under a border, "Wheels")
 *   5+ — dropped         (won't render — nav depth limit)
 *
 * The tree can be as deep as the editor makes it (header.tsx builds up to
 * 5 levels of navigationItem). Anything below `MAX_RENDER_LEVEL` is
 * silently truncated so the panel stays scannable — editors who need
 * deeper hierarchies should link to a category landing page and continue
 * the nav there.
 */
const MAX_RENDER_LEVEL = 4;

function FlyoutBranch({ node, level }: { node: NavNode; level: number }) {
  if (level > MAX_RENDER_LEVEL) return null;
  const children = node.children ?? [];
  const hasChildren = children.length > 0 && level < MAX_RENDER_LEVEL;

  const linkClass = cn(
    "block leading-tight transition-colors",
    level === 2 &&
      "text-sm font-semibold text-foreground hover:text-primary mb-2",
    level === 3 && "text-sm text-muted-foreground hover:text-primary",
    level === 4 && "text-xs text-muted-foreground/80 hover:text-primary"
  );

  const listClass = cn(
    "flex flex-col",
    level === 2 && "gap-2",
    level === 3 && "gap-1.5 ml-3 mt-1.5 border-l border-border/60 pl-3"
  );

  return (
    <div className="flex flex-col">
      <NavLink asChild>
        <Link
          href={node.href}
          target={node.openInNewTab ? "_blank" : undefined}
          rel={node.rel || undefined}
          className={linkClass}
          data-contentful-entry-id={node.entryId}
          data-contentful-field-id="label"
        >
          {node.label}
        </Link>
      </NavLink>
      {hasChildren && (
        <ul className={listClass}>
          {children.map((child, i) => (
            <li key={`br-${level}-${i}-${child.entryId}`}>
              <FlyoutBranch node={child} level={level + 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Measure the bottom edge of the *wrapping `<nav>` element* — NOT Root
 * itself — in viewport coordinates.
 *
 * Root sits vertically centered inside the nav's `py-3` padding, so
 * Root's bottom is ~12px above the nav's actual bottom border. Anchoring
 * the panel to Root leaves a visible gap where the cursor can leave the
 * hover-active area and Radix closes the panel. Anchoring to the nav
 * instead makes the panel sit flush against the nav's bottom border.
 *
 * Falls back to Root's own bottom if no `<nav>` ancestor exists (e.g.
 * standalone rendering outside the header).
 */
function useAnchorBottom(ref: React.RefObject<HTMLElement | null>) {
  const [bottom, setBottom] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anchor = (el.closest("nav") as HTMLElement | null) ?? el;
    const update = () => setBottom(anchor.getBoundingClientRect().bottom);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(anchor);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);

  return bottom;
}

export default function SiteNav({ items }: { items: NavNode[] }) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const anchorBottom = useAnchorBottom(rootRef);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!items || items.length === 0) return null;

  return (
    <Root
      ref={rootRef}
      // Hover intent: open reasonably quickly (150ms) but stay very
      // forgiving on leave — a full second before requiring the open
      // delay again. Diagonal cursor travel across the nav no longer
      // dismisses the panel.
      delayDuration={150}
      skipDelayDuration={1000}
      className="relative z-40 flex items-center"
    >
      <List className="flex list-none items-center gap-1">
        {items.map((node, i) =>
          node.children && node.children.length > 0 ? (
            <TopLevelWithFlyout key={`nav-${i}-${node.entryId}`} node={node} index={i} />
          ) : (
            <TopLevelLink key={`nav-${i}-${node.entryId}`} node={node} index={i} />
          )
        )}
        {/*
          Radix's `Indicator` — a small pointer that slides horizontally to
          align with whichever trigger is currently open. Radix drives its
          position via internal CSS vars and transitions it automatically.
          This is what makes the panel feel "aware" of the trigger without
          moving the panel itself.
        */}
        <Indicator
          className={cn(
            // `top-[calc(100%+12px)]` pushes the indicator down past
            // Root's bottom to sit at the nav's actual bottom border
            // (Root is centered inside the nav's py-3 padding, so its
            // bottom is 12px shy of the nav's edge). The arrow now
            // visually kisses the panel's top border instead of
            // floating in mid-air.
            "absolute top-[calc(100%+12px)] z-[45] flex h-3 items-end justify-center overflow-visible",
            "transition-[width,transform] duration-300 ease-out",
            "data-[state=visible]:animate-in data-[state=hidden]:animate-out",
            "data-[state=visible]:fade-in-0 data-[state=hidden]:fade-out-0"
          )}
        >
          <div className="relative h-2.5 w-2.5 translate-y-1/2 rotate-45 border-l border-t bg-popover shadow-[-1px_-1px_1px_-1px_rgba(0,0,0,0.08)]" />
        </Indicator>
      </List>

      {/*
        Portal the Viewport out of the header so it escapes the header's
        `backdrop-filter` containing block. Radix wires the Viewport to
        the Root via React context — DOM position doesn't matter, only
        the React parent chain. So a portal here is safe.

        `position: fixed; top: N; left: 0; right: 0` gives a truly
        full-viewport-width panel, always glued to the trigger row's
        bottom edge (updated via ResizeObserver + scroll listener).
      */}
      {mounted &&
        createPortal(
          <div
            className="fixed left-0 right-0 z-40 w-screen"
            style={{ top: `${anchorBottom}px` }}
          >
            <Viewport
              className={cn(
                "relative w-screen overflow-hidden border-y bg-popover text-popover-foreground shadow-lg",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                "data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2",
                "duration-300 ease-out"
              )}
            />
          </div>,
          document.body
        )}
    </Root>
  );
}

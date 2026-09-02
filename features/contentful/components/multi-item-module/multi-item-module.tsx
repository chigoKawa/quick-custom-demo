"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { RevealItem } from "@/features/animations/in-view";
import { useTracking } from "@/features/tracking/use-tracking";
import { cn } from "@/lib/utils";

export type MultiItemLayout = "carousel" | "grid" | "strip" | "list" | "value-prop";
export type BackgroundTheme = "default" | "brand" | "alt" | "none";

export type MultiItemModuleItem = {
  id: string;
  contentType: string;
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  href?: string;
  icon?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Shallow {sys, fields} snapshot of the source entry. When present,
   *  the rendered card subscribes to live updates on this entry and
   *  overrides displayed fields on the fly. Only populated for content
   *  types we want to keep editor-live (e.g. generalTopic). */
  liveEntry?: { sys: { id: string; contentType?: { sys: { id: string } } }; fields: Record<string, unknown> };
};

type ActionButton = {
  label: string;
  href: string;
  metricEventName?: string;
  entryId?: string;
};

type Props = {
  entryId?: string;
  title?: string;
  subtitle?: string;
  items: MultiItemModuleItem[];
  layout: MultiItemLayout;
  columns?: number;
  autoplay?: boolean;
  autoplayDelayMs?: number;
  showArrows?: boolean;
  showDots?: boolean;
  backgroundTheme?: BackgroundTheme;
  isLogoContent?: boolean;
  actionButton?: ActionButton;
};

const backgroundThemeClasses: Record<BackgroundTheme, string> = {
  default: "bg-background",
  brand: "bg-primary/5",
  alt: "bg-secondary",
  none: "",
};

export default function MultiItemModule({
  entryId,
  title,
  subtitle,
  items,
  layout,
  columns = 3,
  autoplay = false,
  autoplayDelayMs = 5000,
  showArrows = true,
  showDots = true,
  backgroundTheme = "default",
  isLogoContent = false,
  actionButton,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const inspectorProps = useContentfulInspectorMode({ entryId: entryId || "" });
  const { trackMetric } = useTracking();

  const safeItems = Array.isArray(items) ? items.filter((item) => item && item.id) : [];

  const nextSlide = useCallback(() => {
    if (safeItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % safeItems.length);
  }, [safeItems.length]);

  const prevSlide = useCallback(() => {
    if (safeItems.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length);
  }, [safeItems.length]);

  useEffect(() => {
    if (!autoplay || layout !== "carousel" || safeItems.length <= 1) return;
    const timer = setInterval(nextSlide, autoplayDelayMs);
    return () => clearInterval(timer);
  }, [autoplay, autoplayDelayMs, layout, safeItems.length, nextSlide]);

  if (safeItems.length === 0) return null;

  const renderCarousel = () => {
    const visibleCount = Math.min(columns, safeItems.length);
    const cardWidthClass =
      columns <= 2
        ? "w-[85vw] sm:w-[calc(50%-8px)]"
        : columns === 4
        ? "w-[80vw] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
        : "w-[80vw] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]";

    return <CarouselTrack
      items={safeItems}
      cardWidthClass={cardWidthClass}
      visibleCount={visibleCount}
      showArrows={showArrows}
      showDots={showDots}
      autoplay={autoplay}
      currentIndex={currentIndex}
      setCurrentIndex={setCurrentIndex}
      prevSlide={prevSlide}
      nextSlide={nextSlide}
    />;
  };

  const renderGrid = () => {
    const gridCols = {
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
    };

    return (
      <div className={cn("grid gap-6", gridCols[columns as keyof typeof gridCols] || gridCols[3])}>
        {safeItems.map((item, idx) => (
          <RevealItem key={item.id} index={idx}>
            <ItemCard item={item} />
          </RevealItem>
        ))}
      </div>
    );
  };

  const renderStrip = () => {
    // Render two identical tracks side by side; each scrolls left by 100% of its own width.
    // When track-1 has fully scrolled out, it wraps back — track-2 fills the gap seamlessly.
    const trackItems = safeItems;
    const duration = `${Math.max(trackItems.length * 4, 10)}s`;

    const track = (keyPrefix: string) => (
      <div
        className="flex-shrink-0 flex items-center gap-16 px-8"
        style={{
          animationName: 'marquee',
          animationDuration: duration,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        {trackItems.map((item, idx) => (
          <LogoItem key={`${keyPrefix}-${item.id}-${idx}`} item={item} darkBg={layout === "strip"} />
        ))}
      </div>
    );

    return (
      <div className={cn("rounded-xl py-10 overflow-hidden", layout === "strip" ? "bg-zinc-900" : "")}>
        <div className="flex">
          {track("a")}
          {track("b")}
        </div>
      </div>
    );
  };

  const renderList = () => {
    return (
      <div className="flex flex-col gap-4">
        {safeItems.map((item, idx) => (
          <RevealItem key={item.id} index={idx}>
            <ListItem item={item} />
          </RevealItem>
        ))}
      </div>
    );
  };

  const renderValueProp = () => {
    const gridCols = {
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    };
    return (
      <div className={cn("grid gap-8", gridCols[Math.min(columns, 4) as keyof typeof gridCols] || gridCols[3])}>
        {safeItems.map((item, idx) => (
          <RevealItem key={item.id} index={idx}>
            <ValuePropCard item={item} />
          </RevealItem>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    // Logos always use marquee scrolling regardless of layout setting
    if (isLogoContent) {
      return renderStrip();
    }
    switch (layout) {
      case "carousel":
        return renderCarousel();
      case "grid":
        return renderGrid();
      case "strip":
        return renderStrip();
      case "list":
        return renderList();
      case "value-prop":
        return renderValueProp();
      default:
        return renderGrid();
    }
  };

  return (
    <section
      className={cn("py-12 md:py-16", backgroundThemeClasses[backgroundTheme])}
      {...inspectorProps({ fieldId: "internalName" })}
    >
    
      <div className="max-w-7xl mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-10">
            {title && (
              <h2
                {...inspectorProps({ fieldId: "title" })}
                className="text-3xl md:text-4xl font-semibold tracking-tight mb-3"
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                {...inspectorProps({ fieldId: "subtitle" })}
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {renderContent()}
        {actionButton && (
          <div className="flex justify-center mt-10">
            <Button asChild variant="default" size="lg">
              <Link
                href={actionButton.href}
                onClick={() => {
                  trackMetric("module_cta_clicked", {
                    entryId: actionButton.entryId ?? entryId ?? "",
                    label: actionButton.label,
                    href: actionButton.href,
                    ...(actionButton.metricEventName ? { metricEventName: actionButton.metricEventName } : {}),
                  });
                }}
              >
                {actionButton.label}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ImageSkeleton() {
  return (
    <div className="aspect-[16/10] bg-muted animate-pulse flex items-center justify-center">
      <svg
        className="w-12 h-12 text-muted-foreground/30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

function CarouselTrack({
  items,
  cardWidthClass,
  visibleCount,
  showArrows,
  showDots,
  autoplay,
  currentIndex,
  setCurrentIndex,
  prevSlide,
  nextSlide,
}: {
  items: MultiItemModuleItem[];
  cardWidthClass: string;
  visibleCount: number;
  showArrows: boolean;
  showDots: boolean;
  autoplay: boolean;
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  prevSlide: () => void;
  nextSlide: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll the track to align the currentIndex card at the left edge
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[currentIndex] as HTMLElement | undefined;
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  }, [currentIndex]);

  return (
    <div className="relative px-6">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item) => (
          <div key={item.id} className={cn("flex-shrink-0 snap-start", cardWidthClass)}>
            <ItemCard item={item} />
          </div>
        ))}
      </div>

      {showArrows && !autoplay && items.length > visibleCount && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-[calc(50%-16px)] -translate-y-1/2 rounded-full bg-background shadow-md z-10"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-[calc(50%-16px)] -translate-y-1/2 rounded-full bg-background shadow-md z-10"
            onClick={nextSlide}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {showDots && items.length > visibleCount && (
        <div className="flex justify-center gap-2 mt-6">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function flattenRichTextNodes(rt: unknown): string | undefined {
  if (!rt || typeof rt !== "object") return undefined;
  const content = (rt as { content?: Array<{ content?: Array<{ value?: string }> }> }).content;
  if (!Array.isArray(content)) return undefined;
  const text = content
    .map((block) =>
      (block.content ?? [])
        .map((n) => n.value ?? "")
        .join("")
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return text || undefined;
}

function ItemCard({ item }: { item: MultiItemModuleItem }) {
  // Inspector-mode props pinned to the source entry (e.g. generalTopic) when
  // we have one, so clicking a tile opens the right entry for editing.
  const inspectorEntryId = item.liveEntry?.sys?.id ?? item.id;
  const inspectorProps = useContentfulInspectorMode({ entryId: inspectorEntryId });

  // Subscribe to live updates on the source entry. For content types with no
  // liveEntry (heroModule, blogPost, etc.) this no-ops on a null subscription.
  const live = useContentfulLiveUpdates(item.liveEntry ?? null) as
    | { fields?: Record<string, unknown> }
    | null;

  // Overlay live field values onto the seeded data. Only fields the renderer
  // reads matter; we map by content type so the right source-entry field
  // wins over the seeded value.
  let title = item.title;
  let description = item.description;
  let imageUrl = item.imageUrl;
  let imageAlt = item.imageAlt;

  if (live?.fields) {
    if (item.contentType === "generalTopic") {
      const liveTitle = live.fields.title as string | undefined;
      const liveTagline = live.fields.tagline as string | undefined;
      const liveBody = flattenRichTextNodes(live.fields.body);
      const liveMedia = live.fields.media as { fields?: { file?: { url?: string }; title?: string } } | undefined;
      const liveMediaUrl = liveMedia?.fields?.file?.url;
      const fullLiveMediaUrl = liveMediaUrl?.startsWith("//") ? `https:${liveMediaUrl}` : liveMediaUrl;

      if (liveTitle !== undefined) title = liveTitle;
      // generalTopic.tagline maps to card description (matches the
      // wrapper's initial extraction below).
      if (liveBody !== undefined) description = liveBody;
      else if (liveTagline !== undefined) description = liveTagline;
      if (fullLiveMediaUrl !== undefined) imageUrl = fullLiveMediaUrl;
      if (liveMedia?.fields?.title !== undefined) imageAlt = liveMedia.fields.title;
    }
  }

  const content = (
    <div className="group relative overflow-hidden rounded-xl bg-card border shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="aspect-[16/10] overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageAlt || title || ""}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ImageSkeleton />
        )}
      </div>
      <div className="p-4">
        {title && (
          <h3
            {...inspectorProps({ fieldId: "title" })}
            className="font-semibold text-lg mb-1 line-clamp-2"
          >
            {title}
          </h3>
        )}
        {item.subtitle && (
          <p className="text-sm text-muted-foreground mb-2">{item.subtitle}</p>
        )}
        {description && (
          <p
            {...inspectorProps({ fieldId: item.contentType === "generalTopic" ? "body" : "description" })}
            className="text-sm text-muted-foreground line-clamp-3"
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );

  if (item.href) {
    return <Link href={item.href}>{content}</Link>;
  }

  return content;
}

function LogoItem({ item, darkBg = false }: { item: MultiItemModuleItem; darkBg?: boolean }) {
  const content = (
    <div className="flex-shrink-0 flex items-center justify-center transition-opacity duration-300 opacity-90 hover:opacity-100">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.imageAlt || item.title || "Logo"}
          className={cn("h-8 w-auto object-contain", darkBg && "brightness-0 invert")}
          style={{ maxWidth: '160px' }}
          loading="lazy"
        />
      ) : (
        <span className={cn("text-sm font-medium whitespace-nowrap", darkBg ? "text-white" : "text-foreground")}>{item.title}</span>
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} target="_blank" rel="noopener noreferrer">
        {content}
      </Link>
    );
  }

  return content;
}

function ValuePropCard({ item }: { item: MultiItemModuleItem }) {
  const content = (
    <div className="flex flex-col items-center text-center gap-4 p-6">
      {item.icon ? (
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.icon} alt="" aria-hidden="true" className="w-8 h-8 object-contain" />
        </div>
      ) : item.imageUrl ? (
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.imageAlt || ""} className="w-full h-full object-cover" />
        </div>
      ) : null}
      {item.title && (
        <h3 className="font-semibold text-lg leading-snug">{item.title}</h3>
      )}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      )}
      {(item.ctaLabel && item.ctaHref) && (
        <Link
          href={item.ctaHref}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline mt-auto"
        >
          {item.ctaLabel}
        </Link>
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow block">
        {content}
      </Link>
    );
  }

  return <div className="rounded-2xl border bg-card shadow-sm">{content}</div>;
}

function ListItem({ item }: { item: MultiItemModuleItem }) {
  const content = (
    <div className="flex gap-4 p-4 rounded-lg bg-card border hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.imageAlt || item.title || ""}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {item.title && <h3 className="font-semibold mb-1">{item.title}</h3>}
        {item.subtitle && (
          <p className="text-sm text-muted-foreground mb-1">{item.subtitle}</p>
        )}
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        )}
      </div>
    </div>
  );

  if (item.href) {
    return <Link href={item.href}>{content}</Link>;
  }

  return content;
}

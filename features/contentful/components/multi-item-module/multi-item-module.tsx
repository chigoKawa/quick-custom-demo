"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";

export type MultiItemLayout = "carousel" | "grid" | "strip" | "list";
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
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const inspectorProps = useContentfulInspectorMode({ entryId: entryId || "" });

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
    
    return (
      <div className="relative">
   
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
            }}
          >
            {safeItems.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 px-2"
                style={{ width: `${100 / visibleCount}%` }}
              >
                <ItemCard item={item} />
              </div>
            ))}
          </div>
        </div>

        {showArrows && !autoplay && safeItems.length > visibleCount && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-background shadow-md z-10"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full bg-background shadow-md z-10"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {showDots && safeItems.length > visibleCount && (
          <div className="flex justify-center gap-2 mt-6">
            {safeItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  idx === currentIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-border hover:bg-muted-foreground"
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
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
        {safeItems.map((item) => (
          <ItemCard key={item.id} item={item} />
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
        {safeItems.map((item) => (
          <ListItem key={item.id} item={item} />
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

function ItemCard({ item }: { item: MultiItemModuleItem }) {
  const content = (
    <div className="group relative overflow-hidden rounded-xl bg-card border shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="aspect-[16/10] overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.imageAlt || item.title || ""}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ImageSkeleton />
        )}
      </div>
      <div className="p-4">
        {item.title && (
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{item.title}</h3>
        )}
        {item.subtitle && (
          <p className="text-sm text-muted-foreground mb-2">{item.subtitle}</p>
        )}
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
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

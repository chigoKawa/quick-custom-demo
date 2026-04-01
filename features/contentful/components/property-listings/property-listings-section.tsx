"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";
import type { IPropertyListings } from "../../type";

// ─── Types ────────────────────────────────────────────────────────────────────

type RichPropertyCard = {
  entryId: string;
  propertyId: string;
  slug: string;
  /** Contentful editorial title takes priority over PMS name */
  displayName: string;
  city: string;
  address: string;
  heroImageUrl?: string;
  shortDescription?: string;
  startingPrice?: number;
  currency?: string;
  rating?: number;
  amenities?: string[];
};

type Layout = "grid" | "carousel" | "list";
type BackgroundTheme = "default" | "brand" | "dark" | "none";

// ─── Theme helpers ────────────────────────────────────────────────────────────

const bgClasses: Record<BackgroundTheme, string> = {
  default: "bg-background",
  brand: "bg-primary/5",
  dark: "bg-zinc-950",
  none: "",
};

const textClasses: Record<
  BackgroundTheme,
  { heading: string; sub: string; body: string }
> = {
  default: {
    heading: "text-foreground",
    sub: "text-muted-foreground",
    body: "text-muted-foreground",
  },
  brand: {
    heading: "text-foreground",
    sub: "text-muted-foreground",
    body: "text-muted-foreground",
  },
  dark: {
    heading: "text-white",
    sub: "text-white/70",
    body: "text-white/60",
  },
  none: {
    heading: "text-foreground",
    sub: "text-muted-foreground",
    body: "text-muted-foreground",
  },
};

// ─── Contentful entry helpers ─────────────────────────────────────────────────

function extractStubs(
  rawProperties: Array<Record<string, unknown>>
): Array<{ entryId: string; propertyId: string; editorialTitle?: string }> {
  return rawProperties.flatMap((entry) => {
    const sys = entry?.sys as Record<string, unknown> | undefined;
    const fields = entry?.fields as Record<string, unknown> | undefined;
    if (!sys?.id || !fields) return [];
    const propertyId = fields.propertyId as string | undefined;
    if (!propertyId) return [];
    return [
      {
        entryId: sys.id as string,
        propertyId,
        editorialTitle: fields.editorialTitle as string | undefined,
      },
    ];
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  entry: IPropertyListings;
  locale?: string;
}

export default function PropertyListingsSection({
  entry,
  locale = "en-US",
}: Props) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });
  const [activeIndex, setActiveIndex] = useState(0);
  const [cards, setCards] = useState<RichPropertyCard[]>([]);
  const [loading, setLoading] = useState(true);

  const rawProperties = (entry.fields.properties ?? []) as unknown as Array<
    Record<string, unknown>
  >;
  const stubs = extractStubs(rawProperties);

  const layout = (entry.fields.layout ?? "grid") as Layout;
  const columns = Math.min(Math.max(entry.fields.columns ?? 3, 1), 4);
  const theme = (entry.fields.backgroundTheme ?? "default") as BackgroundTheme;
  const title = entry.fields.title as string | undefined;
  const subtitle = entry.fields.subtitle as string | undefined;
  const body = entry.fields.body as string | undefined;
  const ctaLabel = entry.fields.ctaLabel as string | undefined;
  const ctaUrl = entry.fields.ctaUrl as string | undefined;
  const colors = textClasses[theme];

  // Fetch PMS data for each property stub
  useEffect(() => {
    if (stubs.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      const results = await Promise.all(
        stubs.map(async (stub) => {
          try {
            const res = await fetch(
              `/api/integrations/properties/${stub.propertyId}`
            );
            if (!res.ok) return null;
            const json = await res.json();
            const pms = json.property;
            if (!pms) return null;

            // Lowest starting price across room types
            const startingPrice: number | undefined =
              pms.rates && pms.rates.length > 0
                ? Math.min(...pms.rates.map((r: { pricePerWeek: number }) => r.pricePerWeek))
                : pms.roomTypes && pms.roomTypes.length > 0
                ? Math.min(
                    ...pms.roomTypes.map(
                      (rt: { pricePerWeek: number }) => rt.pricePerWeek
                    )
                  )
                : undefined;

            const card: RichPropertyCard = {
              entryId: stub.entryId,
              propertyId: stub.propertyId,
              slug: pms.slug,
              displayName: stub.editorialTitle ?? pms.name,
              city: pms.city,
              address: pms.address,
              heroImageUrl: pms.heroImageUrl,
              shortDescription: pms.shortDescription,
              startingPrice,
              currency: pms.rates?.[0]?.currency ?? "GBP",
              rating: pms.rating,
              amenities: pms.amenities?.slice(0, 3),
            };
            return card;
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setCards(results.filter((c): c is RichPropertyCard => Boolean(c)));
        setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stubs.map((s) => s.propertyId).join(",")]);

  const next = useCallback(
    () => setActiveIndex((i) => (i + 1) % cards.length),
    [cards.length]
  );
  const prev = useCallback(
    () => setActiveIndex((i) => (i - 1 + cards.length) % cards.length),
    [cards.length]
  );

  const gridColClass: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={cn("py-16 md:py-24", bgClasses[theme])}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {(title || subtitle || body) && (
          <div className="mb-12 max-w-3xl">
            {title && (
              <h2
                {...inspectorProps({ fieldId: "title" })}
                className={cn(
                  "text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight",
                  colors.heading
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                {...inspectorProps({ fieldId: "subtitle" })}
                className={cn("text-lg font-medium mb-3", colors.sub)}
              >
                {subtitle}
              </p>
            )}
            {body && (
              <p
                {...inspectorProps({ fieldId: "body" })}
                className={cn("text-base leading-relaxed", colors.body)}
              >
                {body}
              </p>
            )}
          </div>
        )}

        {/* Skeleton while loading */}
        {loading && (
          <div
            className={cn(
              "grid gap-6 md:gap-8",
              gridColClass[columns] ?? gridColClass[3]
            )}
          >
            {stubs.map((s) => (
              <CardSkeleton key={s.entryId} theme={theme} />
            ))}
          </div>
        )}

        {/* Grid layout */}
        {!loading && layout === "grid" && cards.length > 0 && (
          <div
            {...inspectorProps({ fieldId: "properties" })}
            className={cn(
              "grid gap-6 md:gap-8",
              gridColClass[columns] ?? gridColClass[3]
            )}
          >
            {cards.map((card) => (
              <PropertyCard
                key={card.propertyId}
                card={card}
                locale={locale}
                theme={theme}
              />
            ))}
          </div>
        )}

        {/* Carousel layout */}
        {!loading && layout === "carousel" && cards.length > 0 && (
          <div
            className="relative"
            {...inspectorProps({ fieldId: "properties" })}
          >
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{
                  transform: `translateX(-${
                    activeIndex * (100 / Math.min(columns, cards.length))
                  }%)`,
                }}
              >
                {cards.map((card) => (
                  <div
                    key={card.propertyId}
                    className="flex-shrink-0 px-3"
                    style={{
                      width: `${100 / Math.min(columns, cards.length)}%`,
                    }}
                  >
                    <PropertyCard card={card} locale={locale} theme={theme} />
                  </div>
                ))}
              </div>
            </div>
            {cards.length > columns && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous"
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={next}
                  aria-label="Next"
                  className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                <div className="flex justify-center gap-2 mt-6">
                  {cards.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === activeIndex
                          ? "w-8 bg-primary"
                          : "w-1.5 bg-border hover:bg-muted-foreground"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* List layout */}
        {!loading && layout === "list" && cards.length > 0 && (
          <div
            className="flex flex-col gap-4"
            {...inspectorProps({ fieldId: "properties" })}
          >
            {cards.map((card) => (
              <PropertyListItem
                key={card.propertyId}
                card={card}
                locale={locale}
                theme={theme}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        {ctaLabel && (
          <div className="mt-14 flex justify-center">
            <Link
              href={ctaUrl ?? `/${locale}/properties`}
              className={cn(
                "inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-sm transition-all duration-200",
                theme === "dark"
                  ? "bg-white text-zinc-950 hover:bg-white/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              )}
              {...inspectorProps({ fieldId: "ctaLabel" })}
            >
              {ctaLabel}
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Card skeleton ────────────────────────────────────────────────────────────

function CardSkeleton({ theme }: { theme: BackgroundTheme }) {
  const isDark = theme === "dark";
  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden border animate-pulse",
        isDark
          ? "bg-white/5 border-white/10"
          : "bg-card border-border/50"
      )}
    >
      <div
        className={cn(
          "aspect-[16/10]",
          isDark ? "bg-white/10" : "bg-muted"
        )}
      />
      <div className="p-5 space-y-3">
        <div
          className={cn(
            "h-5 rounded-md w-3/4",
            isDark ? "bg-white/10" : "bg-muted"
          )}
        />
        <div
          className={cn(
            "h-3.5 rounded w-1/2",
            isDark ? "bg-white/5" : "bg-muted/60"
          )}
        />
        <div
          className={cn(
            "h-3.5 rounded w-2/3",
            isDark ? "bg-white/5" : "bg-muted/60"
          )}
        />
        <div
          className={cn(
            "h-8 rounded-xl w-1/3 mt-2",
            isDark ? "bg-white/10" : "bg-muted"
          )}
        />
      </div>
    </div>
  );
}

// ─── Grid / carousel card ─────────────────────────────────────────────────────

function PropertyCard({
  card,
  locale,
  theme,
}: {
  card: RichPropertyCard;
  locale: string;
  theme: BackgroundTheme;
}) {
  const isDark = theme === "dark";

  return (
    <Link
      href={`/${locale}/properties/${card.propertyId}`}
      className="group block h-full"
    >
      <article
        className={cn(
          "h-full rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col",
          isDark
            ? "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
            : "bg-card border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1"
        )}
      >
        {/* Hero image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted flex-shrink-0">
          {card.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.heroImageUrl}
              alt={card.displayName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center",
                isDark
                  ? "bg-white/5"
                  : "bg-gradient-to-br from-primary/10 to-primary/5"
              )}
            >
              <span
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold",
                  isDark
                    ? "bg-white/10 text-white/50"
                    : "bg-primary/15 text-primary/50"
                )}
              >
                {card.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* City pill */}
          {card.city && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/40 backdrop-blur-sm text-white shadow-sm">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {card.city}
            </span>
          )}

          {/* Rating badge */}
          {card.rating && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/90 text-amber-950 shadow-sm">
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {card.rating.toFixed(1)}
            </span>
          )}

          {/* View arrow on hover */}
          <div className="absolute inset-0 flex items-end justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shadow-lg",
                isDark
                  ? "bg-white text-zinc-950"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          {/* Name + address */}
          <div>
            <h3
              className={cn(
                "font-bold text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors",
                isDark ? "text-white group-hover:text-white/80" : ""
              )}
            >
              {card.displayName}
            </h3>
            {card.address && (
              <p
                className={cn(
                  "text-sm mt-0.5 line-clamp-1",
                  isDark ? "text-white/50" : "text-muted-foreground"
                )}
              >
                {card.address}
              </p>
            )}
          </div>

          {/* Short description */}
          {card.shortDescription && (
            <p
              className={cn(
                "text-sm leading-relaxed line-clamp-2",
                isDark ? "text-white/60" : "text-muted-foreground"
              )}
            >
              {card.shortDescription}
            </p>
          )}

          {/* Amenity chips */}
          {card.amenities && card.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.amenities.map((a) => (
                <span
                  key={a}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium",
                    isDark
                      ? "bg-white/10 text-white/70"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          {card.startingPrice && (
            <div className="mt-auto pt-3 border-t border-border/30 flex items-baseline justify-between">
              <div>
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    isDark ? "text-white/40" : "text-muted-foreground/60"
                  )}
                >
                  From
                </span>
                <p
                  className={cn(
                    "text-xl font-bold leading-none mt-0.5",
                    isDark ? "text-white" : "text-foreground"
                  )}
                >
                  £{card.startingPrice}
                  <span
                    className={cn(
                      "text-sm font-normal ml-1",
                      isDark ? "text-white/50" : "text-muted-foreground"
                    )}
                  >
                    / week
                  </span>
                </p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full",
                  isDark
                    ? "bg-white/10 text-white/80"
                    : "bg-primary/10 text-primary"
                )}
              >
                View rooms
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function PropertyListItem({
  card,
  locale,
  theme,
}: {
  card: RichPropertyCard;
  locale: string;
  theme: BackgroundTheme;
}) {
  const isDark = theme === "dark";

  return (
    <Link
      href={`/${locale}/properties/${card.propertyId}`}
      className="group"
    >
      <article
        className={cn(
          "flex gap-5 p-4 rounded-2xl border transition-all duration-200",
          isDark
            ? "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
            : "bg-card border-border/50 hover:shadow-md hover:border-border"
        )}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-36 h-28 rounded-xl overflow-hidden bg-muted relative">
          {card.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.heroImageUrl}
              alt={card.displayName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center",
                isDark
                  ? "bg-white/5"
                  : "bg-gradient-to-br from-primary/10 to-primary/5"
              )}
            >
              <span
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
                  isDark
                    ? "bg-white/10 text-white/50"
                    : "bg-primary/15 text-primary/50"
                )}
              >
                {card.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Rating overlay */}
          {card.rating && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold bg-amber-400/90 text-amber-950">
              <svg
                className="w-2.5 h-2.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {card.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-1",
                isDark ? "text-white" : ""
              )}
            >
              {card.displayName}
            </h3>
            {card.startingPrice && (
              <p
                className={cn(
                  "flex-shrink-0 text-sm font-bold whitespace-nowrap",
                  isDark ? "text-white" : "text-foreground"
                )}
              >
                £{card.startingPrice}
                <span
                  className={cn(
                    "text-xs font-normal",
                    isDark ? "text-white/50" : "text-muted-foreground"
                  )}
                >
                  {" "}
                  / wk
                </span>
              </p>
            )}
          </div>

          {card.city && (
            <p
              className={cn(
                "text-sm flex items-center gap-1",
                isDark ? "text-white/60" : "text-muted-foreground"
              )}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {card.city}
              {card.address && (
                <span
                  className={cn(
                    "truncate",
                    isDark ? "text-white/40" : "text-muted-foreground/60"
                  )}
                >
                  · {card.address}
                </span>
              )}
            </p>
          )}

          {card.shortDescription && (
            <p
              className={cn(
                "text-sm line-clamp-2 leading-relaxed",
                isDark ? "text-white/50" : "text-muted-foreground"
              )}
            >
              {card.shortDescription}
            </p>
          )}

          {card.amenities && card.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {card.amenities.map((a) => (
                <span
                  key={a}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    isDark
                      ? "bg-white/10 text-white/60"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 self-center pl-2">
          <svg
            className={cn(
              "w-5 h-5 transition-transform group-hover:translate-x-1",
              isDark ? "text-white/30" : "text-muted-foreground/30"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </article>
    </Link>
  );
}

"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LongText } from "@/features/contentful/components/long-text";

interface ProductData {
  id: string;
  title: string;
  price: number;
  currency?: string;
  image?: string;
  sku?: string;
  category?: string;
}

function formatPrice(price: number, currency?: string): string {
  const c = (currency ?? "NOK").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 2 }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}

interface ProductCategoryShelfProps {
  entry: any;
  locale?: string;
}

const MAX_PRODUCTS = 8;

function resolveField(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return (obj["en-US"] ?? Object.values(obj)[0]) as string | undefined;
  }
  return undefined;
}

export default function ProductCategoryShelf({ entry, locale }: ProductCategoryShelfProps) {
  const fields = entry?.fields;
  const categoryId = resolveField(fields?.commerceCategoryId);
  const title = resolveField(fields?.title);
  const description = resolveField(fields?.description);

  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    fetch(`/api/integrations/products?category=${categoryId}&limit=${MAX_PRODUCTS}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProducts(
            data.products.map((p: any) => ({
              id: p.id,
              title: p.title,
              price: p.price,
              currency: p.currency,
              image: p.images?.[0],
              sku: p.sku,
              category: p.category,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categoryId]);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(checkScroll);
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, products.length]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth =
      el.querySelector<HTMLElement>("[data-shelf-card]")?.offsetWidth ?? 220;
    const gap = 16;
    const count = window.innerWidth < 640 ? 1 : 2;
    el.scrollBy({
      left: direction === "left" ? -(cardWidth + gap) * count : (cardWidth + gap) * count,
      behavior: "smooth",
    });
  }, []);

  if (!categoryId) return null;

  if (loading) {
    return (
      <div className="my-10 py-12 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="my-10 py-8 md:py-12 bg-gradient-to-b from-muted/40 to-background rounded-2xl border border-border/40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 gap-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 truncate">
                {title}
              </h3>
            )}
            {description && (
              <LongText
                text={description}
                className="text-sm md:text-base text-muted-foreground max-w-xl"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={cn(
                "w-9 h-9 rounded-full border border-border/60 bg-background flex items-center justify-center transition-all",
                canScrollLeft
                  ? "hover:bg-muted cursor-pointer shadow-sm"
                  : "opacity-30 cursor-default"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={cn(
                "w-9 h-9 rounded-full border border-border/60 bg-background flex items-center justify-center transition-all",
                canScrollRight
                  ? "hover:bg-muted cursor-pointer shadow-sm"
                  : "opacity-30 cursor-default"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Product strip */}
        <div className="relative">
          <div
            className={cn(
              "pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-muted/40 to-transparent transition-opacity",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2 -mb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/en-US/products/${product.id}`}
                data-shelf-card
                className="group block snap-start shrink-0 w-[65vw] xs:w-[55vw] sm:w-[200px] md:w-[220px]"
              >
                <article className="h-full bg-card rounded-xl overflow-hidden border border-border/40 shadow-sm hover:shadow-lg hover:border-border transition-all duration-300 hover:-translate-y-0.5">
                  <div className="aspect-square overflow-hidden bg-muted/50 relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <svg className="w-10 h-10 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-1.5">
                      {product.title}
                    </h4>
                    {product.price > 0 && (
                      <p className="text-base font-bold text-primary">
                        {formatPrice(product.price, product.currency)}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-muted/40 to-transparent transition-opacity",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </div>
    </section>
  );
}

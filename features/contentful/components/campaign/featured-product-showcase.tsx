"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatProductPrice, type CampaignProduct } from "@/lib/campaign-products";

type Props = {
  product: CampaignProduct;
  /** "web" is two-column at desktop; "mobile" stacks for a ~390px viewport. */
  variant?: "web" | "mobile";
  className?: string;
};

/**
 * A campaign's featured product, given the same prominence the in-store display
 * gives it: when a campaign names a product, that product is the story.
 *
 * Shared by the public campaign page and the mobile preview so the two cannot
 * drift. The in-store display composes its own signage layout instead — it has
 * different constraints (viewing distance, one glanceable message) and is
 * deliberately not this component.
 */
export default function FeaturedProductShowcase({
  product,
  variant = "web",
  className,
}: Props) {
  const isMobile = variant === "mobile";
  const price =
    typeof product.price === "number"
      ? formatProductPrice(product.price, product.currency)
      : null;

  if (!product.title && !product.image) return null;

  return (
    <section
      className={cn("w-full border-b border-border bg-secondary/30", className)}
      aria-label="Featured product"
    >
      <div
        className={cn(
          isMobile
            ? "flex flex-col"
            : "mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:gap-12 md:py-14"
        )}
      >
        {/* Image. Commerce packshots are shot on white, so contain-fit on a white
            ground rather than cover — cover crops the garment. */}
        {product.image && (
          <div
            className={cn(
              "overflow-hidden bg-white",
              isMobile ? "aspect-[4/5] w-full" : "aspect-[4/5] w-full rounded-xl"
            )}
          >
            <img
              src={product.image}
              alt={product.title}
              className="h-full w-full object-contain"
            />
          </div>
        )}

        {/* Copy */}
        <div className={cn(isMobile && "px-4 py-5")}>
          <p
            className={cn(
              "font-semibold uppercase tracking-widest text-muted-foreground",
              isMobile ? "text-[11px]" : "text-xs"
            )}
          >
            Featured product
          </p>

          {product.title && (
            <h2
              className={cn(
                "mt-2 font-bold tracking-tight text-foreground",
                isMobile ? "text-xl leading-snug" : "text-3xl md:text-4xl"
              )}
            >
              {product.title}
            </h2>
          )}

          {price && (
            <p
              className={cn(
                "mt-3 font-bold tabular-nums text-primary",
                isMobile ? "text-2xl" : "text-4xl"
              )}
            >
              {price}
            </p>
          )}

          {product.category && (
            <p
              className={cn(
                "mt-3 text-muted-foreground",
                isMobile ? "text-xs" : "text-sm"
              )}
            >
              {product.category.replace(/-/g, " ")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

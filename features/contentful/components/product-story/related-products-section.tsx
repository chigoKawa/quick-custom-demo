"use client";

import React from "react";
import Link from "next/link";
import type { RelatedProductStory } from "@/lib/related-product-stories";
import { useMicrocopyHelper } from "@/hooks/use-microcopy";
import type { MicrocopyDataMap } from "@/lib/microcopy";

function buildHref(post: RelatedProductStory): string {
  const path = `/stories/${post.slug}`;
  const prefix = post.locale === post.defaultLocale ? "" : `/${post.locale}`;
  return `${prefix}${path}`;
}

export default function RelatedProductsSection({
  products,
  microcopy,
}: {
  products: RelatedProductStory[];
  microcopy?: MicrocopyDataMap | null;
}) {
  const t = useMicrocopyHelper(microcopy);

  if (products.length === 0) return null;

  const title = t("product.relatedProducts.title", "Related products");

  return (
    <section className="py-20 md:py-28 bg-muted/40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          {/* <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            You may also like
          </p> */}
          <h2
            className="text-3xl sm:text-4xl font-serif font-medium tracking-tight leading-tight text-foreground"
            {...title.inspectorProps}
          >
            {title.value}
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} microcopy={microcopy} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  microcopy,
}: {
  product: RelatedProductStory;
  microcopy?: MicrocopyDataMap | null;
}) {
  const t = useMicrocopyHelper(microcopy);
  const viewLabel = t("product.relatedProducts.viewLabel", "View");
  const href = buildHref(product);

  return (
    <Link
      href={href}
      className="group block rounded-2xl overflow-hidden bg-background border border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
    >
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-muted relative">
        {product.productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${product.productImage}?w=480&h=480&fit=fill&f=center`}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-muted-foreground/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {product.productCategory && (
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            {product.productCategory}
          </p>
        )}
        <h3 className="text-sm sm:text-base font-medium leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {product.title}
        </h3>

        {/* Price + story angle pills */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {typeof product.price === "number" && product.price > 0 ? (
            <span className="text-sm sm:text-base font-semibold text-foreground">
              &pound;{product.price.toFixed(2)}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors duration-200">
            <span {...viewLabel.inspectorProps}>{viewLabel.value}</span>
            <svg
              className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </span>
        </div>

        {/* Story angles (optional) */}
        {product.storyAngles && product.storyAngles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {product.storyAngles.slice(0, 2).map((angle) => (
              <span
                key={angle}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
              >
                {angle}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

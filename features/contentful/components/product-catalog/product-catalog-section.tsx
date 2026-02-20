"use client";

import React from "react";
import Link from "next/link";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";
import type { IProductCatalog } from "../../type";
import ActionButtonRender from "../hero-banner/action-button-render";
import { useTracking, type MetricEventName } from "@/features/tracking/use-tracking";

interface ProductData {
  id: string;
  title: string;
  price: number;
  image?: string;
  sku?: string;
  category?: string;
}

interface ProductCatalogSectionProps {
  entry: IProductCatalog;
}

/**
 * ProductCatalogSection renders products from the JSON field.
 * - Single product: CTA-style side-by-side layout
 * - Multiple products: Clickable grid with prices
 */
export default function ProductCatalogSection({ entry }: ProductCatalogSectionProps) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });
  const { trackMetric } = useTracking();

  const title = entry.fields.title;
  const body = entry.fields.body;
  const metricEventName = (entry.fields as unknown as { metricEventName?: MetricEventName }).metricEventName;
  const listId = entry.sys.id; // Use entry ID as list identifier
  const productsData = entry.fields.products as {
    selectionMode?: "single" | "multiple";
    selectedProduct?: ProductData;
    selectedProducts?: ProductData[];
  } | null;
  const ctaButton = entry.fields.cta;

  // Extract products from the JSON field
  const products: ProductData[] = [];
  if (productsData) {
    if (productsData.selectionMode === "single" && productsData.selectedProduct) {
      products.push(productsData.selectedProduct);
    } else if (productsData.selectionMode === "multiple" && productsData.selectedProducts) {
      products.push(...productsData.selectedProducts);
    } else if (productsData.selectedProduct) {
      // Fallback for legacy data
      products.push(productsData.selectedProduct);
    } else if (productsData.selectedProducts) {
      products.push(...productsData.selectedProducts);
    }
  }

  if (products.length === 0) {
    return null; // Don't render if no products
  }

  // Helper to check if price should be shown
  const shouldShowPrice = (price: number) => price > 0;

  // Single product: CTA-style layout
  if (products.length === 1) {
    const product = products[0];
    const showPrice = shouldShowPrice(product.price);
    
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        {/* Background decorative elements */}
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Product Image */}
            <div className="order-1 lg:order-1 relative group">
              
              <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted shadow-2xl ring-1 ring-black/5">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <svg className="w-12 h-12 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              {/* Floating badge */}
              {product.category && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium shadow-lg ring-1 ring-black/5">
                  {product.category}
                </div>
              )}
            </div>

            {/* Text Section */}
            <div className="order-2 lg:order-2 space-y-6">
              <div>
                <h2
                  {...inspectorProps({ fieldId: "title" })}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
                >
                  {title}
                </h2>

                {body && (
                  <p
                    {...inspectorProps({ fieldId: "body" })}
                    className="text-lg text-muted-foreground max-w-lg leading-relaxed"
                  >
                    {body}
                  </p>
                )}
              </div>

              {/* Product Info Card */}
              <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold leading-tight">{product.title}</h3>
                  {showPrice && (
                    <span className="shrink-0 text-2xl md:text-3xl font-bold text-primary">
                      £{product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                {product.sku && (
                  <p className="text-sm text-muted-foreground font-mono">SKU: {product.sku}</p>
                )}
              </div>

              {/* CTA Button */}
              <div className="flex items-center gap-4 pt-2">
                {ctaButton ? (
                  <ActionButtonRender buttons={[ctaButton]} metricEventName={metricEventName} />
                ) : (
                  <Link
                    href={`/en-US/products/${product.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                    onClick={() => {
                      if (metricEventName) {
                        trackMetric(metricEventName, {
                          product_id: product.sku || product.id,
                          position: 1,
                          list_id: listId,
                          variant: "single",
                          productTitle: product.title,
                          productPrice: product.price,
                        });
                      }
                    }}
                  >
                    View Product
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Multiple products: Grid layout
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4"
          >
            {title}
          </h2>
          {body && (
            <p
              {...inspectorProps({ fieldId: "body" })}
              className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              {body}
            </p>
          )}
        </div>

        {/* Products Grid */}
        <div
          {...inspectorProps({ fieldId: "products" })}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {products.map((product, index) => {
            const showPrice = shouldShowPrice(product.price);
            const position = index + 1; // 1-indexed position
            
            return (
              <Link
                key={product.id}
                href={`/en-US/products/${product.id}`}
                className="group block"
                onClick={() => {
                  if (metricEventName) {
                    trackMetric(metricEventName, {
                      product_id: product.sku || product.id,
                      position,
                      list_id: listId,
                      variant: "grid",
                      productTitle: product.title,
                      productPrice: product.price,
                    });
                  }
                }}
              >
                <article className="h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-border transition-all duration-300 hover:-translate-y-1">
                  {/* Product Image */}
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <svg className="w-12 h-12 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    {/* Quick view overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm text-sm font-medium shadow-lg">
                        View Details
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                      {product.title}
                    </h3>
                    {(showPrice || product.category) && (
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        {showPrice && (
                          <p className="text-lg md:text-xl font-bold text-primary">
                            £{product.price.toFixed(2)}
                          </p>
                        )}
                        {product.category && showPrice && (
                          <span className="text-[10px] md:text-xs px-2 py-1 rounded-full bg-muted/80 text-muted-foreground truncate max-w-[80px]">
                            {product.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {/* Optional CTA */}
        {ctaButton && (
          <div className="mt-14 text-center">
            <ActionButtonRender buttons={[ctaButton]} />
          </div>
        )}
      </div>
    </section>
  );
}

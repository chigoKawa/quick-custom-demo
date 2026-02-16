"use client";

import React from "react";
import Link from "next/link";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";
import type { IProductCatalog } from "../../type";
import ActionButtonRender from "../hero-banner/action-button-render";

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

  const title = entry.fields.title;
  const body = entry.fields.body;
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

  // Single product: CTA-style layout
  if (products.length === 1) {
    const product = products[0];
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-background to-muted/30">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Product Image */}
            <div className="order-1 lg:order-1 relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-secondary shadow-xl">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-primary/20 to-primary/5">
                    🛍️
                  </div>
                )}
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Text Section */}
            <div className="order-2 lg:order-2">
              <h2
                {...inspectorProps({ fieldId: "title" })}
                className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance"
              >
                {title}
              </h2>

              {body && (
                <p
                  {...inspectorProps({ fieldId: "body" })}
                  className="text-lg text-muted-foreground mb-6 max-w-md leading-relaxed"
                >
                  {body}
                </p>
              )}

              {/* Product Info */}
              <div className="mb-8 p-6 rounded-xl bg-card border shadow-sm">
                <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
                <p className="text-3xl font-bold text-primary mb-4">
                  £{product.price.toFixed(2)}
                </p>
                {product.sku && (
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                )}
              </div>

              {/* CTA Button */}
              <div className="flex items-center gap-4">
                {ctaButton ? (
                  <ActionButtonRender buttons={[ctaButton]} />
                ) : (
                  <Link
                    href={`/en-US/products/${product.id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    View Product
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
    <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4"
          >
            {title}
          </h2>
          {body && (
            <p
              {...inspectorProps({ fieldId: "body" })}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              {body}
            </p>
          )}
        </div>

        {/* Products Grid */}
        <div
          {...inspectorProps({ fieldId: "products" })}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
        >
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/en-US/products/${product.id}`}
              className="group block"
            >
              <article className="bg-card rounded-lg overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                {/* Product Image */}
                <div className="aspect-square overflow-hidden bg-muted">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary/20 to-primary/5">
                      🛍️
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm md:text-base h-10 md:h-12 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-base md:text-lg font-bold text-primary">
                      £{product.price.toFixed(2)}
                    </p>
                    {product.category && (
                      <span className="text-[10px] md:text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[80px]">
                        {product.category}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Optional CTA */}
        {ctaButton && (
          <div className="mt-12 text-center">
            <ActionButtonRender buttons={[ctaButton]} />
          </div>
        )}
      </div>
    </section>
  );
}

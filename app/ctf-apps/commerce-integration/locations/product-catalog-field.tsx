/* eslint-disable */
// @ts-nocheck — legacy v1 field component, superseded by product-catalog-field-v2.tsx
"use client";

import type { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useEffect, useState, useCallback } from "react";
import type { Product } from "@/lib/integrations/commerce/commerce.interface";
import type { ProductCatalogFieldValue, ProductPreviewState } from "../types";
import { normalizeProductCatalogField, fetchWithTimeout } from "../utils";
import styles from "./product-catalog-field.module.css";

function readInitialValue(value: unknown): ProductCatalogFieldValue {
  if (!value || typeof value !== "object") {
    return { version: 1, selectionMode: "multiple", selectedProducts: [] };
  }

  const v = value as Partial<ProductCatalogFieldValue>;
  return normalizeProductCatalogField({
    selectionMode: v.selectionMode,
    selectedProduct: v.selectedProduct,
    selectedProducts: v.selectedProducts,
  });
}

export default function ProductCatalogField() {
  const sdk = useSDK<FieldAppSDK>();
  const [config, setConfig] = useState<ProductCatalogFieldValue>(() =>
    readInitialValue(sdk.field.getValue())
  );
  const [previewState, setPreviewState] = useState<ProductPreviewState>({ status: "idle" });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk]);

  const saveValue = useCallback(
    (newConfig: ProductCatalogFieldValue) => {
      setConfig(newConfig);
      sdk.field.setValue(newConfig);
    },
    [sdk]
  );

  const loadProductPreview = useCallback(async () => {
    setPreviewState({ status: "loading" });

    try {
      const params = new URLSearchParams();
      
      if (config.mode === "manual" && config.selectedProducts?.length) {
        params.set("limit", String(config.selectedProducts.length));
      } else if (config.mode === "dynamic" && config.filters) {
        if (config.filters.category) params.set("category", config.filters.category);
        if (config.filters.limit) params.set("limit", String(config.filters.limit));
        if (config.filters.sort) params.set("sort", config.filters.sort);
        if (config.filters.minPrice) params.set("minPrice", String(config.filters.minPrice));
        if (config.filters.maxPrice) params.set("maxPrice", String(config.filters.maxPrice));
      } else {
        params.set("limit", "10");
      }

      const result = await fetchWithTimeout<{ products: Product[] }>(
        `/api/integrations/products?${params.toString()}`,
        {},
        8000
      );

      if (!result.ok) {
        setPreviewState({ status: "error", message: result.error });
        return;
      }

      setPreviewState({ status: "success", products: result.data.products });
    } catch (error) {
      setPreviewState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [config]);

  const handleModeChange = (newMode: "manual" | "dynamic") => {
    saveValue({
      ...config,
      mode: newMode,
      selectedProducts: newMode === "manual" ? [] : undefined,
      filters: newMode === "dynamic" ? {} : undefined,
    });
  };

  const handleAddProduct = useCallback(
    (product: Product) => {
      const newProducts = [
        ...(config.selectedProducts || []),
        {
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.images[0],
        },
      ];
      saveValue({ ...config, selectedProducts: newProducts });
    },
    [config, saveValue]
  );

  const handleRemoveProduct = useCallback(
    (productId: string) => {
      const newProducts = (config.selectedProducts || []).filter((p) => p.id !== productId);
      saveValue({ ...config, selectedProducts: newProducts });
    },
    [config, saveValue]
  );

  const handleFilterChange = useCallback(
    (key: string, value: any) => {
      saveValue({
        ...config,
        filters: { ...config.filters, [key]: value || undefined },
      });
    },
    [config, saveValue]
  );

  const selectedCount = config.selectedProducts?.length || 0;
  const isManualMode = config.mode === "manual";
  const isDynamicMode = config.mode === "dynamic";

  return (
    <div className={styles.container}>
      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{selectedCount}</div>
          <div className={styles.statLabel}>Selected</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {previewState.status === "success" ? previewState.products.length : "—"}
          </div>
          <div className={styles.statLabel}>Available</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{config.mode === "manual" ? "Manual" : "Dynamic"}</div>
          <div className={styles.statLabel}>Mode</div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeButton} ${isManualMode ? styles.modeButtonActive : ""}`}
          onClick={() => handleModeChange("manual")}
        >
          🎯 Manual Selection
        </button>
        <button
          className={`${styles.modeButton} ${isDynamicMode ? styles.modeButtonActive : ""}`}
          onClick={() => handleModeChange("dynamic")}
        >
          ⚡ Dynamic Filters
        </button>
      </div>

      {isManualMode && (
        <>
          {/* Search Bar */}
          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search products by title, category, or author..."
              onKeyPress={(e) => e.key === "Enter" && loadProductPreview()}
            />
            <button
              className={styles.searchButton}
              onClick={loadProductPreview}
              disabled={previewState.status === "loading"}
            >
              {previewState.status === "loading" ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Loading State */}
          {previewState.status === "loading" && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <div>Loading products...</div>
            </div>
          )}

          {/* Error State */}
          {previewState.status === "error" && (
            <div className={styles.errorState}>
              <div className={styles.errorTitle}>⚠️ Error Loading Products</div>
              <div className={styles.errorMessage}>{previewState.message}</div>
            </div>
          )}

          {/* Available Products Grid */}
          {previewState.status === "success" && (
            <div className={styles.selectedSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>🛍️ Available Products</div>
                <div className={styles.badge}>{previewState.products.length} items</div>
              </div>
              {previewState.products.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📦</div>
                  <div className={styles.emptyStateText}>
                    No products found. Try a different search query.
                  </div>
                </div>
              ) : (
                <div className={styles.productGrid}>
                  {previewState.products.map((product) => {
                    const isSelected = config.selectedProducts?.some((p) => p.id === product.id);
                    return (
                      <div key={product.id} className={styles.productCard}>
                        {isSelected && <div className={styles.selectedBadge}>✓ Selected</div>}
                        <div className={styles.productImage}>
                          {product.images && product.images[0] ? (
                            <img src={product.images[0]} alt={product.title} />
                          ) : (
                            "📚"
                          )}
                        </div>
                        <div className={styles.productInfo}>
                          <div className={styles.productTitle}>{product.title}</div>
                          <div className={styles.productMeta}>
                            <div className={styles.productPrice}>${product.price.toFixed(2)}</div>
                            {product.category && (
                              <div className={styles.productCategory}>{product.category}</div>
                            )}
                          </div>
                          {product.stock > 0 && (
                            <div className={styles.productStock}>In Stock ({product.stock})</div>
                          )}
                          <div className={styles.productActions}>
                            {isSelected ? (
                              <button
                                className={styles.removeButton}
                                onClick={() => handleRemoveProduct(product.id)}
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                className={styles.addButton}
                                onClick={() => handleAddProduct(product)}
                              >
                                Add to Catalog
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Selected Products */}
          {selectedCount > 0 && (
            <div className={styles.selectedSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>✨ Selected for Catalog</div>
                <div className={styles.badge}>{selectedCount} selected</div>
              </div>
              <div className={styles.productGrid}>
                {config.selectedProducts?.map((product) => (
                  <div key={product.id} className={styles.productCard}>
                    <div className={styles.selectedBadge}>✓ Selected</div>
                    <div className={styles.productImage}>
                      {product.image ? <img src={product.image} alt={product.title} /> : "📚"}
                    </div>
                    <div className={styles.productInfo}>
                      <div className={styles.productTitle}>{product.title}</div>
                      <div className={styles.productMeta}>
                        <div className={styles.productPrice}>${product.price.toFixed(2)}</div>
                      </div>
                      <div className={styles.productActions}>
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveProduct(product.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {selectedCount === 0 && previewState.status === "idle" && (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>🔍</div>
              <div className={styles.emptyStateText}>
                Search for products above to start building your catalog.
                <br />
                You can select multiple products to feature in your content.
              </div>
            </div>
          )}
        </>
      )}

      {isDynamicMode && (
        <>
          {/* Filter Controls */}
          <div className={styles.selectedSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>⚙️ Filter Configuration</div>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                Category
              </label>
              <input
                type="text"
                className={styles.filterInput}
                value={config.filters?.category || ""}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                placeholder="e.g., fiction, textbooks, reference"
              />
            </div>

            <div className={styles.filterGrid}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Min Price ($)
                </label>
                <input
                  type="number"
                  className={styles.filterInput}
                  value={config.filters?.minPrice?.toString() || ""}
                  onChange={(e) => handleFilterChange("minPrice", parseFloat(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Max Price ($)
                </label>
                <input
                  type="number"
                  className={styles.filterInput}
                  value={config.filters?.maxPrice?.toString() || ""}
                  onChange={(e) => handleFilterChange("maxPrice", parseFloat(e.target.value))}
                  placeholder="100"
                />
              </div>
            </div>

            <div className={styles.filterGrid}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Limit
                </label>
                <input
                  type="number"
                  className={styles.filterInput}
                  value={config.filters?.limit?.toString() || ""}
                  onChange={(e) => handleFilterChange("limit", parseInt(e.target.value))}
                  placeholder="10"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Sort By
                </label>
                <select
                  className={styles.filterSelect}
                  value={config.filters?.sort || "popular"}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                >
                  <option value="popular">Most Popular</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            <button className={styles.previewButton} onClick={loadProductPreview}>
              🔄 Preview Products with Filters
            </button>
          </div>

          {/* Loading State */}
          {previewState.status === "loading" && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <div>Loading filtered products...</div>
            </div>
          )}

          {/* Error State */}
          {previewState.status === "error" && (
            <div className={styles.errorState}>
              <div className={styles.errorTitle}>⚠️ Error Loading Products</div>
              <div className={styles.errorMessage}>{previewState.message}</div>
            </div>
          )}

          {/* Preview Results */}
          {previewState.status === "success" && (
            <div className={styles.selectedSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>👁️ Preview Results</div>
                <div className={styles.badge}>{previewState.products.length} products</div>
              </div>
              {previewState.products.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>🔍</div>
                  <div className={styles.emptyStateText}>
                    No products match your filters. Try adjusting the criteria.
                  </div>
                </div>
              ) : (
                <div className={styles.productGrid}>
                  {previewState.products.map((product) => (
                    <div key={product.id} className={styles.productCard}>
                      <div className={styles.productImage}>
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt={product.title} />
                        ) : (
                          "📚"
                        )}
                      </div>
                      <div className={styles.productInfo}>
                        <div className={styles.productTitle}>{product.title}</div>
                        <div className={styles.productMeta}>
                          <div className={styles.productPrice}>${product.price.toFixed(2)}</div>
                          {product.category && (
                            <div className={styles.productCategory}>{product.category}</div>
                          )}
                        </div>
                        {product.stock > 0 && (
                          <div className={styles.productStock}>In Stock ({product.stock})</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

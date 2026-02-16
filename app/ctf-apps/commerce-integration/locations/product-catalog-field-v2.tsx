"use client";

import type { FieldAppSDK, DialogAppSDK } from "@contentful/app-sdk";
import { locations } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useEffect, useState, useCallback } from "react";
import type { Product } from "@/lib/integrations/commerce/commerce.interface";
import type { ProductCatalogFieldValue } from "../types";
import { fetchWithTimeout } from "../utils";
import styles from "./product-catalog-field-v2.module.css";

function readInitialValue(value: unknown): ProductCatalogFieldValue {
  if (!value || typeof value !== "object") {
    return { version: 1, selectionMode: "single" };
  }

  const v = value as Partial<ProductCatalogFieldValue>;
  const mode = v.selectionMode || "single";
  return {
    version: 1,
    selectionMode: mode,
    selectedProduct: mode === "single" ? v.selectedProduct : undefined,
    selectedProducts: mode === "multiple" ? (v.selectedProducts || []) : undefined,
  };
}

export default function ProductCatalogField() {
  const sdk = useSDK<FieldAppSDK | DialogAppSDK>();
  
  // Check if we're in dialog mode first
  const isDialog = sdk.location.is(locations.LOCATION_DIALOG);
  
  // Only access sdk.field if we're in field mode
  const fieldSdk = isDialog ? null : (sdk as FieldAppSDK);
  
  const [config, setConfig] = useState<ProductCatalogFieldValue>(() => {
    if (isDialog) {
      // In dialog mode, get initial config from invocation parameters
      const params = (sdk as DialogAppSDK).parameters?.invocation as any;
      return {
        version: 1,
        selectionMode: params?.mode || "single",
      };
    }
    return readInitialValue(fieldSdk?.field?.getValue());
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(isDialog); // Start loading if in dialog mode
  const [error, setError] = useState<string | null>(null);
  const [tempSelection, setTempSelection] = useState<string[]>(() => {
    if (isDialog) {
      const params = (sdk as DialogAppSDK).parameters?.invocation as any;
      return params?.selectedIds || [];
    }
    return [];
  });

  const saveValue = useCallback(
    (newConfig: ProductCatalogFieldValue) => {
      setConfig(newConfig);
      if (fieldSdk?.field) {
        fieldSdk.field.setValue(newConfig);
      }
    },
    [fieldSdk]
  );

  const loadProducts = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (query) {
        params.set("search", query);
      }

      const result = await fetchWithTimeout<{ products: Product[] }>(
        `/api/integrations/products?${params.toString()}`,
        {},
        8000
      );

      if (!result.ok) {
        setError(result.error);
        setProducts([]);
        return;
      }

      setProducts(result.data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk]);

  // Load products when component mounts in dialog mode
  useEffect(() => {
    if (isDialog) {
      // Fetch products immediately
      const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams();
          params.set("limit", "20");
          const result = await fetchWithTimeout<{ products: Product[] }>(
            `/api/integrations/products?${params.toString()}`,
            {},
            8000
          );
          if (!result.ok) {
            setError(result.error);
            setProducts([]);
          } else {
            setProducts(result.data.products);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setProducts([]);
        } finally {
          setLoading(false);
        }
      };
      fetchProducts();
    }
  }, []);

  const handleOpenModal = useCallback(async () => {
    // Use Contentful's dialog API to open modal outside iframe
    const result = await sdk.dialogs.openCurrentApp({
      title: "Select products",
      width: 1400,
      minHeight: 700,
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      parameters: {
        mode: config.selectionMode,
        selectedIds: config.selectionMode === "single" 
          ? (config.selectedProduct?.id ? [config.selectedProduct.id] : [])
          : (config.selectedProducts || []).map(p => p.id),
      },
    });

    if (result && typeof result === 'object' && 'selectedProducts' in result) {
      const data = result as { selectedProducts: any[], mode: string };
      if (data.mode === "single" && data.selectedProducts.length > 0) {
        saveValue({
          version: 1,
          selectionMode: "single",
          selectedProduct: data.selectedProducts[0],
        });
      } else if (data.mode === "multiple") {
        saveValue({
          version: 1,
          selectionMode: "multiple",
          selectedProducts: data.selectedProducts,
        });
      }
    }
  }, [config, sdk, saveValue]);

  
  const handleDialogClose = useCallback((selectedProducts?: any[]) => {
    if (isDialog) {
      // Cast to any to access close method which exists on dialog SDK
      (sdk as any).close({
        selectedProducts: selectedProducts || [],
        mode: config.selectionMode,
      });
    }
  }, [sdk, isDialog, config.selectionMode]);

  const handleSearch = useCallback(() => {
    loadProducts(searchQuery);
  }, [searchQuery, loadProducts]);

  const handleSelectProduct = useCallback((productId: string) => {
    if (config.selectionMode === "single") {
      setTempSelection([productId]);
    } else {
      setTempSelection(prev => 
        prev.includes(productId)
          ? prev.filter(id => id !== productId)
          : [...prev, productId]
      );
    }
  }, [config.selectionMode]);

  const handleSave = useCallback(() => {
    if (tempSelection.length === 0) {
      handleDialogClose([]);
      return;
    }

    const selectedProds = tempSelection
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => p !== undefined)
      .map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.images?.[0],
        sku: product.sku,
        category: product.category,
      }));

    handleDialogClose(selectedProds);
  }, [tempSelection, products, handleDialogClose]);

  const handleRemove = useCallback(() => {
    saveValue({ version: 1, selectionMode: config.selectionMode });
  }, [saveValue, config.selectionMode]);

  const handleToggleMode = useCallback(() => {
    const newMode = config.selectionMode === "single" ? "multiple" : "single";
    saveValue({
      version: 1,
      selectionMode: newMode,
    });
  }, [config.selectionMode, saveValue]);


  const isSingleMode = config.selectionMode === "single";
  const selectedProduct = config.selectedProduct;
  const selectedProducts = config.selectedProducts || [];
  const hasSelection = isSingleMode ? !!selectedProduct : selectedProducts.length > 0;

  // If in dialog mode, show product selector directly
  if (isDialog) {
    return (
      <div className={styles.container} style={{ padding: 24 }}>
        {/* Search */}
        <div className={styles.modalSearch} style={{ padding: 0, marginBottom: 24, border: 'none' }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search for a product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        {/* Body */}
        <div style={{ minHeight: 500 }}>
          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <div>Loading products...</div>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <div className={styles.errorTitle}>⚠️ Error Loading Products</div>
              <div className={styles.errorMessage}>{error}</div>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>🔍</div>
              <div className={styles.noResultsText}>
                No products found. Try a different search.
              </div>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className={styles.productGrid}>
              {products.map((product) => {
                const isSelected = tempSelection.includes(product.id);
                const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
                return (
                  <div
                    key={product.id}
                    className={`${styles.productCard} ${
                      isSelected ? styles.productCardSelected : ""
                    }`}
                    onClick={() => handleSelectProduct(product.id)}
                  >
                    <div className={styles.productImageWrapper}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.title} />
                      ) : (
                        "📚"
                      )}
                      {isSelected && <div className={styles.selectedBadge}>✓</div>}
                    </div>
                    <div className={styles.productCardInfo}>
                      <div className={styles.productCardTitle}>{product.title}</div>
                      {product.sku && (
                        <div className={styles.productCardSku}>
                          Product ID: {product.sku}
                        </div>
                      )}
                      <div className={styles.productCardPrice}>
                        ${product.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter} style={{ padding: "16px 0", marginTop: 24 }}>
          <button className={styles.cancelButton} onClick={() => handleDialogClose()}>
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={tempSelection.length === 0}
          >
            Save {tempSelection.length > 0 ? `(${tempSelection.length})` : "products"}
          </button>
        </div>
      </div>
    );
  }

  // Regular field view
  return (
    <div className={styles.container}>
      {/* Mode Toggle */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: "#1e2329" }}>
          Selection Mode:
        </label>
        <button
          onClick={handleToggleMode}
          style={{
            padding: "6px 12px",
            background: "white",
            border: "2px solid #0066cc",
            borderRadius: 6,
            color: "#0066cc",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {isSingleMode ? "Single Product" : "Multiple Products"}
        </button>
      </div>

      {hasSelection ? (
        isSingleMode && selectedProduct ? (
        <div className={styles.selectedProductCard}>
          <div className={styles.selectedProductImage}>
            {selectedProduct.image ? (
              <img src={selectedProduct.image} alt={selectedProduct.title} />
            ) : (
              "📚"
            )}
          </div>
          <div className={styles.selectedProductInfo}>
            <div className={styles.selectedProductTitle}>{selectedProduct.title}</div>
            <div className={styles.selectedProductMeta}>
              {selectedProduct.sku && `Product ID: ${selectedProduct.sku}`}
              {selectedProduct.category && ` • ${selectedProduct.category}`}
            </div>
            <div className={styles.selectedProductPrice}>
              ${selectedProduct.price.toFixed(2)}
            </div>
          </div>
          <button className={styles.changeButton} onClick={handleOpenModal}>
            Change
          </button>
          <button className={styles.removeButton} onClick={handleRemove}>
            Remove
          </button>
        </div>
        ) : (
          <div>
            <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: "#1e2329" }}>
              {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""} selected
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {selectedProducts.map((product) => (
                <div key={product.id} className={styles.selectedProductCard} style={{ flexDirection: "column", padding: 12 }}>
                  <div className={styles.selectedProductImage} style={{ width: "100%", height: 120, marginBottom: 8 }}>
                    {product.image ? (
                      <img src={product.image} alt={product.title} />
                    ) : (
                      "📚"
                    )}
                  </div>
                  <div className={styles.selectedProductInfo}>
                    <div className={styles.selectedProductTitle} style={{ fontSize: 13 }}>{product.title}</div>
                    <div className={styles.selectedProductPrice} style={{ fontSize: 14 }}>
                      ${product.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
              <button className={styles.changeButton} onClick={handleOpenModal}>
                Change Selection
              </button>
              <button className={styles.removeButton} onClick={handleRemove}>
                Remove All
              </button>
            </div>
          </div>
        )
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🛍️</div>
          <div className={styles.emptyTitle}>No {isSingleMode ? "product" : "products"} selected</div>
          <div className={styles.emptyText}>
            Select {isSingleMode ? "a product" : "products"} from your catalog to feature in this content.
          </div>
          <button className={styles.selectButton} onClick={handleOpenModal}>
            Select {isSingleMode ? "product" : "products"}
          </button>
        </div>
      )}

    </div>
  );
}

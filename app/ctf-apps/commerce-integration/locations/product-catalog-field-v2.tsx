"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  FormControl,
  Note,
  Pill,
  Select,
  SkeletonContainer,
  SkeletonBodyText,
  Spinner,
  Stack,
  Subheading,
  Text,
  TextInput,
} from "@contentful/f36-components";
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShoppingCartSimpleIcon,
  TagIcon,
  TrashSimpleIcon,
} from "@contentful/f36-icons";
import type { FieldAppSDK, DialogAppSDK } from "@contentful/app-sdk";
import { locations } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useEffect, useState, useCallback } from "react";
import type { Product, ProductCategory } from "@/lib/integrations/commerce/commerce.interface";
import type { ProductCatalogFieldValue } from "../types";
import { fetchWithTimeout } from "../utils";

const SELECTION_MODES: ProductCatalogFieldValue["selectionMode"][] = [
  "single",
  "multiple",
  "category",
];

const MODE_LABELS: Record<ProductCatalogFieldValue["selectionMode"], string> = {
  single: "Single product",
  multiple: "Multiple products",
  category: "Product category",
};

function readInitialValue(value: unknown): ProductCatalogFieldValue {
  if (!value || typeof value !== "object") {
    return { version: 1, selectionMode: "single" };
  }

  const v = value as Partial<ProductCatalogFieldValue>;
  const mode = v.selectionMode || "single";
  const base: ProductCatalogFieldValue = { version: 1, selectionMode: mode };

  if (mode === "single" && v.selectedProduct) {
    base.selectedProduct = v.selectedProduct;
  } else if (mode === "multiple") {
    base.selectedProducts = v.selectedProducts || [];
  } else if (mode === "category") {
    if (v.selectedCategory) base.selectedCategory = v.selectedCategory;
    base.categoryDisplayLimit = v.categoryDisplayLimit ?? 10;
  }

  return base;
}

export default function ProductCatalogField() {
  const sdk = useSDK<FieldAppSDK | DialogAppSDK>();

  const isDialog = sdk.location.is(locations.LOCATION_DIALOG);
  const fieldSdk = isDialog ? null : (sdk as FieldAppSDK);

  // Detect what Contentful field type we're attached to.
  // Symbol → simple string field (e.g. commerceCategoryId on productCategory)
  // Object → rich JSON field (e.g. products on productCatalog)
  const fieldType = fieldSdk?.field?.type as string | undefined;
  const isSymbolField = fieldType === "Symbol";

  const [config, setConfig] = useState<ProductCatalogFieldValue>(() => {
    if (isDialog) {
      const params = (sdk as DialogAppSDK).parameters?.invocation as {
        mode?: ProductCatalogFieldValue["selectionMode"];
        selectedIds?: string[];
      };
      return {
        version: 1,
        selectionMode: params?.mode || "single",
      };
    }
    if (isSymbolField) {
      const raw = fieldSdk?.field?.getValue() as string | undefined;
      return {
        version: 1,
        selectionMode: "category" as const,
        selectedCategory: raw ? { id: raw, name: raw, slug: raw, productCount: 0 } : undefined,
      };
    }
    return readInitialValue(fieldSdk?.field?.getValue());
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(isDialog);
  const [error, setError] = useState<string | null>(null);
  const [tempSelection, setTempSelection] = useState<string[]>(() => {
    if (isDialog) {
      const params = (sdk as DialogAppSDK).parameters?.invocation as {
        selectedIds?: string[];
      };
      return params?.selectedIds || [];
    }
    return [];
  });

  const saveValue = useCallback(
    (newConfig: ProductCatalogFieldValue) => {
      const cleaned = JSON.parse(JSON.stringify(newConfig));
      setConfig(cleaned);
      if (!fieldSdk?.field) return;

      // For Symbol fields, persist only the category ID string
      const persistedValue = isSymbolField
        ? (cleaned.selectedCategory?.id ?? "")
        : cleaned;

      fieldSdk.field.setValue(persistedValue).catch((err: unknown) => {
        console.error("[ProductCatalog] setValue failed:", err);
      });
    },
    [fieldSdk, isSymbolField]
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

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setError(null);
    try {
      const result = await fetchWithTimeout<{ categories: ProductCategory[] }>(
        "/api/integrations/categories",
        {},
        8000,
      );
      if (!result.ok) {
        setError(result.error);
        setCategories([]);
        return;
      }
      setCategories(result.data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk]);

  // Load products when component mounts in dialog mode
  useEffect(() => {
    if (isDialog) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = useCallback(async () => {
    const result = await sdk.dialogs.openCurrentApp({
      title: "Select products",
      width: 1400,
      minHeight: 700,
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      parameters: {
        mode: config.selectionMode,
        selectedIds:
          config.selectionMode === "single"
            ? config.selectedProduct?.id
              ? [config.selectedProduct.id]
              : []
            : (config.selectedProducts || []).map((p) => p.id),
      },
    });

    if (result && typeof result === "object" && "selectedProducts" in result) {
      const data = result as {
        selectedProducts: ProductCatalogFieldValue["selectedProducts"];
        mode: string;
      };
      if (data.mode === "single" && data.selectedProducts && data.selectedProducts.length > 0) {
        saveValue({
          version: 1,
          selectionMode: "single",
          selectedProduct: data.selectedProducts[0],
        });
      } else if (data.mode === "multiple") {
        saveValue({
          version: 1,
          selectionMode: "multiple",
          selectedProducts: data.selectedProducts || [],
        });
      }
    }
  }, [config, sdk, saveValue]);

  const handleDialogClose = useCallback(
    (selectedProducts?: ProductCatalogFieldValue["selectedProducts"]) => {
      if (isDialog) {
        (sdk as unknown as { close: (data: unknown) => void }).close({
          selectedProducts: selectedProducts || [],
          mode: config.selectionMode,
        });
      }
    },
    [sdk, isDialog, config.selectionMode]
  );

  const handleSearch = useCallback(() => {
    loadProducts(searchQuery);
  }, [searchQuery, loadProducts]);

  const handleSelectProduct = useCallback(
    (productId: string) => {
      if (config.selectionMode === "single") {
        setTempSelection([productId]);
      } else {
        setTempSelection((prev) =>
          prev.includes(productId)
            ? prev.filter((id) => id !== productId)
            : [...prev, productId]
        );
      }
    },
    [config.selectionMode]
  );

  const handleSave = useCallback(() => {
    if (tempSelection.length === 0) {
      handleDialogClose([]);
      return;
    }

    const selectedProds = tempSelection
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined)
      .map((product) => ({
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
    const cleared: ProductCatalogFieldValue = {
      version: 1,
      selectionMode: config.selectionMode,
    };
    setConfig(cleared);
    if (fieldSdk?.field) {
      fieldSdk.field.removeValue().catch((err: unknown) => {
        console.error("[ProductCatalog] removeValue failed:", err);
      });
    }
  }, [config.selectionMode, fieldSdk]);

  const handleChangeMode = useCallback(
    (mode: ProductCatalogFieldValue["selectionMode"]) => {
      saveValue({
        version: 1,
        selectionMode: mode,
      });
    },
    [saveValue]
  );

  const handleSelectCategory = useCallback(
    (cat: ProductCategory) => {
      saveValue({
        version: 1,
        selectionMode: "category",
        selectedCategory: cat,
        categoryDisplayLimit: config.categoryDisplayLimit ?? 10,
      });
    },
    [saveValue, config.categoryDisplayLimit]
  );

  const handleCategoryLimitChange = useCallback(
    (limit: number) => {
      saveValue({
        ...config,
        categoryDisplayLimit: limit,
      });
    },
    [saveValue, config]
  );

  const isSingleMode = config.selectionMode === "single";
  const isCategoryMode = config.selectionMode === "category";
  const selectedProduct = config.selectedProduct;
  const selectedProducts = config.selectedProducts || [];
  const selectedCategory = config.selectedCategory;
  const hasSelection = isCategoryMode
    ? !!selectedCategory
    : isSingleMode
      ? !!selectedProduct
      : selectedProducts.length > 0;

  // ─── Dialog mode ───────────────────────────────────────────────────
  if (isDialog) {
    return (
      <Box padding="spacingL">
        <Box marginBottom="spacingM">
          <Flex gap="spacingS" alignItems="center">
            <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
              <TextInput
                value={searchQuery}
                placeholder="Search products by title, SKU, or category…"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </Box>
            <Button
              variant="secondary"
              startIcon={<MagnifyingGlassIcon />}
              onClick={handleSearch}
            >
              Search
            </Button>
          </Flex>
        </Box>

        <Box style={{ minHeight: 460 }}>
          {loading && (
            <Flex
              alignItems="center"
              justifyContent="center"
              style={{ minHeight: 320 }}
              gap="spacingS"
            >
              <Spinner size="medium" />
              <Text fontColor="gray600">Loading products…</Text>
            </Flex>
          )}

          {error && (
            <Note variant="negative" title="Error loading products">
              {error}
            </Note>
          )}

          {!loading && !error && products.length === 0 && (
            <EmptyState
              title="No products found"
              description="Try a different search term."
            />
          )}

          {!loading && !error && products.length > 0 && (
            <ProductGrid
              products={products}
              selectedIds={tempSelection}
              onToggle={handleSelectProduct}
            />
          )}
        </Box>

        <Flex
          justifyContent="space-between"
          alignItems="center"
          marginTop="spacingL"
          gap="spacingS"
          flexWrap="wrap"
        >
          <Text fontColor="gray600">
            {tempSelection.length === 0
              ? "Nothing selected yet"
              : `${tempSelection.length} selected`}
          </Text>
          <Flex gap="spacingS">
            <Button variant="secondary" onClick={() => handleDialogClose()}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isDisabled={tempSelection.length === 0}
            >
              {tempSelection.length > 0
                ? `Save (${tempSelection.length})`
                : "Save"}
            </Button>
          </Flex>
        </Flex>
      </Box>
    );
  }

  // ─── Field view ────────────────────────────────────────────────────
  return (
    <Box>
      {/* Mode toggle — hidden for Symbol fields (locked to category) */}
      {!isSymbolField && (
        <Box marginBottom="spacingM">
          <FormControl>
            <FormControl.Label>Selection mode</FormControl.Label>
            <Select
              value={config.selectionMode}
              onChange={(e) =>
                handleChangeMode(
                  e.target.value as ProductCatalogFieldValue["selectionMode"]
                )
              }
            >
              {SELECTION_MODES.map((mode) => (
                <Select.Option key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Category mode */}
      {isCategoryMode ? (
        selectedCategory ? (
          <Stack flexDirection="column" spacing="spacingS" alignItems="stretch">
            <SelectionCard
              title={selectedCategory.name}
              contentType="Category"
              description={`ID: ${selectedCategory.id} · ${selectedCategory.productCount} product${selectedCategory.productCount !== 1 ? "s" : ""}`}
              thumbnail={
                <Box
                  style={{
                    width: 70,
                    height: 70,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f7f9fa",
                    borderRadius: 4,
                  }}
                >
                  <TagIcon size="medium" variant="muted" />
                </Box>
              }
            />
            <Flex gap="spacingS" flexWrap="wrap">
              <Button
                variant="negative"
                startIcon={<TrashSimpleIcon />}
                onClick={handleRemove}
              >
                Remove category
              </Button>
            </Flex>
            <Flex alignItems="center" gap="spacingS" flexWrap="wrap">
              <Text fontColor="gray700">Display limit:</Text>
              <Select
                value={String(config.categoryDisplayLimit ?? 10)}
                onChange={(e) => handleCategoryLimitChange(Number(e.target.value))}
                style={{ maxWidth: 180 }}
              >
                {[4, 8, 10, 12, 16, 20].map((n) => (
                  <Select.Option key={n} value={String(n)}>
                    {n} products
                  </Select.Option>
                ))}
              </Select>
            </Flex>
          </Stack>
        ) : (
          <CategoryPicker
            categories={categories}
            loading={categoriesLoading}
            error={error}
            onLoad={loadCategories}
            onSelect={handleSelectCategory}
          />
        )
      ) : hasSelection ? (
        isSingleMode && selectedProduct ? (
          <Stack flexDirection="column" spacing="spacingS" alignItems="stretch">
            <SelectionCard
              title={selectedProduct.title}
              contentType="Product"
              description={[
                selectedProduct.sku ? `Product ID: ${selectedProduct.sku}` : null,
                selectedProduct.category || null,
                `$${selectedProduct.price.toFixed(2)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              thumbnail={
                <ProductThumbnail
                  src={selectedProduct.image}
                  alt={selectedProduct.title}
                  size={70}
                />
              }
            />
            <Flex gap="spacingS" flexWrap="wrap">
              <Button
                variant="secondary"
                startIcon={<PencilSimpleIcon />}
                onClick={handleOpenModal}
              >
                Change
              </Button>
              <Button
                variant="negative"
                startIcon={<TrashSimpleIcon />}
                onClick={handleRemove}
              >
                Remove
              </Button>
            </Flex>
          </Stack>
        ) : (
          <Stack flexDirection="column" spacing="spacingM" alignItems="stretch">
            <Flex alignItems="center" gap="spacingS" flexWrap="wrap">
              <Text fontWeight="fontWeightDemiBold">
                {selectedProducts.length} product
                {selectedProducts.length !== 1 ? "s" : ""} selected
              </Text>
              <Badge variant="secondary">Multiple</Badge>
            </Flex>
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {selectedProducts.map((product) => (
                <Card key={product.id} padding="none">
                  <ProductThumbnail
                    src={product.image}
                    alt={product.title}
                    size={120}
                    fullWidth
                  />
                  <Box padding="spacingS">
                    <Text
                      fontWeight="fontWeightDemiBold"
                      fontSize="fontSizeS"
                      as="div"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {product.title}
                    </Text>
                    <Text fontColor="gray700" fontSize="fontSizeS" as="div">
                      ${product.price.toFixed(2)}
                    </Text>
                  </Box>
                </Card>
              ))}
            </Box>
            <Flex gap="spacingS" flexWrap="wrap">
              <Button
                variant="secondary"
                startIcon={<PencilSimpleIcon />}
                onClick={handleOpenModal}
              >
                Change selection
              </Button>
              <Button
                variant="negative"
                startIcon={<TrashSimpleIcon />}
                onClick={handleRemove}
              >
                Remove all
              </Button>
            </Flex>
          </Stack>
        )
      ) : (
        <EmptyState
          icon={<ShoppingCartSimpleIcon size="medium" variant="muted" />}
          title={`No ${isSingleMode ? "product" : "products"} selected`}
          description={`Select ${isSingleMode ? "a product" : "products"} from your catalog to feature in this content.`}
          action={
            <Button
              variant="primary"
              startIcon={<PlusIcon />}
              onClick={handleOpenModal}
            >
              Select {isSingleMode ? "product" : "products"}
            </Button>
          }
        />
      )}
    </Box>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function SelectionCard({
  title,
  contentType,
  description,
  thumbnail,
}: {
  title: string;
  contentType: string;
  description?: string;
  thumbnail?: React.ReactNode;
}) {
  return (
    <Box
      style={{
        border: "1px solid #e7ebee",
        borderRadius: 6,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <Box
        padding="spacingXs"
        style={{
          background: "#fafbfc",
          borderBottom: "1px solid #e7ebee",
        }}
      >
        <Text fontColor="gray600" fontSize="fontSizeS">
          {contentType}
        </Text>
      </Box>
      <Flex
        padding="spacingM"
        gap="spacingM"
        alignItems="center"
        style={{ minWidth: 0 }}
      >
        <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
          <Subheading marginBottom="none">{title}</Subheading>
          {description && (
            <Box marginTop="spacing2Xs">
              <Text fontColor="gray700">{description}</Text>
            </Box>
          )}
        </Box>
        {thumbnail && (
          <Box style={{ flexShrink: 0 }}>{thumbnail}</Box>
        )}
      </Flex>
    </Box>
  );
}

function ProductGrid({
  products,
  selectedIds,
  onToggle,
}: {
  products: Product[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {products.map((product) => {
        const isSelected = selectedIds.includes(product.id);
        const imageUrl = product.images?.[0];
        return (
          <Card
            key={product.id}
            padding="none"
            isSelected={isSelected}
            onClick={() => onToggle(product.id)}
            style={{ cursor: "pointer", overflow: "hidden", textAlign: "left" }}
          >
            <Box style={{ position: "relative" }}>
              <ProductThumbnail
                src={imageUrl}
                alt={product.title}
                size={160}
                fullWidth
              />
              {isSelected && (
                <Box
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                  }}
                >
                  <Badge variant="positive">Selected</Badge>
                </Box>
              )}
            </Box>
            <Box padding="spacingS">
              <Text
                fontWeight="fontWeightDemiBold"
                as="div"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {product.title}
              </Text>
              {product.sku && (
                <Text fontColor="gray600" fontSize="fontSizeS" as="div">
                  ID: {product.sku}
                </Text>
              )}
              <Text fontColor="gray800" fontSize="fontSizeS" as="div">
                ${product.price.toFixed(2)}
              </Text>
            </Box>
          </Card>
        );
      })}
    </Box>
  );
}

function ProductThumbnail({
  src,
  alt,
  size = 64,
  fullWidth = false,
}: {
  src?: string;
  alt: string;
  size?: number;
  fullWidth?: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    width: fullWidth ? "100%" : size,
    height: size,
    objectFit: "cover",
    background: "#f0f3f5",
    display: "block",
  };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} style={sharedStyle} />;
  }

  return (
    <Box
      style={{
        ...sharedStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ShoppingCartSimpleIcon size="medium" variant="muted" />
    </Box>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Box
      padding="spacingXl"
      style={{
        border: "1px dashed #d3dce6",
        borderRadius: 6,
        background: "#fafbfc",
        textAlign: "center",
      }}
    >
      {icon && <Box marginBottom="spacingS">{icon}</Box>}
      <Text fontWeight="fontWeightDemiBold" as="div">
        {title}
      </Text>
      {description && (
        <Box marginTop="spacingXs">
          <Text fontColor="gray600">{description}</Text>
        </Box>
      )}
      {action && <Box marginTop="spacingM">{action}</Box>}
    </Box>
  );
}

function CategoryPicker({
  categories,
  loading,
  error,
  onLoad,
  onSelect,
}: {
  categories: ProductCategory[];
  loading: boolean;
  error: string | null;
  onLoad: () => void;
  onSelect: (cat: ProductCategory) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      setLoaded(true);
      onLoad();
    }
  }, [loaded, onLoad]);

  if (loading) {
    return (
      <SkeletonContainer>
        <SkeletonBodyText numberOfLines={4} />
      </SkeletonContainer>
    );
  }

  if (error) {
    return (
      <Note variant="negative" title="Error loading categories">
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap="spacingS"
          flexWrap="wrap"
        >
          <Text>{error}</Text>
          <Button
            variant="secondary"
            startIcon={<ArrowClockwiseIcon />}
            onClick={() => {
              setLoaded(false);
            }}
          >
            Retry
          </Button>
        </Flex>
      </Note>
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={<TagIcon size="medium" variant="muted" />}
        title="No categories found"
        description="Categories are derived from your product catalog. Add products with category values to see them here."
      />
    );
  }

  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {categories.map((cat) => (
        <Card
          key={cat.id}
          padding="default"
          onClick={() => onSelect(cat)}
          style={{ cursor: "pointer" }}
        >
          <Flex gap="spacingS" alignItems="center">
            <TagIcon variant="muted" />
            <Box style={{ minWidth: 0 }}>
              <Text
                fontWeight="fontWeightDemiBold"
                as="div"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.name}
              </Text>
              <Pill
                label={`${cat.productCount} product${cat.productCount !== 1 ? "s" : ""}`}
              />
            </Box>
          </Flex>
        </Card>
      ))}
    </Box>
  );
}

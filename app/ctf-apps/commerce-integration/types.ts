import type { Product } from "@/lib/integrations/commerce/commerce.interface";

/**
 * App installation parameters stored in Contentful
 */
export type CommerceAppInstallationParameters = {
  provider: "mock" | "shopify" | "commercetools" | "bigcommerce";
  
  // Provider-specific credentials
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    storeUrl?: string;
    accessToken?: string;
  };
  
  // Configuration
  useMock?: boolean;
  simulateLatency?: boolean;
  latencyRange?: [number, number];
  
  // API endpoints (for custom providers)
  endpoints?: {
    products?: string;
    cart?: string;
    checkout?: string;
  };
};

/**
 * Product catalog field value (stored in Contentful entry field)
 * Supports both single and multiple product selection
 */
export type ProductCatalogFieldValue = {
  version: 1;
  
  // Selection mode
  selectionMode: "single" | "multiple";
  
  // Selected product (single mode)
  selectedProduct?: {
    id: string;
    title: string;
    price: number;
    image?: string;
    sku?: string;
    category?: string;
  };
  
  // Selected products (multiple mode)
  selectedProducts?: Array<{
    id: string;
    title: string;
    price: number;
    image?: string;
    sku?: string;
    category?: string;
  }>;
};

/**
 * Preview state for product catalog field
 */
export type ProductPreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; details?: unknown }
  | { status: "success"; products: Product[] };

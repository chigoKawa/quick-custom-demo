import type { CommerceAppInstallationParameters, ProductCatalogFieldValue } from "./types";

/**
 * Get default installation parameters
 */
export function getDefaultInstallationParams(
  params?: Partial<CommerceAppInstallationParameters>
): CommerceAppInstallationParameters {
  return {
    provider: params?.provider || "mock",
    useMock: params?.useMock ?? true,
    simulateLatency: params?.simulateLatency ?? true,
    latencyRange: params?.latencyRange || [200, 500],
    credentials: params?.credentials || {},
    endpoints: params?.endpoints || {},
  };
}

/**
 * Normalize product catalog field value
 */
export function normalizeProductCatalogField(
  input: Partial<ProductCatalogFieldValue>
): ProductCatalogFieldValue {
  const mode = input.selectionMode || "single";
  return {
    version: 1,
    selectionMode: mode,
    selectedProduct: mode === "single" ? input.selectedProduct : undefined,
    selectedProducts: mode === "multiple" ? (input.selectedProducts || []) : undefined,
  };
}

/**
 * Validate provider credentials
 */
export function validateProviderCredentials(
  provider: string,
  credentials?: Record<string, string>
): string[] {
  const errors: string[] = [];
  
  if (provider === "mock") {
    return errors; // Mock doesn't need credentials
  }
  
  if (provider === "shopify") {
    if (!credentials?.storeUrl) {
      errors.push("Shopify Store URL is required");
    }
    if (!credentials?.accessToken) {
      errors.push("Shopify Access Token is required");
    }
  }
  
  if (provider === "commercetools") {
    if (!credentials?.apiKey) {
      errors.push("commercetools API Key is required");
    }
    if (!credentials?.apiSecret) {
      errors.push("commercetools API Secret is required");
    }
  }
  
  if (provider === "bigcommerce") {
    if (!credentials?.storeUrl) {
      errors.push("BigCommerce Store URL is required");
    }
    if (!credentials?.accessToken) {
      errors.push("BigCommerce Access Token is required");
    }
  }
  
  return errors;
}

/**
 * Fetch with timeout helper
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    if (!res.ok) {
      return {
        ok: false,
        error: `Request failed with status ${res.status}`,
      };
    }
    
    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      error: isAbort ? `Request timed out after ${timeoutMs}ms` : "Network error",
    };
  } finally {
    clearTimeout(id);
  }
}

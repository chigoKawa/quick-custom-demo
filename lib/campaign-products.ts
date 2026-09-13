/**
 * Reading a campaign's featured products out of the `targetProducts` JSON field.
 *
 * Lives in lib/ (not the preview harness) because all three surfaces need it:
 * the public campaign page, the mobile preview and the in-store display. Keeping
 * one implementation is the point — the web page previously had its own read that
 * only handled the multi-product shape, so single-product campaigns silently
 * rendered nothing.
 */
import type { ICampaign } from "@/features/contentful/type";

export type CampaignProduct = {
  id: string;
  title: string;
  image?: string;
  price?: number;
  currency?: string;
  category?: string;
  sku?: string;
};

/**
 * The commerce-integration field editor writes a different key depending on its
 * `selectionMode`: `selectedProduct` for "single", `selectedProducts` for
 * "multiple". Read both, or single-mode campaigns come back empty.
 *
 * @see app/ctf-apps/commerce-integration/types.ts — ProductCatalogFieldValue
 */
export function resolveCampaignProducts(entry: ICampaign): CampaignProduct[] {
  const fields = (entry?.fields ?? {}) as Record<string, unknown>;

  const targetProducts = fields.targetProducts as
    | { selectedProducts?: unknown[]; selectedProduct?: unknown }
    | undefined;

  const selected = Array.isArray(targetProducts?.selectedProducts)
    ? targetProducts!.selectedProducts!
    : targetProducts?.selectedProduct
      ? [targetProducts.selectedProduct]
      : [];

  return selected
    .map((p): CampaignProduct | null => {
      const prod = p as Record<string, unknown>;
      const id = (prod.id as string) || (prod.sku as string) || "";
      const title = (prod.title as string) || (prod.name as string) || "";
      if (!id && !title) return null;
      const images = prod.images as unknown[] | undefined;
      return {
        id: id || title,
        title,
        image:
          (prod.image as string) || (Array.isArray(images) ? (images[0] as string) : undefined),
        price: typeof prod.price === "number" ? prod.price : undefined,
        // Currency comes from the product data (Product.currency upstream). Older
        // entries were snapshotted before it was persisted, so it may be absent —
        // formatProductPrice falls back in that case.
        currency: prod.currency as string | undefined,
        category: prod.category as string | undefined,
        sku: prod.sku as string | undefined,
      };
    })
    .filter((p): p is CampaignProduct => p !== null);
}

/**
 * Format a product price for display.
 *
 * Lifted verbatim from campaign-page-client.tsx so every surface renders the
 * same string. The NOK default only applies to entries whose snapshot predates
 * `currency` being persisted.
 */
export function formatProductPrice(price: number, currency?: string): string {
  const c = (currency ?? "NOK").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: c,
      minimumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}

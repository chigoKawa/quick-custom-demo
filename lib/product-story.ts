import { getEntries, getAllPageSlugs } from "./contentful";
import type {
  IProductStory,
  ProductStorySkeleton,
} from "@/features/contentful/type";

const INCLUDES_COUNT = 6;

/**
 * Fetch a single product story by slug.
 * Returns null when not found — callers should render notFound().
 */
export async function getProductStoryBySlug(
  slug: string,
  locale?: string,
  preview = false,
  timelineToken?: string | null
): Promise<IProductStory | null> {
  try {
    const entries = await getEntries<ProductStorySkeleton>(
      {
        content_type: "productStory",
        "fields.slug": slug,
        limit: 1,
        include: INCLUDES_COUNT,
        ...(locale ? { locale } : {}),
      },
      preview,
      timelineToken
    );
    return (entries[0] as IProductStory | undefined) ?? null;
  } catch (err) {
    console.error("[product-story] getProductStoryBySlug error", { slug, locale, err });
    return null;
  }
}

/**
 * Fetch all product story slugs for static generation.
 */
export async function getAllProductStorySlugs(
  preview = false
): Promise<string[]> {
  return getAllPageSlugs<ProductStorySkeleton>(
    { content_type: "productStory", include: 1 },
    preview
  );
}

/**
 * Safely serialize a product story entry for the server→client boundary.
 */
export function mapProductStoryToProps(entry: IProductStory): IProductStory {
  try {
    return structuredClone(entry);
  } catch {
    return JSON.parse(JSON.stringify(entry));
  }
}

// ----- Product data helpers -----

export interface StoryProductData {
  id: string;
  title: string;
  price: number;
  image?: string;
  sku?: string;
  category?: string;
}

/**
 * Extract the primary product from the JSON field stored by the commerce app.
 */
export function extractPrimaryProduct(
  raw: unknown
): StoryProductData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  // Commerce app stores: { version, selectionMode, selectedProduct }
  if (obj.selectedProduct && typeof obj.selectedProduct === "object") {
    return obj.selectedProduct as StoryProductData;
  }

  // Fallback: the raw object might be the product directly
  if (typeof obj.id === "string" && typeof obj.title === "string") {
    return obj as unknown as StoryProductData;
  }

  return null;
}

/**
 * Extract additional products from the JSON field.
 */
export function extractAdditionalProducts(
  raw: unknown
): StoryProductData[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.selectedProducts)) {
    return obj.selectedProducts.filter(
      (p): p is StoryProductData =>
        !!p && typeof p === "object" && typeof (p as Record<string, unknown>).id === "string"
    );
  }

  // Fallback: single product stored in multi field
  if (obj.selectedProduct && typeof obj.selectedProduct === "object") {
    return [obj.selectedProduct as StoryProductData];
  }

  return [];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Entry } from "contentful";
import { getEntries } from "@/lib/contentful";
import { extractImageWithFocalPoint } from "@/lib/focal-point";

type CatalogIdTypeUpper = "ISBN13" | "OLID" | "WORK";

export type BookReferenceOverride = {
  idType: CatalogIdTypeUpper | "SKU";
  externalId: string;
  titleOverride?: string;
  shortDescriptionPlain?: string;
  coverUrl?: string;
  badge?: "New";
  discountPercent?: 10;
};

type BookReferenceEntry = Entry<any>;

type OverrideMap = Map<string, BookReferenceOverride>;

type CacheEntry = {
  createdAtMs: number;
  value: OverrideMap;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(params: { locale: string; preview: boolean }): string {
  return `${params.locale}::${params.preview ? "preview" : "delivery"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function extractPlainTextFromRichText(node: unknown): string {
  if (!isRecord(node)) return "";

  const nodeType = typeof node.nodeType === "string" ? node.nodeType : "";
  if (nodeType === "text") {
    return typeof node.value === "string" ? node.value : "";
  }

  const content = Array.isArray(node.content) ? node.content : [];
  if (content.length === 0) return "";

  return content
    .map((child) => extractPlainTextFromRichText(child))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOverrideText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Content model default placeholders should never render as real marketing overrides.
  const lower = trimmed.toLowerCase();
  if (
    lower === "marketing title if you want to override catalog title." ||
    lower === "marketing title if you want to override catalog title" ||
    lower === "marketing title" ||
    lower === "marketing description" ||
    lower === "marketing description if you want to override catalog description." ||
    lower === "marketing description if you want to override catalog description"
  ) {
    return undefined;
  }

  return trimmed;
}

function toKey(idType: string, externalId: string): string {
  return `${idType}:${externalId}`;
}

/**
 * Detect the actual ID type from the external ID pattern.
 * OLID ends with M (e.g., OL12345M), WORK ends with W (e.g., OL12345W)
 */
function detectIdTypeFromPattern(externalId: string): CatalogIdTypeUpper | null {
  if (/^OL\d+W$/.test(externalId)) return "WORK";
  if (/^OL\d+M$/.test(externalId)) return "OLID";
  if (/^\d{13}$/.test(externalId)) return "ISBN13";
  return null;
}

export async function getBookReferenceOverrides(params: {
  locale: string;
  preview: boolean;
}): Promise<OverrideMap> {
  const key = cacheKey(params);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAtMs < CACHE_TTL_MS) {
    return cached.value;
  }

  const entries = (await getEntries<any>(
    {
      content_type: "bookReference",
      include: 2,
      limit: 1000,
      locale: params.locale,
    },
    params.preview
  )) as unknown as BookReferenceEntry[];

  const map: OverrideMap = new Map();

  for (const entry of entries) {
    const idTypeRaw = (entry as any)?.fields?.idType;
    const externalIdRaw = (entry as any)?.fields?.externalId;

    const externalId = typeof externalIdRaw === "string" ? externalIdRaw.trim() : null;
    if (!externalId) continue;

    // Use configured idType, but auto-detect from pattern if it seems misconfigured
    let idType: CatalogIdTypeUpper | "SKU" | null =
      idTypeRaw === "ISBN13" ||
      idTypeRaw === "OLID" ||
      idTypeRaw === "WORK" ||
      idTypeRaw === "SKU"
        ? (idTypeRaw as CatalogIdTypeUpper | "SKU")
        : null;
    
    // Auto-correct common misconfiguration: OLID selected but ID is actually a WORK ID
    const detectedType = detectIdTypeFromPattern(externalId);
    if (detectedType && idType !== detectedType && idType !== "SKU") {
      // Override with detected type if pattern clearly indicates a different type
      idType = detectedType;
    }
    
    if (!idType) continue;

    // coverImage is an imageWithFocalPoint entry, use extractImageWithFocalPoint
    const coverEntry = (entry as any).fields?.coverImage;
    const { url: coverUrlRaw } = extractImageWithFocalPoint(coverEntry);
    const coverUrl = coverUrlRaw || undefined;

    const shortDescriptionPlain = extractPlainTextFromRichText(
      (entry as any).fields?.shortDescription
    );
    const shortDescriptionOverride = normalizeOverrideText(shortDescriptionPlain);

    const tagIds: string[] = Array.isArray((entry as any)?.metadata?.tags)
      ? (entry as any).metadata.tags
          .map((t: any) => t?.sys?.id)
          .filter((v: any) => typeof v === "string")
      : [];
    const hasNew = tagIds.includes("new");
    const hasSale = tagIds.includes("sale");

    map.set(toKey(idType, externalId), {
      idType,
      externalId,
      titleOverride:
        normalizeOverrideText((entry as any).fields?.titleOverride) ?? undefined,
      shortDescriptionPlain: shortDescriptionOverride,
      coverUrl,
      badge: hasNew ? "New" : undefined,
      discountPercent: hasSale ? 10 : undefined,
    });
  }

  cache.set(key, { createdAtMs: Date.now(), value: map });
  return map;
}

export function applyBookReferenceOverrideToListItem(
  item: {
    title: string;
    isbn13?: string;
    olid?: string;
    workId?: string;
    coverUrl?: string;
    price?: { amount?: number };
  },
  overrides: OverrideMap
): { title: string; coverUrl?: string; badge?: "New"; originalPrice?: number } {
  const olidKey = item.olid ? toKey("OLID", item.olid) : null;
  const isbnKey = item.isbn13 ? toKey("ISBN13", item.isbn13) : null;
  const workKey = item.workId ? toKey("WORK", item.workId) : null;

  const override =
    (workKey ? overrides.get(workKey) : undefined) ??
    (olidKey ? overrides.get(olidKey) : undefined) ??
    (isbnKey ? overrides.get(isbnKey) : undefined);

  if (!override) return { title: item.title, coverUrl: item.coverUrl };

  const priceAmount = typeof item.price?.amount === "number" ? item.price.amount : undefined;
  const originalPrice =
    override.discountPercent === 10 && typeof priceAmount === "number" && priceAmount > 0
      ? Math.round((priceAmount / 0.9) * 100) / 100
      : undefined;

  return {
    title: override.titleOverride ?? item.title,
    coverUrl: override.coverUrl ?? item.coverUrl,
    badge: override.badge,
    originalPrice,
  };
}

export function applyBookReferenceOverrideToDetail(
  book: {
    title: string;
    isbn13?: string;
    olid?: string;
    workId?: string;
    description?: string;
    cover?: { small?: string; medium?: string; large?: string };
  },
  overrides: OverrideMap
): {
  title: string;
  description?: string;
  cover?: { small?: string; medium?: string; large?: string };
} {
  const olidKey = book.olid ? toKey("OLID", book.olid) : null;
  const isbnKey = book.isbn13 ? toKey("ISBN13", book.isbn13) : null;
  const workKey = book.workId ? toKey("WORK", book.workId) : null;

  const override =
    (workKey ? overrides.get(workKey) : undefined) ??
    (olidKey ? overrides.get(olidKey) : undefined) ??
    (isbnKey ? overrides.get(isbnKey) : undefined);

  if (!override) {
    return { title: book.title, description: book.description, cover: book.cover };
  }

  const coverUrl = override.coverUrl;
  const cover = coverUrl
    ? {
        small: coverUrl,
        medium: coverUrl,
        large: coverUrl,
      }
    : book.cover;

  return {
    title: override.titleOverride ?? book.title,
    description: override.shortDescriptionPlain ?? book.description,
    cover,
  };
}

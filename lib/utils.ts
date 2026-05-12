import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Asset } from "contentful";
import {
  ILandingPage,
  IExternalUrl,
  IBlogPostPage,
  ICategoryPage,
  IProductStory,
  IPmsPropertyEntry,
  IProductCategory,
  ICampaign,
  IAuction,
  ILotReference,
} from "@/features/contentful/type";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractContentfulAssetUrl = (image: Asset | null | undefined): string => {
  const raw: string = image?.fields?.file?.url?.toString() || "";
  if (!raw) return "";
  // Contentful returns protocol-relative URLs (//images.ctfassets.net/…)
  return raw.startsWith("//") ? `https:${raw}` : raw;
};

export function isPreviewEnabled(
  searchParams: unknown
): searchParams is { [key: string]: string | string[] | undefined } {
  if (!searchParams || typeof searchParams !== "object") return false;
  return "preview" in (searchParams as Record<string, unknown>);
}

/**
 * Extract the Contentful Timeline preview token from search params.
 * Returns the raw token string or null when absent.
 *
 * Expected URL shape: ?timeline={token}&preview=true
 */
export function getTimelineToken(
  searchParams: Record<string, string | string[] | undefined> | null | undefined
): string | null {
  if (!searchParams || typeof searchParams !== "object") return null;
  const raw = searchParams.timeline;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) return raw[0];
  return null;
}

/**
 * Prefix internal app paths with `[locale]` so Next.js matches `app/(site)/[locale]/…`.
 * When `locale` is set, always prefixes (including default locale) so client-side
 * `<Link href>` navigations hit the correct segment without relying on middleware rewrite.
 * When `locale` is omitted, returns `path` unchanged for legacy/server-only callers.
 */
export function localizeInternalPath(
  path: string,
  locale?: string,
  _defaultLocale = "en-US"
): string {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (!locale) return normalized;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`.replace(/\/+/g, "/");
}

export type ExtractUrlFromTargetOptions = {
  locale?: string;
  defaultLocale?: string;
};

export const extractUrlFromTarget = (
  target: IExternalUrl | ILandingPage | IBlogPostPage | ICategoryPage | IProductStory | IPmsPropertyEntry | IProductCategory | ICampaign | IAuction | ILotReference,
  options?: ExtractUrlFromTargetOptions
) => {
  const { locale, defaultLocale = "en-US" } = options ?? {};
  const L = (path: string) => localizeInternalPath(path, locale, defaultLocale);

  const contentType = target?.sys?.contentType?.sys?.id;
  if (contentType === "landingPage") {
    const entry = target as ILandingPage;
    if (entry?.fields?.slug === "homepage" || entry?.fields?.slug === "home") {
      return L("/");
    }

    return L(`/${entry?.fields?.slug}`);
  }

  if (contentType === "blogPost") {
    const entry = target as IBlogPostPage;
    return L(`/blog/${entry?.fields?.slug}`);
  }

  if (contentType === "categoryPage") {
    const entry = target as ICategoryPage;
    const slug = entry?.fields?.slug;
    return slug ? L(`/category/${slug}`) : "";
  }

  if (contentType === "productStory") {
    const entry = target as IProductStory;
    const slug = entry?.fields?.slug;
    return slug ? L(`/stories/${slug}`) : "";
  }

  if (contentType === "pmsProperty") {
    const entry = target as IPmsPropertyEntry;
    const id = entry?.fields?.propertyId ?? entry?.fields?.slug;
    return id ? L(`/properties/${id}`) : "";
  }

  if (contentType === "productCategory") {
    const entry = target as IProductCategory;
    const slug = entry?.fields?.slug;
    return slug ? L(`/products/category/${slug}`) : "";
  }

  if (contentType === "campaign") {
    const entry = target as ICampaign;
    const slug = entry?.fields?.slug;
    return slug ? L(`/campaigns/${slug}`) : "";
  }

  if (contentType === "kbArticle") {
    const slug = (target as any)?.fields?.slug;
    return slug ? L(`/knowledge-base/${slug}`) : "";
  }

  if (contentType === "auction") {
    const entry = target as IAuction;
    // externalAuctionId is an Object field storing the full auction snapshot;
    // the actual ID string lives at snap.externalAuctionId.
    const snap = entry?.fields?.externalAuctionId as Record<string, any> | undefined;
    const id = snap?.externalAuctionId as string | undefined;
    return id ? L(`/auctions/${id}`) : "";
  }

  if (contentType === "lotReference") {
    const entry = target as ILotReference;
    const lotId = entry?.fields?.externalLotId;
    // A lot URL requires /auctions/[auctionId]/lot/[lotNumber].
    // lotReference does not store its parent auction ID, so we can only
    // link to the lot number alone — callers that have auction context
    // should build the URL themselves rather than using this function.
    return lotId ? L(`/lot/${lotId}`) : "";
  }

  if (contentType === "externalLink") {
    const entry = target as IExternalUrl;

    return `${entry?.fields?.url}`;
  }

  return "";
};

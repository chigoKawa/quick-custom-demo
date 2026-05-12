import { getEntries } from "./contentful";
import type { Entry, Asset, EntrySkeletonType } from "contentful";

// Type definitions for site settings
export interface SiteSettingsSkeleton {
  contentTypeId: "siteSettings";
  fields: {
    internalName: string;
    logo?: Asset;
    logoAlt?: string;
    logoLink?: string;
    headerTopLinks?: Entry[];
    headerAccountLinks?: Entry[];
    headerPromoLink?: Entry;
    headerMainNavigation?: Entry;
    footerLinkColumns?: Entry[];
    footerSocialLinks?: Entry[];
    footerFeatures?: Entry[];
    footerPaymentMethods?: Entry[];
    footerLegalText?: string;
    themePrimary?: string;
    themeBackground?: string;
    themeForeground?: string;
    themeSecondary?: string;
    themeAccent?: string;
    theme?: import("./theme").SiteTheme;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export interface NavLinkSkeleton {
  contentTypeId: "navLink";
  fields: {
    internalName: string;
    label: string;
    target?: Entry; // landingPage, blogPost, categoryPage
    href?: string;
    openInNewTab?: boolean;
    rel?: string;
    icon?: string;
  };
}

export interface NavLinkColumnSkeleton {
  contentTypeId: "navLinkColumn";
  fields: {
    internalName: string;
    title: string;
    links?: Entry<NavLinkSkeleton>[];
  };
}

export interface FooterFeatureSkeleton {
  contentTypeId: "footerFeature";
  fields: {
    internalName: string;
    title: string;
    description?: string;
    icon?: string;
  };
}

export interface PaymentMethodSkeleton {
  contentTypeId: "paymentMethod";
  fields: {
    internalName: string;
    label: string;
    icon?: Asset;
  };
}

export interface HeaderNavigationSkeleton {
  contentTypeId: "headerNavigation";
  fields: {
    internalName: string;
    menuIdentifier: string;
    menuItems?: Entry[];
  };
}

/**
 * Fetch the site settings entry from Contentful
 * Assumes there's only one siteSettings entry (singleton pattern)
 */
export async function getSiteSettings(
  locale?: string,
  preview?: boolean,
  timelineToken?: string | null
): Promise<Entry<SiteSettingsSkeleton> | null> {
  const query: Record<string, unknown> = {
    content_type: "siteSettings",
    include: 5,
    order: "sys.createdAt",
  };
  if (locale) {
    query.locale = locale;
  }
  const entries = await getEntries<SiteSettingsSkeleton>(
    query,
    preview || false,
    timelineToken
  );

  // With personalization variants there may be multiple siteSettings entries.
  // The baseline (original) is the one that has nt_experiences linked;
  // variant entries created by Ninetailed won't have that field populated.
  // Fall back to the first (oldest) entry if none have experiences.
  const baseline = entries.find(
    (e) =>
      Array.isArray((e.fields as Record<string, unknown>).nt_experiences) &&
      ((e.fields as Record<string, unknown>).nt_experiences as unknown[]).length > 0
  );

  return baseline || entries[0] || null;
}

export type LocaleFieldPick = { locale?: string; defaultLocale?: string };

/**
 * Resolve a Contentful field value: plain scalar/entry or locale-keyed map
 * (Delivery API can return maps when resolveLocale:false / nested includes).
 */
export function resolveLocalizedField<T>(
  raw: unknown,
  pick?: LocaleFieldPick
): T | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return raw as T;
  const obj = raw as Record<string, unknown> & { sys?: unknown };
  if (obj.sys !== undefined && typeof obj.sys === "object") {
    return raw as T;
  }
  const { locale, defaultLocale } = pick ?? {};
  if (locale && raw !== null && locale in obj) {
    return obj[locale] as T;
  }
  if (defaultLocale && raw !== null && defaultLocale in obj) {
    return obj[defaultLocale] as T;
  }
  const keys = Object.keys(obj);
  if (keys.length > 0) return obj[keys[0]] as T;
  return undefined;
}

function getFieldValue<T>(
  entry: any,
  fieldName: string,
  fallback: T,
  pick?: LocaleFieldPick
): T {
  if (!entry?.fields) return fallback;
  const resolved = resolveLocalizedField<T>(entry.fields[fieldName], pick);
  return resolved === undefined ? fallback : resolved;
}

/** Client/server helper for reading localized entry fields. */
export function getEntryField<T>(
  entry: any,
  fieldName: string,
  fallback: T,
  pick?: LocaleFieldPick
): T {
  return getFieldValue(entry, fieldName, fallback, pick);
}

export function getEntryFieldArray<T>(
  entry: any,
  fieldName: string,
  pick?: LocaleFieldPick
): T[] {
  const v = getFieldValue(entry, fieldName, [] as T[], pick);
  return Array.isArray(v) ? v : [];
}

export type ResolveNavLinkUrlOptions = {
  /** Active locale from the `[locale]` segment (after middleware rewrite). */
  locale?: string;
  /** Space default locale — URLs stay unprefixed for this locale (see middleware). */
  defaultLocale?: string;
};

/**
 * Helper to resolve nav link URL
 * Priority: target page slug > href
 */
export function resolveNavLinkUrl(
  navLink: Entry<NavLinkSkeleton> | Entry<any>,
  options?: ResolveNavLinkUrlOptions
): string {
  const locale = options?.locale;
  const defaultLocale = options?.defaultLocale ?? 'en-US';
  const pick: LocaleFieldPick = { locale, defaultLocale };
  const target = getFieldValue<Entry<any> | null>(navLink, 'target', null, pick);
  const href = getFieldValue<string>(navLink, 'href', '#', pick);

  // If target page is set, use its slug
  if (target) {
    const slug =
      getFieldValue<string>(target, 'slug', '', pick) ||
      getFieldValue<string>(target, 'url', '', pick);

    if (slug) {
      const localePrefix =
        locale && locale !== defaultLocale ? `/${locale}` : '';
      return `${localePrefix}/${slug}`.replace(/\/+/g, '/');
    }
  }

  // Fall back to href
  return href;
}

/**
 * Helper to get icon name for rendering
 */
export function getIconName(iconKey?: string): string | null {
  const iconMap: Record<string, string> = {
    facebook: 'facebook',
    instagram: 'instagram',
    twitter: 'twitter',
    youtube: 'youtube',
    home: 'home',
    search: 'search',
    user: 'user',
    heart: 'heart',
    shopping_bag: 'shopping-bag',
    truck: 'truck',
    shield_check: 'shield-check',
    headphones: 'headphones',
    credit_card: 'credit-card',
  };

  return iconKey ? iconMap[iconKey] || iconKey : null;
}

/**
 * Get asset URL from Contentful asset
 */
export function getAssetUrl(
  asset?: Asset | any,
  pick?: LocaleFieldPick
): string | null {
  if (!asset || !asset.fields) {
    return null;
  }

  // Handle localized file field
  let file: unknown = asset.fields.file;
  if (!file) return null;

  if (typeof file === "object" && file !== null && !("url" in file)) {
    const resolved = resolveLocalizedField<{ url?: string }>(file, pick);
    file = resolved ?? file;
  }
  
  if (!file || typeof file !== 'object') return null;
  
  const url = 'url' in file ? String(file.url) : null;

  return url ? (url.startsWith('//') ? `https:${url}` : url) : null;
}

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
  const entries = await getEntries<SiteSettingsSkeleton>(
    {
      content_type: "siteSettings",
      locale,
      include: 5, // Deep include to get all nested references
      order: "sys.createdAt", // Oldest first — baseline before variants
    },
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

// Safe field accessor for Contentful entries (handles localized vs resolved fields)
function getFieldValue<T>(entry: any, fieldName: string, fallback: T): T {
  if (!entry?.fields) return fallback;
  const value = entry.fields[fieldName];
  if (value === undefined || value === null) return fallback;
  // If it's a localized object, try to get the first value
  if (typeof value === 'object' && !Array.isArray(value) && !('sys' in value)) {
    const keys = Object.keys(value);
    if (keys.length > 0) return value[keys[0]] as T;
  }
  return value as T;
}

/**
 * Helper to resolve nav link URL
 * Priority: target page slug > href
 */
export function resolveNavLinkUrl(navLink: Entry<NavLinkSkeleton> | Entry<any>, locale?: string): string {
  const target = getFieldValue<Entry<any> | null>(navLink, 'target', null);
  const href = getFieldValue<string>(navLink, 'href', '#');

  // If target page is set, use its slug
  if (target) {
    const slug = getFieldValue<string>(target, 'slug', '') || getFieldValue<string>(target, 'url', '');

    if (slug) {
      // Prepend locale if not default
      const localePrefix = locale && locale !== 'en-US' ? `/${locale}` : '';
      return `${localePrefix}/${slug}`;
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
export function getAssetUrl(asset?: Asset | any): string | null {
  if (!asset || !asset.fields) {
    return null;
  }

  // Handle localized file field
  let file = asset.fields.file;
  if (!file) return null;
  
  // If file is localized, get first locale value
  if (typeof file === 'object' && !('url' in file)) {
    const keys = Object.keys(file);
    if (keys.length > 0) file = file[keys[0]];
  }
  
  if (!file || typeof file !== 'object') return null;
  
  const url = 'url' in file ? String(file.url) : null;

  return url ? (url.startsWith('//') ? `https:${url}` : url) : null;
}

import { getEntries } from "./contentful";
import type { Entry, Asset } from "contentful";

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
  preview?: boolean
): Promise<Entry<SiteSettingsSkeleton> | null> {
  const entries = await getEntries<SiteSettingsSkeleton>(
    {
      content_type: "siteSettings",
      limit: 1,
      locale,
      include: 5, // Deep include to get all nested references
    },
    preview || false
  );

  return entries[0] || null;
}

/**
 * Helper to resolve nav link URL
 * Priority: target page slug > href
 */
export function resolveNavLinkUrl(navLink: Entry<NavLinkSkeleton>, locale?: string): string {
  const fields = navLink.fields;

  // If target page is set, use its slug
  if (fields.target) {
    const targetFields = fields.target.fields as any;
    const slug = targetFields.slug || targetFields.url;

    if (slug) {
      // Prepend locale if not default
      const localePrefix = locale && locale !== 'en-US' ? `/${locale}` : '';
      return `${localePrefix}/${slug}`;
    }
  }

  // Fall back to href
  return fields.href || '#';
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
export function getAssetUrl(asset?: Asset): string | null {
  if (!asset || !asset.fields || !asset.fields.file) {
    return null;
  }

  const file = asset.fields.file;
  const url = typeof file === 'object' && 'url' in file ? file.url : null;

  return url ? (url.startsWith('//') ? `https:${url}` : url) : null;
}

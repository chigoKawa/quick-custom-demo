import { getEntries } from "./contentful";
import { getSiteScope, SiteScopeError, unscoped } from "./site-scope";
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
    /** Feature flag — when false, hides the shopping cart icon in the site
     *  header. Not every demo customer is an e-commerce brand. Defaults to
     *  true when the field is absent (backward compat for entries that
     *  pre-date this field). */
    enableCart?: boolean;
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

export interface SiteSkeleton {
  contentTypeId: "site";
  fields: {
    internalName: string;
    siteSettings: Entry<SiteSettingsSkeleton>;
    domain?: string;
    defaultLocale?: string;
    /** Slug of the `landingPage` this site serves at `/`. Optional: when blank
     *  the home route falls back to NEXT_PUBLIC_CTF_HOMEPAGE_SLUG, then "home",
     *  which is what every single-site demo already does. Set it per brand when
     *  two sites in one space both need a home page — `landingPage.slug` is
     *  unique space-wide, so the brands need distinct slugs (e.g. "home" and
     *  "home-acme"). The slug never appears in the URL; `/` renders it. */
    homePageSlug?: string;
  };
}

/**
 * Fetch the site settings entry from Contentful.
 *
 * Two resolution paths, chosen by whether site scoping is on:
 *
 *  - Single-site (the default): siteSettings is a singleton. Oldest entry wins,
 *    which is the behaviour every existing demo already depends on.
 *  - Site-scoped: the `site` entry named by SITE_ID owns the settings, so we
 *    fetch that entry and follow its required `siteSettings` reference. There is
 *    no hardcoded default site id and no fallback to the singleton — falling
 *    back would hand one brand another brand's logo, theme and navigation,
 *    which is exactly the failure this mode exists to prevent. A missing or
 *    unresolvable site throws.
 */
export async function getSiteSettings(
  locale?: string,
  preview?: boolean,
  timelineToken?: string | null,
  environmentId?: string | null
): Promise<Entry<SiteSettingsSkeleton> | null> {
  const scope = getSiteScope();

  if (scope.mode === "site") {
    return getSiteSettingsForSite(scope.siteId, {
      locale,
      preview,
      timelineToken,
      environmentId,
    });
  }

  // include:5 resolves siteSettings → nav → navLinkColumn → navLink → target page (slug).
  // nt_experiences are stripped at the live-preview boundary, not at fetch time.
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
    timelineToken,
    environmentId
  );

  return entries[0] || null;
}

async function getSiteSettingsForSite(
  siteId: string,
  opts: {
    locale?: string;
    preview?: boolean;
    timelineToken?: string | null;
    environmentId?: string | null;
  }
): Promise<Entry<SiteSettingsSkeleton>> {
  // include:6 — one hop for site → siteSettings, then the same five levels the
  // singleton path resolves (nav → navLinkColumn → navLink → target page).
  const query: Record<string, unknown> = {
    content_type: "site",
    "sys.id": siteId,
    include: 6,
    limit: 1,
  };
  if (opts.locale) {
    query.locale = opts.locale;
  }

  // `site` is not itself site-owned — it is the thing being selected — so it is
  // fetched by id without a site filter.
  const sites = await getEntries<SiteSkeleton>(
    unscoped(query),
    opts.preview || false,
    opts.timelineToken,
    opts.environmentId
  );

  const site = sites[0];
  if (!site) {
    throw new SiteScopeError(
      `[site-scope] SITE_ID="${siteId}" does not resolve to a published \`site\` ` +
        `entry in this environment. Create the site entry, publish it, or unset ` +
        `SITE_ID to run this deployment as a single-site demo.`
    );
  }

  const settings = site.fields?.siteSettings as unknown as
    | Entry<SiteSettingsSkeleton>
    | undefined;

  // `siteSettings` is required on `site`, so an unresolved reference here means
  // the linked entry is unpublished (Delivery API drops the link rather than
  // returning a stub).
  if (!settings?.fields) {
    throw new SiteScopeError(
      `[site-scope] Site "${siteId}" has no resolvable \`siteSettings\`. The ` +
        `linked siteSettings entry is most likely unpublished. Refusing to fall ` +
        `back to another site's settings.`
    );
  }

  return settings;
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

/**
 * Resolve the slug of the landing page this deployment serves at `/`.
 *
 * Tiers, highest priority first:
 *  1. `site.homePageSlug` — site mode only, when the field is filled in. This is
 *     what lets two brands in one space each have a home page: `landingPage.slug`
 *     is unique space-wide, so brand B uses a distinct slug ("home-acme") while
 *     still rendering at `/`.
 *  2. `NEXT_PUBLIC_CTF_HOMEPAGE_SLUG`
 *  3. `"home"`
 *
 * Tiers 2 and 3 are not a cross-brand leak: in site mode `applySiteScope` adds
 * `fields.site.sys.id` to every landingPage query, so a fallback slug still
 * resolves inside this brand. A brand with no matching page 404s rather than
 * borrowing another brand's home page.
 *
 * Fetch cost is one `site` entry with `select` pinned to two Symbol fields —
 * `include` is omitted so the settings tree is not dragged along.
 */
export async function getHomePageSlug(opts?: {
  locale?: string;
  preview?: boolean;
  timelineToken?: string | null;
  environmentId?: string | null;
}): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_CTF_HOMEPAGE_SLUG || "home";
  const scope = getSiteScope();
  if (scope.mode !== "site") return configured;

  const query: Record<string, unknown> = {
    content_type: "site",
    "sys.id": scope.siteId,
    select: "sys.id,fields.internalName,fields.homePageSlug",
    limit: 1,
  };
  if (opts?.locale) {
    query.locale = opts.locale;
  }

  // `site` is the thing being selected, not site-owned content, so it is
  // fetched by id without a site filter.
  const sites = await getEntries<SiteSkeleton>(
    unscoped(query),
    opts?.preview || false,
    opts?.timelineToken,
    opts?.environmentId
  );

  const site = sites[0];
  if (!site) {
    // Same failure the layout reports, but the home route can hit it first.
    throw new SiteScopeError(
      `[site-scope] SITE_ID="${scope.siteId}" does not resolve to a published ` +
        `\`site\` entry in this environment. Create the site entry, publish it, ` +
        `or unset SITE_ID to run this deployment as a single-site demo.`
    );
  }

  // `select` narrows the returned field set, so read it back the same way the
  // siteSettings link is read above rather than trusting the skeleton type.
  const slug = site.fields?.homePageSlug as unknown as string | undefined;
  if (typeof slug === "string" && slug.trim().length > 0) {
    return slug.trim();
  }

  return configured;
}

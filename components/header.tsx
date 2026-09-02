"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, User, Heart, ShoppingBag, Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { getI18nConfig } from "@/i18n-config";
import type { MicrocopyDataMap } from "@/lib/microcopy";
import { createMicrocopyHelper } from "@/hooks/use-microcopy";
import { Skeleton } from "./ui/skeleton";
import type { Entry, Asset } from "contentful";
import type { SiteSettingsSkeleton } from "@/lib/site-settings";
import {
  resolveNavLinkUrl,
  getAssetUrl,
  getEntryField,
  getEntryFieldArray,
} from "@/lib/site-settings";
import { useSiteChromeLocale } from "@/features/site-chrome-locale";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { stripNtFieldsForLivePreview } from "@/lib/contentful-live-preview-shallow";
import SiteNav, { type NavNode } from "@/components/nav/site-nav";

interface HeaderProps {
  siteSettings: Entry<SiteSettingsSkeleton> | null;
}

/**
 * Mobile-menu render for a NavNode. No flyouts on mobile — children are
 * indented inline (recursive) so editors get the same hierarchy visible.
 */
function MobileNavNode({ node, depth }: { node: NavNode; depth: number }) {
  return (
    <>
      <a
        href={node.href}
        target={node.openInNewTab ? "_blank" : undefined}
        rel={node.rel}
        className={
          depth === 0
            ? "text-lg font-medium py-2 border-b border-border/50 hover:text-primary transition-colors"
            : "text-sm text-muted-foreground py-1 hover:text-primary transition-colors"
        }
        style={{ paddingLeft: depth * 16 }}
        data-contentful-entry-id={node.entryId}
        data-contentful-field-id="label"
      >
        {node.label}
      </a>
      {node.children?.map((child, i) => (
        <MobileNavNode
          key={`mnav-${depth}-${i}-${child.entryId}`}
          node={child}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function Header({ siteSettings }: HeaderProps) {
  const { locale: chromeLocale, defaultLocale: chromeDefaultLocale } =
    useSiteChromeLocale();
  const localePick = useMemo(
    () => ({ locale: chromeLocale, defaultLocale: chromeDefaultLocale }),
    [chromeLocale, chromeDefaultLocale]
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [locales, setLocales] = useState<string[]>([]);
  const [defaultLocale, setDefaultLocale] = useState<string>("en-US");
  const [microcopy, setMicrocopy] = useState<MicrocopyDataMap | null>(null);
  const [microcopyLoading, setMicrocopyLoading] = useState(true);
  const pathname = usePathname();

  // Live preview: strip nt_experiences only (nav targets must keep slug; include is capped at 3 server-side)
  const liveSiteSettings = useContentfulLiveUpdates(
    stripNtFieldsForLivePreview(siteSettings)
  );
  const inspectorProps = useContentfulInspectorMode({
    entryId: liveSiteSettings?.sys.id
  });

  // Helper to get microcopy with inspector props
  const mc = createMicrocopyHelper(microcopy);
  
  // Helper to get microcopy value - returns null while loading to show skeleton
  const t = (key: string): string | null => {
    if (microcopyLoading || microcopy === null) return null;
    return mc(key).value || null;
  };

  useEffect(() => {
    const load = async () => {
      const cfg = await getI18nConfig();
      setLocales(cfg.locales);
      setDefaultLocale(cfg.defaultLocale);

      const seg = pathname.split("/").filter(Boolean)[0];
      const effectiveLocale = cfg.locales.includes(seg)
        ? seg
        : cfg.defaultLocale;

      // Fetch microcopy
      setMicrocopyLoading(true);
      const mcRes = await fetch(
        `/api/microcopy?locale=${encodeURIComponent(effectiveLocale)}&withIds=true`,
      );
      if (mcRes.ok) {
        const mcData = (await mcRes.json()) as { microcopy?: MicrocopyDataMap };
        setMicrocopy(mcData?.microcopy ?? {});
      }
      setMicrocopyLoading(false);
    };
    load();
    return () => {};
  }, [pathname]);

  // Get main navigation entry and apply live updates
  const navEntry = getEntryField<Entry<any> | null>(
    liveSiteSettings,
    "headerMainNavigation",
    null,
    localePick
  );
  const liveNavEntry = useContentfulLiveUpdates(stripNtFieldsForLivePreview(navEntry));
  
  // Build a recursive navigation tree from headerMainNavigation.menuItems.
  // Contentful content types involved:
  //   - `navLink`          → leaf link (no children)
  //   - `navigationItem`   → hierarchical item; `subNavigationItems` array
  //                          may contain further `navigationItem`s
  //
  // Depth cap: 3 levels total (top → sub → sub-sub). The desktop flyout
  // component (`SiteNav`) renders level 3 as an inline stacked list rather
  // than opening a third popover — the recursion is complete but rendering
  // stays visually sane.
  const mainNavTree = useMemo<NavNode[]>(() => {
    if (!liveNavEntry) return [];

    // Recursive walker — reads label / target / children off any item that
    // looks like a resolved entry. Missing sys.id or fields → treated as
    // an unresolved link stub and dropped, same defensive filter the footer
    // now uses.
    const buildNode = (entry: Entry<any> | null | undefined, depth: number): NavNode | null => {
      if (!entry?.sys?.id || !entry.fields) return null;
      // Data depth cap: allow 5 levels of navigationItem so the mega-menu
      // has enough tree to render up to 4 visible levels (see SiteNav).
      if (depth > 5) return null;

      const label = getEntryField(entry, "label", "", localePick);
      if (!label) return null;

      const openInNewTab = getEntryField(entry, "openInNewTab", false, localePick);
      const rel = getEntryField(entry, "rel", "", localePick);
      const href = resolveNavLinkUrl(entry, localePick);

      // Optional fields on `navigationItem` — content model was extended
      // after some entries were created, so both may be absent. `getEntryField`
      // returns the default when the field key isn't present.
      const description = getEntryField<string>(entry, "description", "", localePick);
      const featuredImageAsset = getEntryField<Asset | null>(
        entry,
        "featuredImage",
        null,
        localePick
      );
      const imageUrl = featuredImageAsset ? getAssetUrl(featuredImageAsset, localePick) : null;
      const imageAlt = featuredImageAsset
        ? getEntryField<string>(featuredImageAsset as unknown as Entry<any>, "title", "", localePick)
        : "";

      // navigationItem carries subNavigationItems; navLink doesn't. Reading
      // via getEntryFieldArray returns [] when absent, so the branch is safe
      // to run against both content types.
      const rawChildren = getEntryFieldArray<Entry<any>>(entry, "subNavigationItems", localePick);
      const children = rawChildren
        .map((c) => buildNode(c, depth + 1))
        .filter((c): c is NavNode => c !== null);

      return {
        label,
        href,
        entryId: entry.sys.id,
        openInNewTab,
        rel: rel || undefined,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        imageAlt: imageAlt || label,
        imageEntryId: featuredImageAsset?.sys?.id,
        children: children.length > 0 ? children : undefined,
      };
    };

    const menuItems = getEntryFieldArray<Entry<any>>(liveNavEntry, "menuItems", localePick);
    return menuItems
      .map((item) => buildNode(item, 1))
      .filter((n): n is NavNode => n !== null);
  }, [liveNavEntry, localePick]);


  // Extract site settings fields with safe accessors
  const logoAsset = getEntryField<any>(liveSiteSettings, "logo", null, localePick);
  const logoUrl = logoAsset ? getAssetUrl(logoAsset, localePick) : null;
  const logoAlt = getEntryField(liveSiteSettings, "logoAlt", "Logo", localePick);
  const logoLink = getEntryField(liveSiteSettings, "logoLink", "/", localePick);

  // Feature flag — some demo brands aren't e-commerce, so editors can hide
  // the cart icon. Defaults to true so pre-existing entries (without the
  // field) behave exactly as before.
  const enableCart = getEntryField<boolean>(
    liveSiteSettings,
    "enableCart",
    true,
    localePick
  );

  // Get top links
  const headerTopLinks = getEntryFieldArray<Entry<any>>(
    liveSiteSettings,
    "headerTopLinks",
    localePick
  );
  const headerAccountLinks = getEntryFieldArray<Entry<any>>(
    liveSiteSettings,
    "headerAccountLinks",
    localePick
  );
  const headerPromoLink = getEntryField<Entry<any> | null>(
    liveSiteSettings,
    "headerPromoLink",
    null,
    localePick
  );

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top bar */}
      <div className="border-b border-border/50">
        <div className="container max-w-7xl mx-auto px-4 py-2">
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {t("nav.shippingNote") ? (
              <p>{t("nav.shippingNote")}</p>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
            <div className="hidden md:flex items-center gap-6">
              {headerTopLinks.map((linkEntry, idx) => {
                const href = resolveNavLinkUrl(linkEntry, localePick);
                const label = getEntryField(linkEntry, "label", "", localePick);
                const openInNewTab = getEntryField(linkEntry, "openInNewTab", false, localePick);
                const rel = getEntryField(linkEntry, "rel", "", localePick);
                return (
                  <a
                    key={`top-${idx}-${linkEntry.sys?.id ?? ""}`}
                    href={href}
                    className="hover:text-foreground transition-colors"
                    target={openInNewTab ? "_blank" : undefined}
                    rel={rel || undefined}
                    data-contentful-entry-id={linkEntry.sys?.id}
                    data-contentful-field-id="label"
                  >
                    {label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-border/50 ">
        <div className="containerx  max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <nav className="flex flex-col gap-1 mt-8">
                  {mainNavTree.map((node, i) => (
                    <MobileNavNode key={`mnav-${i}-${node.entryId}`} node={node} depth={0} />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link
              href={logoLink}
              className="flex items-center gap-2"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAlt}
                  width={60}
                  height={60}
                  className="max-h-16 w-auto"
                  data-contentful-entry-id={liveSiteSettings?.sys.id}
                  data-contentful-field-id="logo"
                />
              ) : (
                <div
                  className="w-10 h-10 bg-primary rounded-full flex items-center justify-center"
                  data-contentful-entry-id={liveSiteSettings?.sys.id}
                  data-contentful-field-id="logoAlt"
                >
                  <span className="text-primary-foreground font-bold text-lg">
                    {logoAlt.substring(0, 3).toUpperCase()}
                  </span>
                </div>
              )}
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <Search className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {headerAccountLinks.length > 0 ? (
                    headerAccountLinks.map((linkEntry, idx) => {
                      const href = resolveNavLinkUrl(linkEntry, localePick);
                      const label = getEntryField(linkEntry, "label", "", localePick);
                      return (
                        <DropdownMenuItem key={`acct-${idx}-${linkEntry.sys?.id ?? ""}`} asChild>
                          <a
                            href={href}
                            data-contentful-entry-id={linkEntry.sys?.id}
                            data-contentful-field-id="label"
                          >
                            {label}
                          </a>
                        </DropdownMenuItem>
                      );
                    })
                  ) : (
                    <>
                      <DropdownMenuItem>Sign In</DropdownMenuItem>
                      <DropdownMenuItem>Register</DropdownMenuItem>
                      <DropdownMenuItem>My Orders</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {enableCart && (
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Heart className="h-5 w-5" />
                </Button>
              )}

              {enableCart && (
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-medium flex items-center justify-center text-accent-foreground">
                    2
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile search */}
          {isSearchOpen && (
            <div className="md:hidden mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("nav.static.searchBar.placeholder.text") || "Search..."}
                  className="pl-10 pr-4 rounded-full bg-secondary/50"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="hidden md:block border-b border-border/50 ">
        <div className="containerx max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 py-3">
            <SiteNav items={mainNavTree} />
            {headerPromoLink && (
              <a
                href={resolveNavLinkUrl(headerPromoLink, localePick)}
                className="ml-4 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                data-contentful-entry-id={headerPromoLink.sys?.id}
                data-contentful-field-id="label"
              >
                {getEntryField(headerPromoLink, "label", "", localePick)}
              </a>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

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
import type { Entry } from "contentful";
import type { SiteSettingsSkeleton, NavLinkSkeleton, HeaderNavigationSkeleton } from "@/lib/site-settings";
import { resolveNavLinkUrl, getAssetUrl } from "@/lib/site-settings";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";

// Safe field accessor for Contentful entries (handles localized vs resolved fields)
function getField<T>(entry: any, fieldName: string, fallback: T): T {
  if (!entry?.fields) return fallback;
  const value = entry.fields[fieldName];
  if (value === undefined || value === null) return fallback;
  // If it's a localized object (not an array, not an entry with sys), get first locale value
  if (typeof value === 'object' && !Array.isArray(value) && !('sys' in value)) {
    const keys = Object.keys(value);
    if (keys.length > 0) return value[keys[0]] as T;
  }
  return value as T;
}

function getFieldArray<T>(entry: any, fieldName: string): T[] {
  const value = getField(entry, fieldName, []);
  return Array.isArray(value) ? value : [];
}

interface HeaderProps {
  siteSettings: Entry<SiteSettingsSkeleton> | null;
}

export function Header({ siteSettings }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [locales, setLocales] = useState<string[]>([]);
  const [defaultLocale, setDefaultLocale] = useState<string>("en-US");
  const [microcopy, setMicrocopy] = useState<MicrocopyDataMap | null>(null);
  const [microcopyLoading, setMicrocopyLoading] = useState(true);
  const pathname = usePathname();

  // Contentful Live Preview
  const liveSiteSettings = useContentfulLiveUpdates(siteSettings);
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
  const navEntry = getField<Entry<any> | null>(liveSiteSettings, 'headerMainNavigation', null);
  const liveNavEntry = useContentfulLiveUpdates(navEntry);
  
  // Get main navigation links from headerMainNavigation
  const mainNavLinks = useMemo(() => {
    if (!liveNavEntry) return [];
    
    const menuItems = getFieldArray<Entry<any>>(liveNavEntry, 'menuItems');
    
    return menuItems
      .filter((item) => item?.fields) // Filter out unresolved links
      .map((item) => {
        const label = getField(item, 'label', '');
        const openInNewTab = getField(item, 'openInNewTab', false);
        const rel = getField(item, 'rel', '');
        return {
          label,
          href: resolveNavLinkUrl(item),
          entryId: item.sys?.id,
          openInNewTab,
          rel,
        };
      });
  }, [liveNavEntry]);

  // Extract site settings fields with safe accessors
  const logoAsset = getField<any>(liveSiteSettings, 'logo', null);
  const logoUrl = logoAsset ? getAssetUrl(logoAsset) : null;
  const logoAlt = getField(liveSiteSettings, 'logoAlt', 'Logo');
  const logoLink = getField(liveSiteSettings, 'logoLink', '/');

  // Get top links
  const headerTopLinks = getFieldArray<Entry<any>>(liveSiteSettings, 'headerTopLinks');
  const headerAccountLinks = getFieldArray<Entry<any>>(liveSiteSettings, 'headerAccountLinks');
  const headerPromoLink = getField<Entry<any> | null>(liveSiteSettings, 'headerPromoLink', null);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top bar */}
      <div className="border-b border-border/50">
        <div className="container max-w-7xl mx-auto px-4 py-2">
          more
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {t("nav.shippingNote") ? (
              <p>{t("nav.shippingNote")}</p>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
            <div className="hidden md:flex items-center gap-6">
              {headerTopLinks.map((linkEntry, idx) => {
                const href = resolveNavLinkUrl(linkEntry);
                const label = getField(linkEntry, 'label', '');
                const openInNewTab = getField(linkEntry, 'openInNewTab', false);
                const rel = getField(linkEntry, 'rel', '');
                return (
                  <a
                    key={linkEntry.sys?.id || idx}
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
                <nav className="flex flex-col gap-4 mt-8">
                  {mainNavLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-lg font-medium py-2 border-b border-border/50 hover:text-primary transition-colors"
                      target={link.openInNewTab ? "_blank" : undefined}
                      rel={link.rel}
                      data-contentful-entry-id={link.entryId}
                      data-contentful-field-id="label"
                    >
                      {link.label}
                    </a>
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
                      const href = resolveNavLinkUrl(linkEntry);
                      const label = getField(linkEntry, 'label', '');
                      return (
                        <DropdownMenuItem key={linkEntry.sys?.id || idx} asChild>
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

              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Heart className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-medium flex items-center justify-center text-accent-foreground">
                  2
                </span>
              </Button>
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
          <div className="flex items-center gap-8 py-3">
            {mainNavLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium hover:text-primary transition-colors"
                target={link.openInNewTab ? "_blank" : undefined}
                rel={link.rel}
                data-contentful-entry-id={link.entryId}
                data-contentful-field-id="label"
              >
                {link.label}
              </a>
            ))}
            {headerPromoLink && (
              <a
                href={resolveNavLinkUrl(headerPromoLink)}
                className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                data-contentful-entry-id={headerPromoLink.sys?.id}
                data-contentful-field-id="label"
              >
                {getField(headerPromoLink, 'label', '')}
              </a>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

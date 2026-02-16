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
import type { MicrocopyMap } from "@/lib/microcopy";
// import { Skeleton } from "@/components/ui/skeleton"
import { Skeleton } from "./ui/skeleton";

type NavCategory = { title: string; slug: string };

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [locales, setLocales] = useState<string[]>([]);
  const [defaultLocale, setDefaultLocale] = useState<string>("en-US");
  const [microcopy, setMicrocopy] = useState<MicrocopyMap | null>(null);
  const [microcopyLoading, setMicrocopyLoading] = useState(true);
  const pathname = usePathname();

  // Helper to get microcopy value - returns null while loading to show skeleton
  const t = (key: string): string | null => {
    if (microcopyLoading || microcopy === null) return null;
    return microcopy[key] ?? null;
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

      // Fetch categories
      const res = await fetch(
        `/api/navigation/categories?locale=${encodeURIComponent(effectiveLocale)}`,
      );
      if (!res.ok) {
        setCategories([]);
      } else {
        const data = (await res.json()) as {
          items?: Array<{ title?: unknown; slug?: unknown }>;
        };
        const items = Array.isArray(data?.items) ? data.items : [];
        setCategories(
          items
            .map((i) => ({
              title: typeof i?.title === "string" ? i.title : "",
              slug: typeof i?.slug === "string" ? i.slug : "",
            }))
            .filter((i) => i.title && i.slug),
        );
      }

      // Fetch microcopy
      setMicrocopyLoading(true);
      const mcRes = await fetch(
        `/api/microcopy?locale=${encodeURIComponent(effectiveLocale)}`,
      );
      if (mcRes.ok) {
        const mcData = (await mcRes.json()) as { microcopy?: MicrocopyMap };
        setMicrocopy(mcData?.microcopy ?? {});
      }
      setMicrocopyLoading(false);
    };
    load();
    return () => {};
  }, [pathname]);

  const categoryLinks = useMemo(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    const currentLocale = locales.includes(seg) ? seg : defaultLocale;
    const prefix = currentLocale === defaultLocale ? "" : `/${currentLocale}`;
    return categories.map((c) => ({
      name: c.title,
      href: `${prefix}/category/${c.slug}` || "#",
    }));
  }, [categories, defaultLocale, locales, pathname]);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top bar */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {t("nav.shippingNote") ? (
              <p>{t("nav.shippingNote")}</p>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
            <div className="hidden md:flex items-center gap-6">
              {t("nav.static.link.support.label") ? (
                <a href="#" className="hover:text-foreground transition-colors">
                  {t("nav.static.link.support.label")}
                </a>
              ) : (
                <Skeleton className="h-4 w-16" />
              )}
              {t("nav.static.link.teacherDiscount.label") ? (
                <a href="#" className="hover:text-foreground transition-colors">
                  {t("nav.static.link.teacherDiscount.label")}
                </a>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
              {t("nav.static.link.studentDeals.label") ? (
                <a href="#" className="hover:text-foreground transition-colors">
                  {t("nav.static.link.studentDeals.label")}
                </a>
              ) : (
                <Skeleton className="h-4 w-20" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
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
                  {categoryLinks.map((cat) => (
                    <a
                      key={cat.name}
                      href={cat.href}
                      className="text-lg font-medium py-2 border-b border-border/50 hover:text-primary transition-colors"
                    >
                      {cat.name}
                    </a>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo - Translated to English */}
            <Link href="/" className="flex items-center gap-2">
              <img
                width={60}
                height={60}
                src="data:image/svg+xml;base64,PHN2ZyBpZD0ibG9nb19zdmdfX0xheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeD0iMCIgeT0iMCIgd2lkdGg9IjE5OCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDgyNi4xIDE1OCIgc3R5bGU9Ii0taWNvbi1zaXplOmF1dG8iIHhtbDpzcGFjZT0icHJlc2VydmUiIHRpdGxlPSJMb2dvIiBhcmlhLWxhYmVsPSJMb2dvIiBjbGFzcz0iU3RhbmRhcmRfbG9nb1N2Z19fTWpSNUwiPjxzdHlsZT4ubG9nb19zdmdfX3N0MXtmaWxsOiMzYzNjM2J9PC9zdHlsZT48cGF0aCBkPSJNMCAwdjE1OGgxNjUuNFYwSDB6bTE0OS45IDQ0LjFjLS44IDIuNy0xLjkgNS4zLTIuOSA4LjEtLjggMi4yLTIgNC4yLTMuMiA2LjMtMS4yIDItNC41IDYuMi00LjUgNi4ycy0zLjYgNC43LTUuNSA2LjljLTIuNyAzLjItNC41IDUuOS03IDguOC0xLjMgMS41LTQuNCA1LTQuNCA1LTEuNCAxLjMtMi45IDIuNS00LjYgMy40LS43LjQtMy41LTEuMy00LjgtMi43LS44LS44LjctMS45IDEuNC0yLjYgMS4zLTEuMiAzLjUtMyAzLjUtM3MyLjctMy43IDQtNS4zYy4xLTQuMi0xLjctOC41LTMtMTEuNy0uOC0yLTEuOC0zLjUtMy41LTQuOC0xLjYtMS4zLTQuOC0yLjgtNC44LTIuOHMtMy4xLS44LTUtMS4xYy0yLjctLjUtNi4yLjQtNy45LjYtNy4xLjgtNS41LjktOS4yIDEuNC4xIDIgLjMgNC41LjQgNy40LjEgMS41LS4yIDMuMy0uMSA0LjcuMSAxLjUuNCAzLjkuNCAzLjlzLjYgMy45IDEuNCA1LjdjMS4zIDMuMSA0LjcgNy4yIDguNCAxMC4yIDIuMSAxLjcgMy45IDMuNyA1LjQgNS4zIDMuNCAzLjcgOS40IDEyLjggOS40IDEyLjhzMy43IDkuMiA1LjMgMTMuN2MuNSAxLjMgMS43IDQuNyAxLjcgNC43czEuNiAzLjcgMiA1LjZjMSA0LjUgMSA5LTIuNCAxMC0xLjYuNS0yIC42LTQuMi4yLTEuMi0uMi0zLjYtNC45LTQtNi44LS40LTEuOS0yLTkuNC0yLTkuNHMtMi43LTcuNi0zLjctOS40Yy0xLjgtMy40LTQuMS02LjMtNi4zLTkuNS0xLjgtMi42LTYuMy03LjItNi4zLTcuMnMtNS4zLTMuNy04LTUuNWMtMi45LTItNS45LTIuNC05LTEuNS0xLjIuMy0yLjQuOC00IDEuMi0yIC41LTMuMiAyLjYtNC45IDQuMS0yLjQgMi4xLTYuNiA2LjgtNi42IDYuOHMtNSA3LTYuMSA5LjdjLTEuOCA0LjQtMy45IDguNy00LjggMTMuNS0xIDUtMi42IDEzLjgtOS41IDkuMi0xLjQtLjktMS4xLTQuMS0uOS02LjIuNS00IDIuMi04LjcgMi42LTExLjYuNi00LjYgNC42LTExLjYgNC42LTExLjZzMi40LTUuNCA0LjMtNy45YzEuOS0yLjYgNy03LjggNy03LjhzMy42LTIuOSA1LjQtNC43YzEuOS0xLjkgMi42LTguOCAyLjYtOC44cy41LTUuOC4yLTguMmMtLjItMS40LS44LTcuNS0uOC03LjVzLS43LTUuNS0uOC02LjZjLTEuNC4xLTIuOC4yLTUgMC0xLjktLjItNi41LS42LTYuNS0uNnMtNS41LjUtOC4xLjdjLTIuMy4yLTYuNCAxLjUtNi40IDEuNXMtMy40LjQtNC4yLjhjLjIgMS4zIDEuMSA0LjEgMS4xIDQuMWwxIDYuNWMuNSAzLjUuMyA0LjYtMiA1LjEtMy45LjgtMy42LjYtNC41LTIuOS0uNS0xLjktMS42LTQuNS0yLjItNy41LS42LTIuNy0xLjMtOC4zLTEuMy04LjNsLTEuNy04LjhzLTEtMy42LTEuOC03LjFjLS40LTEuNC0xLjYtMS4xLTIuOS0xLTQuMy42LTUuNC0uOS01LjQtLjlsLS41LTMuN3MtLjgtMi41LS44LTMuN2MwLTEuNS4zLTIuOCAzLjgtMy4zIDMuOS0uNiAxMC4xLS40IDEzLjctLjlzNS43LTEuNSA2LjktMS4xYzEgLjQgMSAxLjkgMS40IDMuNy4yLjcuOCAzLjEuOCAzLjFsLjMgMi43Yy0xLjIuMi0yLjQuOC0zLjUgMS0xLjUuNC0yLjkuNS00IC43LTEuNy4zLTEuNyAyLTEuNyAyLjggMCAyLjMgMS4xIDYgMi4yIDEwLjUgMi4zLjIgNy45LTEuMSA5LjktMS4xIDMuMi0uMiAxNC0xLjYgMTQtMS42bDkuOS0uM2MyLjMtLjQgMi0xLjkgMi0zLjYgMC0xLjYtMS4zLTMuNi0xLjMtMy42cy0xLjMtMS41LTIuMS0yLjFjLTMuMy0yLjgtMi0xMi42LjctMTUuNi43LS44IDIuNi0yIDMuMy0yLjUgMi0xLjQgMy4yLTEuNSA1LjItMS41IDQuMSAwIDcuNSAxLjMgOS4zIDMuNyAyLjEgMi44IDMuNiA1LjkgMy42IDguMiAwIDQuMi0uNyA1LjctMy4zIDguNy0yIDIuNC0yLjMgMy4yLTIuMyA2IDAgMS4xIDEgMS42IDEuOSAxLjcgMS41LjIgMy4xLS4yIDQuOC0uM3MzLjQuMSA1LjEuMWMzLjUgMCA2LjkuNyA5LjkgMSA0LjUuNCAxMC40IDEuNCAxMi41IDMuMSAyIDEuNyAzLjcgMy4yIDQuOSA0LjggMS4xIDEuNSAyLjIgMi45IDMuMiA0LjQgMi4yIDMuMSAyLjMgNi41IDMuMyA5LjggMS44LTEuNiA1LjUtNi45IDcuMS0xMCAxLjItMi4yIDIuOS0zLjkgMi40LTQuMi0xLjgtMS4xLTQuMS0xLjItNi4xLTIuNC0xLS42LjUtMi4yIDIuOC01LjMuNC0uNiAxLjEtMi4zIDEuNS0yLjkgMS4yLTIuMyA0LjctNS42IDQuNy01LjZzMy43LTIuMSA1LjMtMi4xYzMuMi4xIDUuNCAyLjYgMy44IDguNnoiIHN0eWxlPSJmaWxsOiNlNzMzMzEiPjwvcGF0aD48cGF0aCBjbGFzcz0ibG9nb19zdmdfX3N0MSIgZD0iTTIwOS44IDI4LjZoMjcuOWwyMCA0Mi43YzIuNCA1LjEgMy45IDEwIDQuOSAxNy4zaC40YzAtNi40LS4xLTEzLjYtLjEtMjAuMlYyOC42aDIzLjhWMTI3aC0yNS44TDIzOSA4MS4zYy0yLjgtNS44LTQuMy0xMS4yLTUtMTcuM2gtLjNjMCA0LjkuMSAxMy4zLjEgMjAuMXY0M2gtMjRWMjguNnpNMzYyIDEwNy45VjEyN2gtNjAuN1YyOC42SDM2MXYxOS4xaC0zMy41djE5LjRIMzU5Vjg2aC0zMS41djIxLjlIMzYyek0zOTguMyAyOC42djY3LjVjMCA3LjYgNCAxMi4xIDExIDEyLjFzMTEuMS00LjQgMTEuMS0xMi4xVjI4LjZoMjYuMXY2OC41YzAgMjAuMS0xMy43IDMyLjMtMzcuMiAzMi4zcy0zNy4yLTEyLjItMzcuMi0zMi4zVjI4LjZoMjYuMnpNNDYwIDI4LjZoMzQuOGwxMCA0Ni43YzEuMSA0LjkgMS44IDEwLjUgMS45IDEzLjloLjRjLjEtMy4zIDEtOSAxLjktMTRsOS40LTQ2LjZoMzUuMVYxMjdoLTIzVjc0YzAtNi4yIDAtMTIuOC40LTE5aC0uNGMtLjQgMy42LTEgNy41LTEuNyAxMC43TDUxNi4xIDEyN2gtMTkuM2wtMTMuNC02MS4zYy0uNy0zLjMtMS40LTcuMi0xLjctMTAuNWgtLjRjLjQgNiAuNiAxMi41LjYgMTguOXY1M0g0NjBWMjguNnpNNjE4LjQgMTA2LjloLTI1LjVsLTQuNCAyMC4xaC0yNi4xbDI3LTk4LjRINjIybDI3IDk4LjRoLTI2LjJsLTQuNC0yMC4xem0tNC0xOC01LjUtMjUuNGMtMS4xLTQuOS0yLjItOS42LTMtMTUuNGgtLjNjLS43IDUuOC0xLjkgMTAuNS0zIDE1LjRsLTUuNSAyNS40aDE3LjN6TTY1Ny44IDI4LjZoMjcuOWwyMCA0Mi43YzIuNCA1LjEgMy45IDEwIDQuOSAxNy4zaC40YzAtNi40LS4xLTEzLjYtLjEtMjAuMlYyOC42aDIzLjhWMTI3aC0yNS44TDY4NyA4MS4zYy0yLjgtNS44LTQuMy0xMS4yLTUtMTcuM2gtLjNjMCA0LjkuMSAxMy4zLjEgMjAuMXY0M2gtMjRWMjguNnpNNzQ5LjMgMjguNmgyNy45bDIwIDQyLjdjMi40IDUuMSAzLjkgMTAgNC45IDE3LjNoLjRjMC02LjQtLjEtMTMuNi0uMS0yMC4yVjI4LjZoMjMuOFYxMjdoLTI1LjhsLTIxLjktNDUuN2MtMi44LTUuOC00LjMtMTEuMi01LTE3LjNoLS4zYzAgNC45LjEgMTMuMy4xIDIwLjF2NDNoLTI0VjI4LjZ6Ij48L3BhdGg+PC9zdmc+"
              />

              {/* <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">TXT</span>
              </div> */}
              {/* <div className="hidden sm:block">
                <h1 className="text-xl font-semibold tracking-tight">
                  Neumann
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">Bookstore</p>
              </div> */}
            </Link>

            {/* Search bar - Desktop - Translated placeholder */}
            {/* <div className="hidden md:flex flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("nav.static.searchBar.placeholder.text") || ""}
                  className="pl-10 pr-4 py-5 rounded-full bg-secondary/50 border-transparent focus:border-primary focus:bg-card"
                />
              </div>
            </div> */}

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
                  <DropdownMenuItem>Sign In</DropdownMenuItem>
                  <DropdownMenuItem>Register</DropdownMenuItem>
                  <DropdownMenuItem>My Orders</DropdownMenuItem>
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

          {/* Mobile search - Translated placeholder */}
          {isSearchOpen && (
            <div className="md:hidden mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("nav.static.searchBar.placeholder.text") || ""}
                  className="pl-10 pr-4 rounded-full bg-secondary/50"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation - Translated dropdown items */}
      <nav className="hidden md:block border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-8 py-3">
            {categoryLinks.map((cat) => (
              <a
                key={cat.name}
                href={cat.href}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {cat.name}
              </a>
            ))}
            {t("nav.static.link.promotions.label") ? (
              <a
                href="#"
                className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
              >
                {t("nav.static.link.promotions.label")}
              </a>
            ) : (
              <Skeleton className="h-4 w-20" />
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

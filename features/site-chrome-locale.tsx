"use client";

import { createContext, useContext, type ReactNode } from "react";

type SiteChromeLocale = {
  locale: string;
  defaultLocale: string;
};

const SiteChromeLocaleContext = createContext<SiteChromeLocale | null>(null);

export function SiteChromeLocaleProvider({
  locale,
  defaultLocale,
  children,
}: SiteChromeLocale & { children: ReactNode }) {
  return (
    <SiteChromeLocaleContext.Provider value={{ locale, defaultLocale }}>
      {children}
    </SiteChromeLocaleContext.Provider>
  );
}

export function useSiteChromeLocale(): SiteChromeLocale {
  const ctx = useContext(SiteChromeLocaleContext);
  if (!ctx) {
    return { locale: "en-US", defaultLocale: "en-US" };
  }
  return ctx;
}

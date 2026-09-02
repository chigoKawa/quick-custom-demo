"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { SiteTheme } from "@/lib/theme";
import { deriveAppTheme, type AppTheme } from "./theme";

const AppThemeContext = createContext<AppTheme | null>(null);

export function AppThemeProvider({
  theme,
  children,
}: {
  theme: SiteTheme | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => deriveAppTheme(theme), [theme]);
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    // Render-time fallback so component imports outside the provider don't crash.
    return deriveAppTheme(null);
  }
  return ctx;
}

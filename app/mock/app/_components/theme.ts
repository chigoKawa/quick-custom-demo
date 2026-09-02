// Theme bridge for the mock app shell. The mock pulls colors from the project's
// `siteSettings.theme` JSON. When that's missing we fall back to a sensible
// neutral palette so the mock still renders.
import type { SiteTheme } from "@/lib/theme";

export type AppTheme = {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textMuted: string;
  textInverse: string;
  borderSubtle: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  navy: string;
  navyLight: string;
};

const FALLBACK: AppTheme = {
  primary: "#0F172A",
  primaryForeground: "#FFFFFF",
  background: "#F4F4F6",
  foreground: "#0A0A0A",
  surface: "#FFFFFF",
  surfaceMuted: "#F8F9FB",
  textPrimary: "#0A0A0A",
  textMuted: "#6B7280",
  textInverse: "#FFFFFF",
  borderSubtle: "#E5E7EB",
  accent: "#0F172A",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#DC2626",
  navy: "#0F172A",
  navyLight: "#1F2937",
};

export function deriveAppTheme(theme: SiteTheme | null | undefined): AppTheme {
  const c = theme?.colors ?? {};
  const primary = c.primary ?? FALLBACK.primary;
  const primaryForeground = c.primaryForeground ?? FALLBACK.primaryForeground;
  const accent = c.accent ?? primary;
  const foreground = c.foreground ?? FALLBACK.foreground;
  const cardForeground = c.cardForeground ?? foreground;
  const muted = c.muted ?? FALLBACK.surfaceMuted;
  const mutedForeground = c.mutedForeground ?? FALLBACK.textMuted;

  return {
    primary,
    primaryForeground,
    background: c.background ?? FALLBACK.background,
    foreground,
    surface: c.card ?? c.background ?? FALLBACK.surface,
    surfaceMuted: muted,
    textPrimary: cardForeground,
    textMuted: mutedForeground,
    textInverse: primaryForeground,
    borderSubtle: c.border ?? FALLBACK.borderSubtle,
    accent,
    success: FALLBACK.success,
    warning: FALLBACK.warning,
    danger: c.destructive ?? FALLBACK.danger,
    // Used by the "brand" emphasis variant on heroCard — a darker companion
    // to primary. We synthesise a navy from foreground so the hero remains
    // dark and readable on light themes.
    navy: foreground,
    navyLight: c.secondary && c.secondary !== c.background ? c.secondary : foreground,
  };
}

export function emphasisToBackground(
  theme: AppTheme,
  emphasis?: string
): { background: string; foreground: string } {
  switch (emphasis) {
    case "brand":
      return {
        background: `linear-gradient(135deg, ${theme.navy} 0%, ${theme.navyLight} 100%)`,
        foreground: theme.textInverse,
      };
    case "accent":
      return {
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)`,
        foreground: theme.primaryForeground,
      };
    case "danger":
      return { background: theme.danger, foreground: theme.textInverse };
    case "success":
      return { background: theme.success, foreground: theme.textInverse };
    case "warning":
      return { background: "#FFF8E1", foreground: "#7A4F00" };
    default:
      return { background: theme.surface, foreground: theme.textPrimary };
  }
}

/**
 * Theme system — driven by the `theme` JSON field on the siteSettings content type.
 *
 * Shape stored in Contentful:
 * {
 *   "colors": {
 *     "primary":    "#e73331",
 *     "background": "#ffffff",
 *     "foreground": "#1a1a1a",
 *     "secondary":  "#f4f4f5",
 *     "accent":     "#f59e0b",
 *     "muted":      "#f4f4f5",
 *     "border":     "#e4e4e7",
 *     "card":       "#ffffff"
 *   },
 *   "radius": "0.5rem",
 *   "fonts": {
 *     "sans": "inter",       ← registry key, NOT a raw family name
 *     "serif": "lora",
 *     "mono": "fira-code"
 *   },
 *   "typography": {
 *     "headingWeight": "700",
 *     "bodySize": "1rem",
 *     "lineHeight": "1.6",
 *     "letterSpacing": "0em"
 *   }
 * }
 *
 * Font values are registry keys from lib/font-registry.ts.
 * The locale layout resolves each key → CSS variable (e.g. "--font-inter")
 * and injects `--font-sans: var(--font-inter)` into :root.
 * All font variables are pre-loaded on <body> in app/layout.tsx.
 */

export interface SiteTheme {
  colors?: {
    primary?: string;
    primaryForeground?: string;
    background?: string;
    foreground?: string;
    secondary?: string;
    secondaryForeground?: string;
    accent?: string;
    accentForeground?: string;
    muted?: string;
    mutedForeground?: string;
    border?: string;
    card?: string;
    cardForeground?: string;
    ring?: string;
    destructive?: string;
  };
  radius?: string;
  /** Values are font registry keys, e.g. "inter", "lora", "fira-code" */
  fonts?: {
    sans?: string;
    serif?: string;
    mono?: string;
  };
  typography?: {
    /** Font weight applied to h1–h6, e.g. "700" */
    headingWeight?: string;
    /** Base body font size, e.g. "1rem" or "16px" */
    bodySize?: string;
    /** Base line height, e.g. "1.6" */
    lineHeight?: string;
    /** Letter spacing for body, e.g. "0em" or "-0.01em" */
    letterSpacing?: string;
    /** Letter spacing override for headings, e.g. "-0.03em" */
    headingLetterSpacing?: string;
  };
}

/**
 * Converts a SiteTheme object into a CSS `:root { ... }` override string.
 *
 * Font keys are resolved via the font registry — each becomes
 * `--font-sans: var(--font-inter)` rather than a raw family name,
 * so Next.js font optimisation (preload, subset, no-FOUT) is preserved.
 *
 * Only non-empty values are emitted — globals.css defaults remain for anything not set.
 */
export function themeToCSS(theme: SiteTheme | null | undefined): string {
  if (!theme) return "";

  // Import inline to keep this file usable in both server and app contexts.
  // The registry itself has no side-effects.
  const { getFontVariable } = require("./font-registry") as typeof import("./font-registry");

  const vars: string[] = [];

  const c = theme.colors ?? {};
  if (c.primary)             vars.push(`--primary: ${c.primary};`);
  if (c.primaryForeground)   vars.push(`--primary-foreground: ${c.primaryForeground};`);
  if (c.background)          vars.push(`--background: ${c.background};`);
  if (c.foreground)          vars.push(`--foreground: ${c.foreground};`);
  if (c.secondary)           vars.push(`--secondary: ${c.secondary};`);
  if (c.secondaryForeground) vars.push(`--secondary-foreground: ${c.secondaryForeground};`);
  if (c.accent)              vars.push(`--accent: ${c.accent};`);
  if (c.accentForeground)    vars.push(`--accent-foreground: ${c.accentForeground};`);
  if (c.muted)               vars.push(`--muted: ${c.muted};`);
  if (c.mutedForeground)     vars.push(`--muted-foreground: ${c.mutedForeground};`);
  if (c.border)              vars.push(`--border: ${c.border};`);
  if (c.card)                vars.push(`--card: ${c.card};`);
  if (c.cardForeground)      vars.push(`--card-foreground: ${c.cardForeground};`);
  if (c.ring)                vars.push(`--ring: ${c.ring};`);
  if (c.destructive)         vars.push(`--destructive: ${c.destructive};`);

  if (theme.radius) vars.push(`--radius: ${theme.radius};`);

  // Fonts — resolve registry key → CSS variable reference
  const f = theme.fonts ?? {};
  const sansVar  = getFontVariable(f.sans);
  const serifVar = getFontVariable(f.serif);
  const monoVar  = getFontVariable(f.mono);
  if (sansVar)  vars.push(`--font-sans: var(${sansVar});`);
  if (serifVar) vars.push(`--font-serif: var(${serifVar});`);
  if (monoVar)  vars.push(`--font-mono: var(${monoVar});`);

  // Typography scale
  const t = theme.typography ?? {};
  if (t.headingWeight)        vars.push(`--heading-weight: ${t.headingWeight};`);
  if (t.bodySize)             vars.push(`--body-size: ${t.bodySize};`);
  if (t.lineHeight)           vars.push(`--line-height: ${t.lineHeight};`);
  if (t.letterSpacing)        vars.push(`--letter-spacing: ${t.letterSpacing};`);
  if (t.headingLetterSpacing) vars.push(`--heading-letter-spacing: ${t.headingLetterSpacing};`);

  if (vars.length === 0) return "";
  return `:root {\n  ${vars.join("\n  ")}\n}`;
}

/** Default theme used when the Contentful field is empty — matches globals.css. */
export const DEFAULT_THEME: SiteTheme = {
  colors: {
    primary: "#2d6b6a",
    background: "#f9f6f1",
    foreground: "#2a1f14",
    secondary: "#f0ece5",
    accent: "#d4882a",
    muted: "#f0ece5",
    border: "#e0d8ce",
    card: "#ffffff",
  },
  radius: "0.5rem",
  fonts: {
    sans: "inter",
  },
  typography: {
    headingWeight: "700",
    bodySize: "1rem",
    lineHeight: "1.6",
    letterSpacing: "0em",
    headingLetterSpacing: "-0.02em",
  },
};

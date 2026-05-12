/**
 * Font registry — all fonts that can be selected from Contentful theme.
 *
 * Rules:
 * - Every font here is pre-loaded by Next.js at build time (zero runtime fetch).
 * - Each entry exposes the CSS variable name Next.js assigns, plus display metadata
 *   used by the Theme Editor app for the picker UI.
 * - To add a font: import it from next/font/google in app/layout.tsx, give it a
 *   `variable` option, add it to BODY_FONT_CLASSES, then add an entry here.
 *
 * The locale layout reads `theme.fonts.sans/serif/mono`, looks up the variable
 * name here, and injects e.g. `--font-sans: var(--font-inter)` into :root.
 * globals.css `@theme inline` already maps `--font-sans` → Tailwind's `font-sans`.
 */

export interface FontEntry {
  /** Key used in the theme JSON, e.g. "inter" */
  key: string;
  /** Human-readable name for the UI picker */
  label: string;
  /** CSS variable assigned in app/layout.tsx, e.g. "--font-inter" */
  variable: string;
  /** Which roles this font suits */
  roles: Array<"sans" | "serif" | "mono">;
  /** Google Fonts category — used for grouping in the picker */
  category: "sans-serif" | "serif" | "monospace" | "display";
  /** Preview sentence shown in the picker */
  sample?: string;
}

export const FONT_REGISTRY: FontEntry[] = [
  // ── Sans-serif ───────────────────────────────────────────────────────────
  {
    key: "inter",
    label: "Inter",
    variable: "--font-inter",
    roles: ["sans"],
    category: "sans-serif",
  },
  {
    key: "geist",
    label: "Geist",
    variable: "--font-geist-sans",
    roles: ["sans"],
    category: "sans-serif",
  },
  {
    key: "roboto",
    label: "Roboto",
    variable: "--font-roboto",
    roles: ["sans"],
    category: "sans-serif",
  },
  {
    key: "open-sans",
    label: "Open Sans",
    variable: "--font-open-sans",
    roles: ["sans"],
    category: "sans-serif",
  },
  {
    key: "lato",
    label: "Lato",
    variable: "--font-lato",
    roles: ["sans"],
    category: "sans-serif",
  },
  {
    key: "nunito",
    label: "Nunito",
    variable: "--font-nunito",
    roles: ["sans"],
    category: "sans-serif",
  },
  {
    key: "dm-sans",
    label: "DM Sans",
    variable: "--font-dm-sans",
    roles: ["sans"],
    category: "sans-serif",
  },
  // ── Serif ────────────────────────────────────────────────────────────────
  {
    key: "source-serif-4",
    label: "Source Serif 4",
    variable: "--font-source-serif-4",
    roles: ["sans", "serif"],
    category: "serif",
  },
  {
    key: "playfair-display",
    label: "Playfair Display",
    variable: "--font-playfair-display",
    roles: ["serif"],
    category: "serif",
  },
  {
    key: "merriweather",
    label: "Merriweather",
    variable: "--font-merriweather",
    roles: ["serif"],
    category: "serif",
  },
  {
    key: "lora",
    label: "Lora",
    variable: "--font-lora",
    roles: ["serif"],
    category: "serif",
  },
  // ── Display ──────────────────────────────────────────────────────────────
  {
    key: "sora",
    label: "Sora",
    variable: "--font-sora",
    roles: ["sans"],
    category: "display",
  },
  {
    key: "space-grotesk",
    label: "Space Grotesk",
    variable: "--font-space-grotesk",
    roles: ["sans"],
    category: "display",
  },
  // ── Monospace ────────────────────────────────────────────────────────────
  {
    key: "geist-mono",
    label: "Geist Mono",
    variable: "--font-geist-mono",
    roles: ["mono"],
    category: "monospace",
  },
  {
    key: "fira-code",
    label: "Fira Code",
    variable: "--font-fira-code",
    roles: ["mono"],
    category: "monospace",
  },
  {
    key: "jetbrains-mono",
    label: "JetBrains Mono",
    variable: "--font-jetbrains-mono",
    roles: ["mono"],
    category: "monospace",
  },
];

/** Look up by key — returns the CSS variable name or null if not in registry. */
export function getFontVariable(key: string | undefined): string | null {
  if (!key) return null;
  return FONT_REGISTRY.find((f) => f.key === key)?.variable ?? null;
}

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { SiteTheme } from "@/lib/theme";
import { DEFAULT_THEME } from "@/lib/theme";
import { FONT_REGISTRY, type FontEntry } from "@/lib/font-registry";

// ─── helpers ────────────────────────────────────────────────────────────────

function readTheme(raw: unknown): SiteTheme {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return structuredClone(DEFAULT_THEME);
  return raw as SiteTheme;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function contrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
}

// ─── sub-components ─────────────────────────────────────────────────────────

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const bg = value || "#ffffff";
  const text = contrastColor(bg);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative", width: 40, height: 40, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ width: "100%", height: "100%", background: bg }} />
          <input
            type="color"
            value={bg}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          style={{
            flex: 1,
            fontSize: 13,
            fontFamily: "monospace",
            padding: "6px 10px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            outline: "none",
            background: "#fafafa",
          }}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── preview panel ───────────────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: SiteTheme }) {
  const c = theme.colors ?? {};
  const bg = c.background || "#ffffff";
  const fg = c.foreground || "#1a1a1a";
  const primary = c.primary || "#2d6b6a";
  const primaryFg = c.primaryForeground || contrastColor(primary);
  const secondary = c.secondary || "#f4f4f5";
  const accent = c.accent || "#d4882a";
  const border = c.border || "#e4e4e7";
  const card = c.card || "#ffffff";
  const muted = c.muted || "#f4f4f5";
  const mutedFg = c.mutedForeground || "#6b7280";
  const radius = theme.radius || "0.5rem";

  return (
    <div style={{ background: bg, color: fg, padding: 16, borderRadius: 10, border: `1px solid ${border}`, fontSize: 13, fontFamily: theme.fonts?.sans || "inherit" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: card, borderRadius: radius, border: `1px solid ${border}`, marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Brand</span>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 12, color: mutedFg }}>Home</span>
          <span style={{ fontSize: 12, color: mutedFg }}>Products</span>
          <span style={{ fontSize: 12, color: mutedFg }}>Blog</span>
        </div>
        <button style={{ background: primary, color: primaryFg, border: "none", borderRadius: radius, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "default" }}>
          CTA
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: "12px 12px", background: secondary, borderRadius: radius, marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Hero headline</p>
        <p style={{ fontSize: 12, color: mutedFg, marginBottom: 10 }}>Subtext describing the value proposition goes here.</p>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ background: primary, color: primaryFg, border: "none", borderRadius: radius, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "default" }}>
            Primary
          </button>
          <button style={{ background: "transparent", color: fg, border: `1px solid ${border}`, borderRadius: radius, padding: "5px 14px", fontSize: 12, cursor: "default" }}>
            Secondary
          </button>
        </div>
      </div>

      {/* Cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {["Card one", "Card two", "Card three"].map((t) => (
          <div key={t} style={{ background: card, border: `1px solid ${border}`, borderRadius: radius, padding: 8 }}>
            <div style={{ height: 32, background: muted, borderRadius: radius, marginBottom: 6 }} />
            <p style={{ fontSize: 11, fontWeight: 600 }}>{t}</p>
            <p style={{ fontSize: 10, color: mutedFg }}>Description text</p>
          </div>
        ))}
      </div>

      {/* Accent strip */}
      <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ThemeEditorField() {
  const sdk = useSDK<FieldAppSDK>();
  const [theme, setTheme] = useState<SiteTheme>(() => readTheme(sdk.field.getValue()));
  const themeRef = useRef<SiteTheme>(theme);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWritten = useRef<string | null>(null);

  useEffect(() => { sdk.window.startAutoResizer(); }, [sdk.window]);

  // Sync external changes (e.g. another editor)
  useEffect(() => {
    return sdk.field.onValueChanged((raw) => {
      const serialized = JSON.stringify(raw ?? null);
      if (lastWritten.current === serialized) return;
      const next = readTheme(raw);
      themeRef.current = next;
      setTheme(next);
    });
  }, [sdk.field]);

  const save = useCallback((next: SiteTheme) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      lastWritten.current = JSON.stringify(next);
      sdk.field.setValue(next);
    }, 400);
  }, [sdk.field]);

  const updateColors = (key: keyof NonNullable<SiteTheme["colors"]>, value: string) => {
    const next: SiteTheme = { ...themeRef.current, colors: { ...(themeRef.current.colors ?? {}), [key]: value } };
    themeRef.current = next;
    setTheme(next);
    save(next);
  };

  const updateFonts = (key: keyof NonNullable<SiteTheme["fonts"]>, value: string) => {
    const next: SiteTheme = { ...themeRef.current, fonts: { ...(themeRef.current.fonts ?? {}), [key]: value } };
    themeRef.current = next;
    setTheme(next);
    save(next);
  };

  const updateTypography = (key: keyof NonNullable<SiteTheme["typography"]>, value: string) => {
    const next: SiteTheme = { ...themeRef.current, typography: { ...(themeRef.current.typography ?? {}), [key]: value } };
    themeRef.current = next;
    setTheme(next);
    save(next);
  };

  const updateRadius = (value: string) => {
    const next: SiteTheme = { ...themeRef.current, radius: value };
    themeRef.current = next;
    setTheme(next);
    save(next);
  };

  const resetToDefault = () => {
    const next = structuredClone(DEFAULT_THEME);
    themeRef.current = next;
    setTheme(next);
    save(next);
  };

  const colors = theme.colors ?? {};
  const fonts = theme.fonts ?? {};

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 900 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* ── left: controls ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🎨 Theme Editor</h2>
            <button
              onClick={resetToDefault}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
            >
              Reset to defaults
            </button>
          </div>

          <Section title="Colors">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ColorSwatch label="Primary" value={colors.primary ?? ""} onChange={(v) => updateColors("primary", v)} />
              <ColorSwatch label="Primary foreground" value={colors.primaryForeground ?? ""} onChange={(v) => updateColors("primaryForeground", v)} />
              <ColorSwatch label="Background" value={colors.background ?? ""} onChange={(v) => updateColors("background", v)} />
              <ColorSwatch label="Foreground" value={colors.foreground ?? ""} onChange={(v) => updateColors("foreground", v)} />
              <ColorSwatch label="Secondary" value={colors.secondary ?? ""} onChange={(v) => updateColors("secondary", v)} />
              <ColorSwatch label="Secondary foreground" value={colors.secondaryForeground ?? ""} onChange={(v) => updateColors("secondaryForeground", v)} />
              <ColorSwatch label="Accent" value={colors.accent ?? ""} onChange={(v) => updateColors("accent", v)} />
              <ColorSwatch label="Accent foreground" value={colors.accentForeground ?? ""} onChange={(v) => updateColors("accentForeground", v)} />
              <ColorSwatch label="Muted" value={colors.muted ?? ""} onChange={(v) => updateColors("muted", v)} />
              <ColorSwatch label="Muted foreground" value={colors.mutedForeground ?? ""} onChange={(v) => updateColors("mutedForeground", v)} />
              <ColorSwatch label="Border" value={colors.border ?? ""} onChange={(v) => updateColors("border", v)} />
              <ColorSwatch label="Card" value={colors.card ?? ""} onChange={(v) => updateColors("card", v)} />
            </div>
          </Section>

          <Section title="Border radius">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["0rem", "0.25rem", "0.5rem", "0.75rem", "1rem", "1.5rem"].map((r) => (
                  <button
                    key={r}
                    onClick={() => updateRadius(r)}
                    style={{
                      padding: "4px 10px", fontSize: 12, cursor: "pointer",
                      border: `1px solid ${theme.radius === r ? "#2d6b6a" : "#e5e7eb"}`,
                      background: theme.radius === r ? "#edf4f4" : "#fff",
                      color: theme.radius === r ? "#2d6b6a" : "#374151",
                      borderRadius: 6, fontWeight: theme.radius === r ? 600 : 400,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={theme.radius ?? ""}
                onChange={(e) => updateRadius(e.target.value)}
                placeholder="e.g. 0.5rem"
                style={{ fontSize: 13, fontFamily: "monospace", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fafafa", width: 140 }}
              />
            </div>
          </Section>

          <Section title="Fonts">
            <div style={{ display: "grid", gap: 12 }}>
              {(["sans", "serif", "mono"] as const).map((role) => {
                const options = FONT_REGISTRY.filter((f) => f.roles.includes(role));
                return (
                  <div key={role} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {role === "sans" ? "Body / UI font" : role === "serif" ? "Serif font" : "Monospace font"}
                    </label>
                    <select
                      value={fonts[role] ?? ""}
                      onChange={(e) => updateFonts(role, e.target.value)}
                      style={{ fontSize: 13, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fafafa", cursor: "pointer" }}
                    >
                      <option value="">— use default —</option>
                      {options.map((f: FontEntry) => (
                        <option key={f.key} value={f.key}>{f.label} ({f.category})</option>
                      ))}
                    </select>
                    {fonts[role] && (
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                        Injects <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 3 }}>
                          --font-{role}: var({FONT_REGISTRY.find(f => f.key === fonts[role])?.variable ?? "?"})
                        </code>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Typography scale">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                { key: "headingWeight", label: "Heading weight", placeholder: "700", options: ["400", "500", "600", "700", "800", "900"] },
                { key: "bodySize", label: "Body size", placeholder: "1rem" },
                { key: "lineHeight", label: "Line height", placeholder: "1.6" },
                { key: "letterSpacing", label: "Body letter spacing", placeholder: "0em" },
                { key: "headingLetterSpacing", label: "Heading letter spacing", placeholder: "-0.02em" },
              ] as Array<{ key: keyof NonNullable<SiteTheme["typography"]>; label: string; placeholder: string; options?: string[] }>).map(({ key, label, placeholder, options }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                  {options ? (
                    <select
                      value={theme.typography?.[key] ?? ""}
                      onChange={(e) => updateTypography(key, e.target.value)}
                      style={{ fontSize: 13, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fafafa" }}
                    >
                      <option value="">— default —</option>
                      {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={theme.typography?.[key] ?? ""}
                      onChange={(e) => updateTypography(key, e.target.value)}
                      placeholder={placeholder}
                      style={{ fontSize: 13, fontFamily: "monospace", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fafafa" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── right: preview ── */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Live Preview</h3>
          <ThemePreview theme={theme} />

          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Stored JSON</h3>
            <pre style={{
              fontSize: 11, fontFamily: "monospace", background: "#1e1e2e",
              color: "#cdd6f4", padding: 12, borderRadius: 8,
              overflow: "auto", maxHeight: 220, whiteSpace: "pre-wrap",
            }}>
              {JSON.stringify(theme, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

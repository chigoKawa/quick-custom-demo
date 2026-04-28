"use client";

import React, { useState } from "react";
import {
  useContentfulLiveUpdates,
  useContentfulInspectorMode,
} from "@contentful/live-preview/react";
import type { ISocialVariant, SocialPlatform } from "../../type";

interface Props {
  entry: ISocialVariant;
  locale: string;
  isPreview: boolean;
}

// ─── Platform metadata ────────────────────────────────────────────────────────

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; icon: string; charLimit: number; bg: string; accent: string; textColor: string }
> = {
  instagram_feed: {
    label: "Instagram Feed",
    icon: "📷",
    charLimit: 2200,
    bg: "#fdf2f8",
    accent: "#e1306c",
    textColor: "#1a1a1a",
  },
  instagram_story: {
    label: "Instagram Story",
    icon: "⭕",
    charLimit: 300,
    bg: "#fdf2f8",
    accent: "#833ab4",
    textColor: "#1a1a1a",
  },
  tiktok: {
    label: "TikTok",
    icon: "🎵",
    charLimit: 2200,
    bg: "#f0fdf4",
    accent: "#010101",
    textColor: "#1a1a1a",
  },
  x: {
    label: "X (Twitter)",
    icon: "𝕏",
    charLimit: 280,
    bg: "#f0f9ff",
    accent: "#000000",
    textColor: "#1a1a1a",
  },
  facebook: {
    label: "Facebook",
    icon: "👍",
    charLimit: 63206,
    bg: "#eff6ff",
    accent: "#1877f2",
    textColor: "#1a1a1a",
  },
  linkedin: {
    label: "LinkedIn",
    icon: "💼",
    charLimit: 3000,
    bg: "#f0f9ff",
    accent: "#0a66c2",
    textColor: "#1a1a1a",
  },
  pinterest: {
    label: "Pinterest",
    icon: "📌",
    charLimit: 500,
    bg: "#fff1f2",
    accent: "#e60023",
    textColor: "#1a1a1a",
  },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "#92400e", bg: "#fef3c7" },
  generated: { label: "Generated", color: "#1e40af", bg: "#dbeafe" },
  approved:  { label: "Approved",  color: "#166534", bg: "#dcfce7" },
  posted:    { label: "Posted",    color: "#6b21a8", bg: "#f3e8ff" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScheduledAt(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

function getSourceTitle(source: any): string {
  if (!source?.fields) return "(source not resolved)";
  return (
    source.fields.name ??
    source.fields.title ??
    source.fields.internalTitle ??
    source.fields.internalName ??
    source.sys?.id ??
    "Unknown source"
  );
}

function getSourceContentType(source: any): string {
  return source?.sys?.contentType?.sys?.id ?? "entry";
}

// ─── Phone mockup ─────────────────────────────────────────────────────────────

function PhoneMockup({
  children,
  platform,
}: {
  children: React.ReactNode;
  platform: SocialPlatform;
}) {
  const isStory = platform === "instagram_story" || platform === "tiktok";
  const width = isStory ? 280 : 360;
  const height = isStory ? 500 : 620;

  return (
    <div
      style={{
        width,
        margin: "0 auto",
        borderRadius: 36,
        border: "8px solid #1a1a1a",
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        background: "#fff",
        position: "relative",
        minHeight: height,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Notch */}
      <div
        style={{
          height: 28,
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ width: 80, height: 12, background: "#333", borderRadius: 8 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

// ─── Post renderers ───────────────────────────────────────────────────────────

function InstagramFeedPost({ entry, inspectorProps }: { entry: ISocialVariant; inspectorProps: any }) {
  const meta = PLATFORM_META.instagram_feed;
  const caption = entry.fields.caption ?? "";
  const hashtags = (entry.fields.hashtags as string[] | undefined) ?? [];

  return (
    <div style={{ background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>your_brand</div>
          <div style={{ fontSize: 11, color: "#8e8e8e" }}>Sponsored</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 18, color: "#8e8e8e" }}>···</div>
      </div>
      {/* Image placeholder */}
      <div style={{ width: "100%", aspectRatio: "1", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 40 }}>📷</span>
      </div>
      {/* Actions */}
      <div style={{ padding: "8px 12px", display: "flex", gap: 14, fontSize: 22 }}>
        <span>🤍</span><span>💬</span><span>📤</span>
        <span style={{ marginLeft: "auto" }}>🔖</span>
      </div>
      {/* Caption */}
      <div
        {...inspectorProps({ fieldId: "caption" })}
        style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.5 }}
      >
        <span style={{ fontWeight: 700 }}>your_brand </span>
        {caption}
        {hashtags.length > 0 && (
          <div style={{ marginTop: 6, color: meta.accent, fontSize: 12 }}>
            {hashtags.map((h) => `#${h}`).join(" ")}
          </div>
        )}
      </div>
    </div>
  );
}

function InstagramStoryPost({ entry, inspectorProps }: { entry: ISocialVariant; inspectorProps: any }) {
  const meta = PLATFORM_META.instagram_story;
  const caption = entry.fields.caption ?? "";
  const hashtags = (entry.fields.hashtags as string[] | undefined) ?? [];

  return (
    <div
      style={{
        minHeight: 444,
        background: "linear-gradient(160deg, #833ab4, #fd1d1d, #fcb045)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 16,
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: "relative",
      }}
    >
      {/* Progress bars */}
      <div style={{ position: "absolute", top: 12, left: 8, right: 8, display: "flex", gap: 4 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 2, background: i === 1 ? "#fff" : "rgba(255,255,255,0.4)", borderRadius: 2 }} />
        ))}
      </div>
      {/* Caption overlay */}
      <div
        {...inspectorProps({ fieldId: "caption" })}
        style={{
          background: "rgba(0,0,0,0.45)",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {caption}
        {hashtags.length > 0 && (
          <div style={{ marginTop: 6, color: "#fce7f3", fontSize: 12 }}>
            {hashtags.map((h) => `#${h}`).join(" ")}
          </div>
        )}
      </div>
    </div>
  );
}

function XPost({ entry, inspectorProps }: { entry: ISocialVariant; inspectorProps: any }) {
  const caption = entry.fields.caption ?? "";
  const hashtags = (entry.fields.hashtags as string[] | undefined) ?? [];
  const charCount = caption.length + (hashtags.length ? hashtags.map((h) => ` #${h}`).join("").length : 0);
  const over = charCount > 280;

  return (
    <div style={{ background: "#fff", fontFamily: "'Chirp', -apple-system, sans-serif", padding: "16px 14px" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1d9bf0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>Y</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Your Brand</span>
            <span style={{ color: "#536471", fontSize: 14 }}>@yourbrand · now</span>
          </div>
          <div
            {...inspectorProps({ fieldId: "caption" })}
            style={{ fontSize: 15, lineHeight: 1.5, marginTop: 4, wordBreak: "break-word" }}
          >
            {caption}
            {hashtags.length > 0 && (
              <span style={{ color: "#1d9bf0" }}>{" "}{hashtags.map((h) => `#${h}`).join(" ")}</span>
            )}
          </div>
          {over && (
            <div style={{ marginTop: 6, fontSize: 12, color: "#f4212e" }}>
              ⚠ {charCount}/280 characters — over limit
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 24, color: "#536471", fontSize: 14 }}>
            <span>💬 0</span><span>🔁 0</span><span>❤️ 0</span><span>📊 0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericPost({ entry, inspectorProps, platform }: { entry: ISocialVariant; inspectorProps: any; platform: SocialPlatform }) {
  const meta = PLATFORM_META[platform];
  const caption = entry.fields.caption ?? "";
  const hashtags = (entry.fields.hashtags as string[] | undefined) ?? [];

  return (
    <div style={{ background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: meta.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>
          {meta.icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Your Brand</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Just now</div>
        </div>
      </div>
      <div
        {...inspectorProps({ fieldId: "caption" })}
        style={{ fontSize: 14, lineHeight: 1.6, color: meta.textColor, marginBottom: 10 }}
      >
        {caption}
      </div>
      {hashtags.length > 0 && (
        <div style={{ fontSize: 13, color: meta.accent, lineHeight: 1.8 }}>
          {hashtags.map((h) => `#${h}`).join(" ")}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocialVariantPreviewClient({ entry: serverEntry, locale, isPreview }: Props) {
  const entry = useContentfulLiveUpdates(serverEntry) || serverEntry;
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const platform = (entry.fields.platform ?? "instagram_feed") as SocialPlatform;
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.instagram_feed;
  const status = entry.fields.status ?? "draft";
  const statusMeta = STATUS_META[status] ?? STATUS_META.draft;
  const hashtags = (entry.fields.hashtags as string[] | undefined) ?? [];
  const caption = entry.fields.caption ?? "";
  const charCount = caption.length;
  const scheduledAt = formatScheduledAt(entry.fields.scheduledAt);
  const sourceTitle = getSourceTitle(entry.fields.source);
  const sourceContentType = getSourceContentType(entry.fields.source);

  const bg = theme === "dark" ? "#0f172a" : "#f1f5f9";
  const cardBg = theme === "dark" ? "#1e293b" : "#ffffff";
  const border = theme === "dark" ? "#334155" : "#e2e8f0";
  const text = theme === "dark" ? "#f1f5f9" : "#0f172a";
  const muted = theme === "dark" ? "#94a3b8" : "#64748b";

  function renderPost() {
    const args = { entry, inspectorProps, platform };
    switch (platform) {
      case "instagram_feed":  return <InstagramFeedPost entry={entry} inspectorProps={inspectorProps} />;
      case "instagram_story": return <InstagramStoryPost entry={entry} inspectorProps={inspectorProps} />;
      case "x":               return <XPost entry={entry} inspectorProps={inspectorProps} />;
      default:                return <GenericPost {...args} />;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Toolbar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: cardBg, borderBottom: `1px solid ${border}`,
        padding: "10px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>{meta.icon}</span>
          <div>
            <div
              {...inspectorProps({ fieldId: "internalName" })}
              style={{ fontWeight: 700, fontSize: 16, color: text }}
            >
              {entry.fields.internalName}
            </div>
            <div style={{ fontSize: 12, color: muted, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              <span style={{ background: meta.accent, color: "#fff", padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                {meta.label}
              </span>
              <span style={{ background: statusMeta.bg, color: statusMeta.color, padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                {statusMeta.label}
              </span>
              <span style={{ fontSize: 11 }}>
                from <strong>{sourceContentType}</strong>: {sourceTitle}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["light", "dark"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTheme(t)} style={{
              background: theme === t ? (t === "dark" ? "#334155" : "#e2e8f0") : cardBg,
              color: theme === t ? text : muted,
              border: `1px solid ${border}`, borderRadius: 6,
              padding: "6px 14px", fontSize: 13, cursor: "pointer",
              fontWeight: theme === t ? 600 : 400,
            }}>
              {t === "light" ? "☀️ Light" : "🌙 Dark"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Layout: phone + metadata panel ── */}
      <div style={{
        maxWidth: 960, margin: "0 auto", padding: "32px 20px",
        display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start",
      }}>

        {/* Phone preview */}
        <div>
          <div style={{ textAlign: "center", marginBottom: 16, fontSize: 13, color: muted, fontWeight: 500 }}>
            {meta.label} Preview
          </div>
          <PhoneMockup platform={platform}>
            {renderPost()}
          </PhoneMockup>
        </div>

        {/* Metadata panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Caption stats */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: text, marginBottom: 12 }}>Caption</div>
            <div
              {...inspectorProps({ fieldId: "caption" })}
              style={{
                fontSize: 13, lineHeight: 1.6, color: text,
                background: theme === "dark" ? "#0f172a" : "#f8fafc",
                border: `1px solid ${border}`, borderRadius: 8,
                padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: 200, overflowY: "auto",
              }}
            >
              {caption || <span style={{ color: muted, fontStyle: "italic" }}>No caption yet</span>}
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: charCount > meta.charLimit ? "#ef4444" : muted }}>
              <span>{charCount} chars</span>
              <span>limit: {meta.charLimit.toLocaleString()}</span>
            </div>
            {charCount > meta.charLimit && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#ef4444" }}>
                ⚠ Exceeds platform character limit by {(charCount - meta.charLimit).toLocaleString()}
              </div>
            )}
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: text, marginBottom: 10 }}>
                Hashtags
                <span style={{ marginLeft: 6, fontSize: 11, color: muted, fontWeight: 400 }}>({hashtags.length})</span>
              </div>
              <div
                {...inspectorProps({ fieldId: "hashtags" })}
                style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
              >
                {hashtags.map((tag) => (
                  <span key={tag} style={{
                    background: theme === "dark" ? "#1e3a5f" : "#eff6ff",
                    color: theme === "dark" ? "#93c5fd" : "#1d4ed8",
                    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: text, marginBottom: 12 }}>Details</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {[
                  ["Platform", <span key="p" style={{ background: meta.accent, color: "#fff", padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>],
                  ["Status", <span key="s" style={{ background: statusMeta.bg, color: statusMeta.color, padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{statusMeta.label}</span>],
                  ["Language", entry.fields.language || locale],
                  ["Source", <span key="src" style={{ color: muted, fontStyle: "italic" }}>{sourceContentType}: {sourceTitle}</span>],
                  ...(scheduledAt ? [["Scheduled", scheduledAt]] : []),
                  ...(entry.fields.externalPostId ? [["Post ID", <code key="pid" style={{ fontSize: 11, background: theme === "dark" ? "#0f172a" : "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{entry.fields.externalPostId}</code>]] : []),
                ].map(([label, value], i) => (
                  <tr key={i}>
                    <td style={{ padding: "5px 0", color: muted, width: "40%", verticalAlign: "top" }}>{label}</td>
                    <td style={{ padding: "5px 0", color: text, fontWeight: 500 }}>{value as React.ReactNode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview mode notice */}
          {isPreview && (
            <div style={{
              background: theme === "dark" ? "#1c1917" : "#fffbeb",
              border: `1px solid ${theme === "dark" ? "#713f12" : "#fde68a"}`,
              borderRadius: 10, padding: "10px 14px",
              fontSize: 12, color: theme === "dark" ? "#fbbf24" : "#92400e",
            }}>
              Live preview active — changes in Contentful reflect here instantly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

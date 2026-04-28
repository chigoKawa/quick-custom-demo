"use client";

import React from "react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import type { Document } from "@contentful/rich-text-types";
import type { INotificationTemplate, IEmailLayout, IExternalUrl, IBaseButton, ILogo } from "@/features/contentful/type";
import { interpolateString, hasUnresolvedPlaceholders } from "./interpolate";

interface EmailChannelProps {
  entry: INotificationTemplate;
  interpolatedBody: Document | null;
  sampleData: Record<string, string>;
  viewport: "desktop" | "mobile";
  theme: "light" | "dark";
}

function PlaceholderPill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "#fef3c7",
        color: "#92400e",
        borderRadius: 4,
        padding: "1px 6px",
        fontSize: 12,
        fontWeight: 500,
        border: "1px solid #fcd34d",
      }}
    >
      {text}
    </span>
  );
}

function renderPlaceholderAware(text: string): React.ReactNode {
  if (!hasUnresolvedPlaceholders(text)) return text;

  const parts: React.ReactNode[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    parts.push(<PlaceholderPill key={m.index} text={m[0]} />);
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}

function renderEmailRichText(doc: Document | null): React.ReactNode {
  if (!doc) return null;
  return documentToReactComponents(doc, {
    renderNode: {
      paragraph: (_node, children) => (
        <p style={{ margin: "0 0 12px 0", lineHeight: 1.6, fontSize: 15 }}>{children}</p>
      ),
      "heading-1": (_node, children) => (
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "16px 0 8px", lineHeight: 1.3 }}>{children}</h1>
      ),
      "heading-2": (_node, children) => (
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "14px 0 6px", lineHeight: 1.3 }}>{children}</h2>
      ),
      "heading-3": (_node, children) => (
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "12px 0 4px", lineHeight: 1.3 }}>{children}</h3>
      ),
      "unordered-list": (_node, children) => (
        <ul style={{ paddingLeft: 24, margin: "0 0 12px 0", listStyleType: "disc" }}>{children}</ul>
      ),
      "ordered-list": (_node, children) => (
        <ol style={{ paddingLeft: 24, margin: "0 0 12px 0", listStyleType: "decimal" }}>{children}</ol>
      ),
      "list-item": (_node, children) => (
        <li style={{ marginBottom: 4 }}>{children}</li>
      ),
      hyperlink: (node, children) => (
        <a href={node.data.uri} style={{ color: "#2563eb", textDecoration: "underline" }} target="_blank" rel="noopener noreferrer">{children}</a>
      ),
      hr: () => <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />,
    },
    renderText: (text) => renderPlaceholderAware(text),
  });
}

const SOCIAL_ICONS: Record<string, string> = {
  Twitter: "𝕏",
  Instagram: "📷",
  Facebook: "f",
  TikTok: "♪",
  LinkedIn: "in",
  Github: "⌨",
};

function EmailHeader({
  layout,
  theme,
}: {
  layout: IEmailLayout;
  theme: "light" | "dark";
}) {
  const isDark = theme === "dark";
  const brandColor = layout.fields.brandColor || "#2563eb";
  const logo = layout.fields.logo as ILogo | undefined;
  const fileField = logo?.fields?.image?.fields?.file;
  const logoUrl = typeof fileField === "object" && fileField !== null && "url" in fileField
    ? String((fileField as { url: string }).url)
    : undefined;
  const companyName = layout.fields.companyName;

  return (
    <div
      style={{
        background: brandColor,
        padding: "20px 32px",
        textAlign: "center",
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl.startsWith("//") ? `https:${logoUrl}` : logoUrl}
          alt={logo?.fields?.name || companyName || "Logo"}
          style={{ maxHeight: 48, maxWidth: 200, objectFit: "contain" }}
        />
      )}
      {!logoUrl && companyName && (
        <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? "#f8fafc" : "#ffffff" }}>
          {companyName}
        </div>
      )}
    </div>
  );
}

function EmailFooter({
  layout,
  theme,
}: {
  layout: IEmailLayout;
  theme: "light" | "dark";
}) {
  const isDark = theme === "dark";
  const brandColor = layout.fields.brandColor || "#2563eb";
  const socialLinks = (layout.fields.socialLinks || []) as IExternalUrl[];
  const footerLinks = (layout.fields.footerLinks || []) as IBaseButton[];
  const footerText = layout.fields.footerText;
  const bgColor = isDark ? "#111827" : "#f3f4f6";
  const textColor = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div
      style={{
        background: bgColor,
        padding: "24px 32px",
        textAlign: "center",
        borderTop: `3px solid ${brandColor}`,
      }}
    >
      {socialLinks.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", gap: 12 }}>
          {socialLinks.map((link, i) => {
            const icon = link.fields.optionalIcon;
            return (
              <a
                key={i}
                href={link.fields.url}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: brandColor,
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                }}
                title={link.fields.title}
              >
                {icon ? (SOCIAL_ICONS[icon] || icon.charAt(0)) : link.fields.title?.charAt(0) || "•"}
              </a>
            );
          })}
        </div>
      )}

      {footerLinks.length > 0 && (
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" as const }}>
          {footerLinks.map((btn, i) => {
            const target = btn.fields.target as IExternalUrl | undefined;
            const url = (target as IExternalUrl)?.fields?.url || "#";
            return (
              <a
                key={i}
                href={url}
                style={{ color: brandColor, fontSize: 13, textDecoration: "underline" }}
              >
                {btn.fields.label}
              </a>
            );
          })}
        </div>
      )}

      {footerText && (
        <div style={{ fontSize: 12, color: textColor, lineHeight: 1.5 }}>
          {documentToReactComponents(footerText as unknown as Document)}
        </div>
      )}
    </div>
  );
}

export default function EmailChannel({
  entry,
  interpolatedBody,
  sampleData,
  viewport,
  theme,
}: EmailChannelProps) {
  const isDark = theme === "dark";
  const layout = entry.fields.emailLayout as IEmailLayout | undefined;
  const subject = interpolateString(entry.fields.subject || "", sampleData);
  const preheader = entry.fields.preheader
    ? interpolateString(entry.fields.preheader, sampleData)
    : undefined;

  const width = viewport === "mobile" ? 375 : 600;
  const outerBg = isDark ? "#1f2937" : "#ffffff";
  const bodyBg = isDark ? "#111827" : "#ffffff";
  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const subtleBg = isDark ? "#0f172a" : "#f9fafb";
  const borderColor = isDark ? "#374151" : "#e5e7eb";

  return (
    <div style={{ background: subtleBg, padding: 24, borderRadius: 8, minHeight: 400 }}>
      <div
        style={{
          maxWidth: width,
          margin: "0 auto",
          background: outerBg,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${borderColor}`,
          boxShadow: "0 1px 3px rgba(0,0,0,.08)",
          color: textColor,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Email client chrome */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${borderColor}`,
            background: isDark ? "#1e293b" : "#f8fafc",
          }}
        >
          <div style={{ fontSize: 11, color: isDark ? "#6b7280" : "#9ca3af", marginBottom: 4 }}>
            Inbox &bull; Preview
          </div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {renderPlaceholderAware(subject) || "(No subject)"}
          </div>
          {preheader && (
            <div style={{ fontSize: 12, color: isDark ? "#6b7280" : "#9ca3af", marginTop: 2 }}>
              {renderPlaceholderAware(preheader)}
            </div>
          )}
        </div>

        {/* Layout header */}
        {layout && <EmailHeader layout={layout} theme={theme} />}

        {/* Body */}
        <div style={{ padding: "24px 32px", background: bodyBg }}>
          {renderEmailRichText(interpolatedBody) ?? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>(No body content)</p>
          )}
        </div>

        {/* Layout footer */}
        {layout && <EmailFooter layout={layout} theme={theme} />}
      </div>
    </div>
  );
}

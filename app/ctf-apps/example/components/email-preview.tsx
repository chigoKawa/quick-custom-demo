"use client";

import React from "react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import type { Document } from "@contentful/rich-text-types";

interface EmailPreviewProps {
  subject: string;
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
  preheader?: string;
  content: unknown; // Rich Text document from Contentful
  assetsById?: Record<string, any>;
  theme?: "light" | "dark";
  viewport?: "desktop" | "mobile";
  clientPreset?: "gmail" | "appleMail" | "outlook";
}

function renderRichText(
  value: unknown,
  assetsById?: Record<string, any>
): React.ReactNode {
  if (!value || typeof value !== "object") return null;
  const doc = value as Document;

  return documentToReactComponents(doc, {
    renderNode: {
      paragraph: (node, children) => (
        <p style={{ margin: "0 0 8px 0", lineHeight: 1.5 }}>{children}</p>
      ),
      "heading-1": (node, children) => (
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: "8px 0" }}>
          {children}
        </h1>
      ),
      "heading-2": (node, children) => (
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "8px 0" }}>
          {children}
        </h2>
      ),
      "unordered-list": (node, children) => (
        <ul
          style={{
            paddingLeft: 20,
            margin: "0 0 8px 0",
            listStyleType: "disc",
          }}
        >
          {children}
        </ul>
      ),
      "ordered-list": (node, children) => (
        <ol
          style={{
            paddingLeft: 20,
            margin: "0 0 8px 0",
            listStyleType: "decimal",
          }}
        >
          {children}
        </ol>
      ),
      "list-item": (node, children) => (
        <li style={{ marginBottom: 2 }}>{children}</li>
      ),
      "embedded-entry-block": (node) => (
        <div
          style={{
            margin: "8px 0",
            padding: "6px 8px",
            borderRadius: 4,
            border: "1px dashed #cbd5e0",
            background: "#f7fafc",
            fontSize: 11,
            color: "#4a5568",
          }}
        >
          Embedded entry block (ID: {node.data?.target?.sys?.id || "unknown"})
        </div>
      ),
      "embedded-asset-block": (node) => {
        const target: any = node.data?.target;
        const linkId: string | undefined = target?.sys?.id;

        // Prefer a fully fetched asset from the caller (e.g. sidebar using CMA),
        // and fall back to any inlined fields on the Rich Text node.
        const resolvedAsset: any =
          (linkId && assetsById && assetsById[linkId]) || target;

        const fields = resolvedAsset?.fields || {};
        const fileField = fields.file;
        let url: string | null = null;
        let alt: string | undefined;
        if (fileField && typeof fileField === "object") {
          // Try to pick the first locale's file object.
          const filePerLocale = fileField as Record<string, { url?: string }>;
          for (const value of Object.values(filePerLocale)) {
            if (value && typeof value.url === "string") {
              url = value.url.startsWith("//")
                ? `https:${value.url}`
                : value.url;
              break;
            }
          }
        }
        const titleField = fields.title;
        if (titleField && typeof titleField === "object") {
          const titlePerLocale = titleField as Record<string, string>;
          alt = Object.values(titlePerLocale).find(
            (v) => typeof v === "string"
          );
        }
        if (url) {
          return (
            <div style={{ margin: "8px 0" }}>
              <img
                src={url}
                alt={alt || "Embedded asset"}
                style={{
                  maxWidth: "100%",
                  borderRadius: 4,
                  border: "1px solid #e2e8f0",
                }}
              />
            </div>
          );
        }
        return (
          <div
            style={{
              margin: "8px 0",
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px dashed #cbd5e0",
              background: "#f7fafc",
              fontSize: 11,
              color: "#4a5568",
            }}
          >
            Embedded asset block (ID: {target?.sys?.id || "unknown"})
          </div>
        );
      },
    },
  });
}

export default function EmailPreview(props: EmailPreviewProps) {
  const {
    subject,
    senderName,
    senderEmail,
    replyToEmail,
    preheader,
    content,
    assetsById,
    theme = "light",
    viewport = "desktop",
    clientPreset = "gmail",
  } = props;

  const isDark = theme === "dark";

  const outerBg = isDark ? "#0f172a" : "#ffffff";
  const outerBorder = isDark ? "#1e293b" : "#d3dce0";
  const textColor = isDark ? "#e2e8f0" : "#1b2733";
  const subtleText = isDark ? "#9ca3af" : "#6c7a89";
  const headerBg = isDark ? "#020617" : "#f7f9fa";

  const width = viewport === "mobile" ? 414 : 720;

  let fontStack: string =
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  if (clientPreset === "gmail") {
    fontStack =
      'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  } else if (clientPreset === "appleMail") {
    fontStack =
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';
  } else if (clientPreset === "outlook") {
    fontStack = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
  }

  return (
    <div
      style={{
        border: `1px solid ${outerBorder}`,
        borderRadius: 6,
        background: outerBg,
        fontFamily: fontStack,
        fontSize: 13,
        color: textColor,
        overflow: "hidden",
        maxWidth: width,
        width: "100%",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${outerBorder}`,
          background: headerBg,
        }}
      >
        <div style={{ fontSize: 11, color: subtleText }}>Inbox • Preview</div>
        <div style={{ marginTop: 4, display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "999px",
              background: "#3273dc",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              marginRight: 8,
            }}
          >
            {senderName ? senderName.charAt(0).toUpperCase() : "N"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{senderName}</div>
            <div style={{ fontSize: 11, color: subtleText }}>{senderEmail}</div>
          </div>
          <div style={{ fontSize: 11, color: subtleText }}>
            Just now • Preview
          </div>
        </div>
      </div>

      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {subject || "(No subject)"}
        </div>
        {preheader && (
          <div style={{ fontSize: 11, color: subtleText, marginBottom: 8 }}>
            {preheader}
          </div>
        )}
        {replyToEmail && (
          <div style={{ fontSize: 11, color: subtleText, marginBottom: 8 }}>
            Reply-to: {replyToEmail}
          </div>
        )}
        <div
          style={{
            marginTop: 4,
            paddingTop: 8,
            borderTop: "1px solid #edf2f7",
          }}
        >
          {renderRichText(content, assetsById) ?? (
            <span style={{ fontSize: 12, color: "#a0aec0" }}>(No content)</span>
          )}
        </div>
      </div>
    </div>
  );
}

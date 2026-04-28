"use client";

import React from "react";
import type { Document, Block, Inline, Text as RtText } from "@contentful/rich-text-types";
import type { INotificationTemplate } from "@/features/contentful/type";
import { interpolateString, hasUnresolvedPlaceholders } from "./interpolate";

interface InAppChannelProps {
  entry: INotificationTemplate;
  interpolatedBody: Document | null;
  sampleData: Record<string, string>;
  theme: "light" | "dark";
}

function richTextToExcerpt(doc: Document | null, maxLength = 200): string {
  if (!doc) return "";
  const text = extractText(doc.content).trim();
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

function extractText(nodes: readonly (Block | Inline | RtText)[]): string {
  let result = "";
  for (const node of nodes) {
    if (node.nodeType === "text") {
      result += (node as RtText).value;
    } else {
      const block = node as Block | Inline;
      if (block.content) result += extractText(block.content);
      if (block.nodeType === "paragraph") result += " ";
    }
  }
  return result;
}

function PlaceholderPill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "#fef3c7",
        color: "#92400e",
        borderRadius: 4,
        padding: "0 4px",
        fontSize: 12,
        border: "1px solid #fcd34d",
      }}
    >
      {text}
    </span>
  );
}

function renderWithHighlights(text: string): React.ReactNode {
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

export default function InAppChannel({ entry, interpolatedBody, sampleData, theme }: InAppChannelProps) {
  const isDark = theme === "dark";
  const title = interpolateString(entry.fields.subject || "", sampleData);
  const excerpt = richTextToExcerpt(interpolatedBody);

  const cardBg = isDark ? "#1f2937" : "#ffffff";
  const cardBorder = isDark ? "#374151" : "#e5e7eb";
  const textPrimary = isDark ? "#f3f4f6" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const accentBg = isDark ? "#1e3a5f" : "#eff6ff";
  const dotColor = "#3b82f6";

  return (
    <div style={{ padding: 24, maxWidth: 440, margin: "0 auto" }}>
      {/* Notification center header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: textPrimary }}>
            Notifications
          </span>
          <span
            style={{
              background: dotColor,
              color: "#ffffff",
              borderRadius: 10,
              padding: "1px 7px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            1
          </span>
        </div>
        <span style={{ fontSize: 12, color: dotColor, cursor: "pointer" }}>
          Mark all read
        </span>
      </div>

      {/* Unread notification card */}
      <div
        style={{
          background: accentBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 8,
          position: "relative",
          borderLeft: `3px solid ${dotColor}`,
        }}
      >
        {/* Unread dot */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 14,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
          }}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Icon */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: dotColor,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            🔔
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary, marginBottom: 4 }}>
              {renderWithHighlights(title) || "(No title)"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: textSecondary,
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {excerpt ? renderWithHighlights(excerpt) : (
                <span style={{ fontStyle: "italic" }}>(No content)</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 6 }}>
              Just now
            </div>
          </div>
        </div>
      </div>

      {/* Read notification (placeholder context) */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 8,
          opacity: 0.5,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: isDark ? "#374151" : "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            📦
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary, marginBottom: 4 }}>
              Order shipped
            </div>
            <div style={{ fontSize: 13, color: textSecondary }}>
              Your order #EP-00123 has been shipped and is on its way.
            </div>
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 6 }}>
              2 hours ago
            </div>
          </div>
        </div>
      </div>

      {/* Another read placeholder */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 12,
          padding: "14px 16px",
          opacity: 0.35,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: isDark ? "#374151" : "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            🎉
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary, marginBottom: 4 }}>
              Welcome to MER+
            </div>
            <div style={{ fontSize: 13, color: textSecondary }}>
              Your membership has been activated. Enjoy exclusive deals!
            </div>
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 6 }}>
              Yesterday
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

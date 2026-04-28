"use client";

import React from "react";
import type { Document, Block, Inline, Text as RtText } from "@contentful/rich-text-types";
import type { INotificationTemplate } from "@/features/contentful/type";
import { interpolateString, hasUnresolvedPlaceholders } from "./interpolate";

interface SmsChannelProps {
  entry: INotificationTemplate;
  interpolatedBody: Document | null;
  sampleData: Record<string, string>;
  theme: "light" | "dark";
}

function richTextToPlainText(doc: Document | null): string {
  if (!doc) return "";
  return extractText(doc.content).trim();
}

function extractText(nodes: readonly (Block | Inline | RtText)[]): string {
  let result = "";
  for (const node of nodes) {
    if (node.nodeType === "text") {
      result += (node as RtText).value;
    } else {
      const block = node as Block | Inline;
      if (block.content) {
        result += extractText(block.content);
      }
      if (block.nodeType === "paragraph" || block.nodeType?.startsWith("heading")) {
        result += "\n";
      }
    }
  }
  return result;
}

function computeSegments(text: string): { chars: number; segments: number; limit: number } {
  const hasUnicode = /[^\u0000-\u007F]/.test(text);
  const chars = text.length;
  const singleLimit = hasUnicode ? 70 : 160;
  const multiLimit = hasUnicode ? 67 : 153;
  const segments = chars <= singleLimit ? 1 : Math.ceil(chars / multiLimit);
  return { chars, segments, limit: segments === 1 ? singleLimit : multiLimit };
}

function PlaceholderHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#fef3c7",
        color: "#92400e",
        borderRadius: 4,
        padding: "0 3px",
        fontSize: "inherit",
      }}
    >
      {children}
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
    parts.push(<PlaceholderHighlight key={m.index}>{m[0]}</PlaceholderHighlight>);
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}

export default function SmsChannel({ entry, interpolatedBody, sampleData, theme }: SmsChannelProps) {
  const isDark = theme === "dark";
  const plainText = richTextToPlainText(interpolatedBody);
  const sender = interpolateString(entry.fields.subject || "Europris", sampleData);
  const { chars, segments, limit } = computeSegments(plainText);

  const phoneBg = isDark ? "#1f2937" : "#f8fafc";
  const screenBg = isDark ? "#111827" : "#ffffff";
  const bubbleBg = isDark ? "#1e3a5f" : "#e5efff";
  const bubbleText = isDark ? "#e0e7ff" : "#1e3a5f";
  const metaColor = isDark ? "#6b7280" : "#9ca3af";
  const borderColor = isDark ? "#374151" : "#d1d5db";

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      {/* Phone frame */}
      <div
        style={{
          width: 320,
          borderRadius: 32,
          border: `3px solid ${borderColor}`,
          background: phoneBg,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,.12)",
        }}
      >
        {/* Notch */}
        <div
          style={{
            height: 28,
            background: phoneBg,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              width: 80,
              height: 6,
              borderRadius: 3,
              background: isDark ? "#374151" : "#d1d5db",
            }}
          />
        </div>

        {/* Status bar */}
        <div
          style={{
            padding: "6px 20px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: metaColor,
          }}
        >
          <span>9:41</span>
          <span>📶 🔋</span>
        </div>

        {/* Header */}
        <div
          style={{
            padding: "8px 16px 12px",
            borderBottom: `1px solid ${borderColor}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#3b82f6",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            {sender.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#e5e7eb" : "#111827" }}>
            {sender}
          </div>
        </div>

        {/* Messages area */}
        <div
          style={{
            minHeight: 280,
            background: screenBg,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ fontSize: 11, color: metaColor, textAlign: "center", marginBottom: 12 }}>
            Today
          </div>

          {/* SMS bubble */}
          <div
            style={{
              background: bubbleBg,
              color: bubbleText,
              borderRadius: "16px 16px 16px 4px",
              padding: "10px 14px",
              fontSize: 14,
              lineHeight: 1.5,
              maxWidth: "85%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {plainText ? renderWithHighlights(plainText) : (
              <span style={{ color: metaColor, fontStyle: "italic" }}>(No content)</span>
            )}
          </div>

          <div style={{ fontSize: 10, color: metaColor, marginTop: 4, paddingLeft: 4 }}>
            Just now
          </div>
        </div>

        {/* Input bar */}
        <div
          style={{
            padding: "8px 12px",
            borderTop: `1px solid ${borderColor}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: phoneBg,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 32,
              borderRadius: 16,
              background: screenBg,
              border: `1px solid ${borderColor}`,
              padding: "0 12px",
              fontSize: 13,
              color: metaColor,
              display: "flex",
              alignItems: "center",
            }}
          >
            Text Message
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#3b82f6",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            ↑
          </div>
        </div>

        {/* Home indicator */}
        <div style={{ height: 20, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: 100, height: 4, borderRadius: 2, background: isDark ? "#374151" : "#d1d5db" }} />
        </div>
      </div>

      {/* Stats panel */}
      <div style={{ marginLeft: 24, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        <Stat label="Characters" value={chars} />
        <Stat label="Segments" value={segments} />
        <Stat label="Char limit/seg" value={limit} />
        {segments > 1 && (
          <div
            style={{
              fontSize: 11,
              color: "#f59e0b",
              background: "#fef3c7",
              padding: "4px 8px",
              borderRadius: 4,
              maxWidth: 140,
            }}
          >
            Multi-segment — carrier may charge per segment
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#3b82f6" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

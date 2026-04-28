"use client";

import React, { useMemo, useState } from "react";
import {
  useContentfulLiveUpdates,
  useContentfulInspectorMode,
} from "@contentful/live-preview/react";
import type { Document } from "@contentful/rich-text-types";
import type { INotificationTemplate } from "../../type";
import { interpolateRichText, interpolateString, extractPlaceholders } from "./interpolate";
import EmailChannel from "./email-channel";
import SmsChannel from "./sms-channel";
import InAppChannel from "./in-app-channel";

interface NotificationPreviewClientProps {
  entry: INotificationTemplate;
  locale: string;
  isPreview: boolean;
}

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  firstName: "Ola",
  lastName: "Nordmann",
  orderNumber: "EP-12345",
  storeName: "Europris Storo",
  storeAddress: "Vitaminveien 7, 0485 Oslo",
  pickupDate: "25. april 2026",
  trackingUrl: "https://europris.no/tracking/EP-12345",
  amount: "kr 299,00",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  "in-app": "In-App",
};

const CHANNEL_ICONS: Record<string, string> = {
  email: "✉️",
  sms: "💬",
  "in-app": "🔔",
};

export default function NotificationPreviewClient({
  entry: serverEntry,
  locale,
  isPreview,
}: NotificationPreviewClientProps) {
  const entry = useContentfulLiveUpdates(serverEntry) || serverEntry;
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });

  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const sampleData = useMemo(() => {
    const entryData = entry.fields.sampleData as Record<string, string> | undefined;
    return { ...DEFAULT_SAMPLE_DATA, ...(entryData ?? {}) };
  }, [entry.fields.sampleData]);

  const interpolatedBody = useMemo(() => {
    const body = entry.fields.bodyRichText as Document | undefined;
    return interpolateRichText(body ?? null, sampleData);
  }, [entry.fields.bodyRichText, sampleData]);

  const interpolatedSubject = useMemo(() => {
    return interpolateString(entry.fields.subject || "", sampleData);
  }, [entry.fields.subject, sampleData]);

  const placeholders = useMemo(() => {
    const bodyKeys = extractPlaceholders(entry.fields.bodyRichText as Document | undefined);
    const subjectKeys = Array.from(
      (entry.fields.subject || "").matchAll(/\{\{(\w+)\}\}/g),
    ).map((m) => m[1]);
    return Array.from(new Set([...subjectKeys, ...bodyKeys]));
  }, [entry.fields.bodyRichText, entry.fields.subject]);

  const channel = entry.fields.channel || "email";

  return (
    <div style={{ minHeight: "100vh", background: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
      {/* Top toolbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: theme === "dark" ? "#1e293b" : "#ffffff",
          borderBottom: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Left: template info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>{CHANNEL_ICONS[channel] || "📋"}</span>
          <div>
            <div
              {...inspectorProps({ fieldId: "internalName" })}
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: theme === "dark" ? "#f1f5f9" : "#0f172a",
              }}
            >
              {entry.fields.internalName}
            </div>
            <div style={{ fontSize: 12, color: theme === "dark" ? "#94a3b8" : "#64748b", display: "flex", gap: 8 }}>
              <span
                {...inspectorProps({ fieldId: "key" })}
                style={{
                  background: theme === "dark" ? "#334155" : "#f1f5f9",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
              >
                {entry.fields.key}
              </span>
              <span
                style={{
                  background: channel === "email" ? "#dbeafe" : channel === "sms" ? "#dcfce7" : "#fef3c7",
                  color: channel === "email" ? "#1e40af" : channel === "sms" ? "#166534" : "#92400e",
                  padding: "1px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {CHANNEL_LABELS[channel] || channel}
              </span>
              {entry.fields.audience && (
                <span
                  style={{
                    background: theme === "dark" ? "#334155" : "#f1f5f9",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  {entry.fields.audience}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {channel === "email" && (
            <>
              <ToggleButton
                active={viewport === "desktop"}
                onClick={() => setViewport("desktop")}
                theme={theme}
              >
                🖥 Desktop
              </ToggleButton>
              <ToggleButton
                active={viewport === "mobile"}
                onClick={() => setViewport("mobile")}
                theme={theme}
              >
                📱 Mobile
              </ToggleButton>
              <div style={{ width: 1, height: 24, background: theme === "dark" ? "#475569" : "#e2e8f0", margin: "0 4px" }} />
            </>
          )}
          <ToggleButton
            active={theme === "light"}
            onClick={() => setTheme("light")}
            theme={theme}
          >
            ☀️ Light
          </ToggleButton>
          <ToggleButton
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
            theme={theme}
          >
            🌙 Dark
          </ToggleButton>
        </div>
      </div>

      {/* Subject bar (for email/in-app) */}
      {(channel === "email" || channel === "in-app") && (
        <div
          {...inspectorProps({ fieldId: "subject" })}
          style={{
            maxWidth: 700,
            margin: "16px auto 0",
            padding: "10px 20px",
            background: theme === "dark" ? "#1e293b" : "#ffffff",
            borderRadius: 8,
            border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
            fontSize: 14,
            color: theme === "dark" ? "#e2e8f0" : "#1e293b",
          }}
        >
          <span style={{ color: theme === "dark" ? "#64748b" : "#94a3b8", marginRight: 8, fontSize: 12 }}>
            Subject:
          </span>
          <span style={{ fontWeight: 600 }}>{interpolatedSubject || "(No subject)"}</span>
        </div>
      )}

      {/* Channel renderer */}
      <div
        {...inspectorProps({ fieldId: "bodyRichText" })}
        style={{ padding: "16px 0 40px" }}
      >
        {channel === "email" && (
          <EmailChannel
            entry={entry}
            interpolatedBody={interpolatedBody}
            sampleData={sampleData}
            viewport={viewport}
            theme={theme}
          />
        )}
        {channel === "sms" && (
          <SmsChannel
            entry={entry}
            interpolatedBody={interpolatedBody}
            sampleData={sampleData}
            theme={theme}
          />
        )}
        {channel === "in-app" && (
          <InAppChannel
            entry={entry}
            interpolatedBody={interpolatedBody}
            sampleData={sampleData}
            theme={theme}
          />
        )}
      </div>

      {/* Placeholder data panel */}
      {placeholders.length > 0 && (
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto 40px",
            padding: "16px 20px",
            background: theme === "dark" ? "#1e293b" : "#ffffff",
            borderRadius: 8,
            border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 12,
              color: theme === "dark" ? "#e2e8f0" : "#1e293b",
            }}
          >
            Placeholder Data (from sampleData)
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              gap: "6px 16px",
              fontSize: 13,
            }}
          >
            {placeholders.map((key) => (
              <React.Fragment key={key}>
                <code
                  style={{
                    background: theme === "dark" ? "#334155" : "#f1f5f9",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 12,
                    color: theme === "dark" ? "#93c5fd" : "#1e40af",
                  }}
                >
                  {`{{${key}}}`}
                </code>
                <span style={{ color: key in sampleData ? (theme === "dark" ? "#e2e8f0" : "#1e293b") : "#ef4444" }}>
                  {key in sampleData ? sampleData[key] : "⚠ Not in sampleData"}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
  theme,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  theme: "light" | "dark";
}) {
  const bg = active
    ? theme === "dark" ? "#334155" : "#e2e8f0"
    : theme === "dark" ? "#1e293b" : "#f8fafc";
  const color = active
    ? theme === "dark" ? "#f1f5f9" : "#0f172a"
    : theme === "dark" ? "#94a3b8" : "#64748b";
  const borderColor = active
    ? theme === "dark" ? "#475569" : "#cbd5e1"
    : theme === "dark" ? "#334155" : "#e2e8f0";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: bg,
        color,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        padding: "6px 14px",
        minHeight: 34,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

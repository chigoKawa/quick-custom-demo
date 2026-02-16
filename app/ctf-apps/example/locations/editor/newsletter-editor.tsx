"use client";

import React, { useEffect, useState } from "react";
import type { EditorAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import {
  Box,
  Heading,
  Paragraph,
  Text,
  Note,
} from "@contentful/f36-components";
import EmailPreview from "../../components/email-preview";

export default function NewsletterEditor() {
  const sdk = useSDK<EditorAppSDK>();

  const defaultLocale = sdk.locales.default;
  const availableLocales = sdk.locales.available || [defaultLocale];
  const activeLocale = availableLocales[0] || defaultLocale;

  const entry: any = sdk.entry || null;
  const fieldsApi = (entry && (entry as any).fields) || {};

  // Hooks must be called before any early returns
  const [assetsById, setAssetsById] = useState<Record<string, any>>({});
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [clientPreset, setClientPreset] = useState<
    "gmail" | "appleMail" | "outlook"
  >("gmail");

  const getFieldValue = (fieldId: string): string => {
    if (!entry) return "";
    const fieldApi = fieldsApi[fieldId];
    if (!fieldApi || typeof fieldApi.getValue !== "function") return "";
    const raw = fieldApi.getValue();
    if (raw && typeof raw === "object") {
      const valActive = (raw as any)[activeLocale];
      if (typeof valActive === "string") return valActive;
      const valDefault = (raw as any)[defaultLocale];
      if (typeof valDefault === "string") return valDefault;
    }
    if (typeof raw === "string") return raw;
    return "";
  };

  const contentFieldApi = entry ? fieldsApi.content : null;
  const contentValue =
    contentFieldApi && typeof contentFieldApi.getValue === "function"
      ? contentFieldApi.getValue()
      : undefined;
  const richContent =
    contentValue?.[activeLocale] ??
    contentValue?.[defaultLocale] ??
    contentValue;

  useEffect(() => {
    if (!richContent || typeof richContent !== "object") {
      setAssetsById({});
      return;
    }

    const collectIds = (node: any, acc: Set<string>) => {
      if (!node || typeof node !== "object") return;
      if (node.nodeType === "embedded-asset-block") {
        const id = node.data?.target?.sys?.id;
        if (typeof id === "string") {
          acc.add(id);
        }
      }
      const content = Array.isArray(node.content) ? node.content : [];
      for (const child of content) {
        collectIds(child, acc);
      }
    };

    const ids = new Set<string>();
    collectIds(richContent as any, ids);

    if (ids.size === 0 || !sdk.cma) {
      setAssetsById({});
      return;
    }

    const query = {
      "sys.id[in]": Array.from(ids).join(","),
    } as any;

    let cancelled = false;

    sdk.cma.asset
      .getMany({ query })
      .then((res: any) => {
        if (cancelled || !res || !Array.isArray(res.items)) return;
        const map: Record<string, any> = {};
        for (const item of res.items) {
          const id = item?.sys?.id;
          if (typeof id === "string") {
            map[id] = item;
          }
        }
        setAssetsById(map);
      })
      .catch(() => {
        setAssetsById({});
      });

    return () => {
      cancelled = true;
    };
  }, [sdk.cma, richContent]);

  if (!entry) {
    return (
      <Box padding="spacingL" style={{ maxWidth: 960, margin: "0 auto" }}>
        <Note>
          <Text>No entry data available for preview.</Text>
        </Note>
      </Box>
    );
  }

  const subject = getFieldValue("subject");
  const senderName = getFieldValue("senderName");
  const senderEmail = getFieldValue("senderEmail");
  const replyToEmail = getFieldValue("replyToEmail") || undefined;
  const preheader = getFieldValue("preheader") || undefined;

  return (
    <Box padding="spacingL" style={{ maxWidth: 960, margin: "0 auto" }}>
      <Heading as="h2" marginBottom="spacingM">
        Newsletter preview
      </Heading>
      <Paragraph marginBottom="spacingM">
        <Text>
          This is a read-only email-style preview of the current entry. Edit
          fields using the native Contentful editor and reload to update the
          preview.
        </Text>
      </Paragraph>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#6c7a89" }}>View:</span>
        <button
          type="button"
          onClick={() => setTheme("light")}
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            border:
              theme === "light" ? "1px solid #3273dc" : "1px solid #d3dce0",
            background: theme === "light" ? "#e0ebff" : "#ffffff",
            cursor: "pointer",
          }}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            border:
              theme === "dark" ? "1px solid #3273dc" : "1px solid #d3dce0",
            background: theme === "dark" ? "#111827" : "#ffffff",
            color: theme === "dark" ? "#e5e7eb" : "#111827",
            cursor: "pointer",
          }}
        >
          Dark
        </button>
        <span style={{ fontSize: 11, color: "#6c7a89", marginLeft: 4 }}>
          Width:
        </span>
        <button
          type="button"
          onClick={() => setViewport("desktop")}
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            border:
              viewport === "desktop"
                ? "1px solid #3273dc"
                : "1px solid #d3dce0",
            background: viewport === "desktop" ? "#e0ebff" : "#ffffff",
            cursor: "pointer",
          }}
        >
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setViewport("mobile")}
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            border:
              viewport === "mobile" ? "1px solid #3273dc" : "1px solid #d3dce0",
            background: viewport === "mobile" ? "#e0ebff" : "#ffffff",
            cursor: "pointer",
          }}
        >
          Mobile
        </button>
        <span style={{ fontSize: 11, color: "#6c7a89", marginLeft: 4 }}>
          Client:
        </span>
        <select
          value={clientPreset}
          onChange={(e) =>
            setClientPreset(e.target.value as "gmail" | "appleMail" | "outlook")
          }
          style={{
            fontSize: 11,
            padding: "2px 4px",
            borderRadius: 4,
            border: "1px solid #d3dce0",
          }}
        >
          <option value="gmail">Gmail</option>
          <option value="appleMail">Apple Mail</option>
          <option value="outlook">Outlook</option>
        </select>
      </div>
      <EmailPreview
        subject={subject}
        senderName={senderName}
        senderEmail={senderEmail}
        replyToEmail={replyToEmail}
        preheader={preheader}
        content={richContent}
        assetsById={assetsById}
        theme={theme}
        viewport={viewport}
        clientPreset={clientPreset}
      />
    </Box>
  );
}

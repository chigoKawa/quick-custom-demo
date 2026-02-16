"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { Note, Paragraph, Spinner, Text } from "@contentful/f36-components";
import EmailPreview from "../../components/email-preview";

const StatsSidebar = () => {
  const sdk = useSDK<SidebarAppSDK>();

  const defaultLocale = sdk.locales.default;
  const availableLocales = sdk.locales.available || [defaultLocale];
  const activeLocale = availableLocales[0] || defaultLocale;

  const entry: any = sdk.entry || null;
  const hasEntry = Boolean(entry && entry.getSys && entry.getSys().id);
  const fieldsApi = hasEntry ? (entry as any).fields || {} : {};

  const getFieldValue = (fieldId: string): string => {
    const fieldApi = fieldsApi[fieldId];
    if (!fieldApi) return "";
    // Sidebar field APIs expose getValue; prefer active locale then default.
    const raw = fieldApi.getValue?.();
    if (raw && typeof raw === "object") {
      const valActive = (raw as any)[activeLocale];
      if (typeof valActive === "string") return valActive;
      const valDefault = (raw as any)[defaultLocale];
      if (typeof valDefault === "string") return valDefault;
    }
    if (typeof raw === "string") return raw;
    return "";
  };

  const [version, setVersion] = useState(0);
  const [assetsById, setAssetsById] = useState<Record<string, any>>({});
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [viewport] = useState<"desktop" | "mobile">("desktop");
  const [clientPreset, setClientPreset] = useState<
    "gmail" | "appleMail" | "outlook"
  >("gmail");

  useEffect(() => {
    // Re-render when any of the core newsletter fields change.
    const fieldIds = [
      "subject",
      "senderName",
      "senderEmail",
      "replyToEmail",
      "preheader",
      "content",
    ];
    const detach: Array<() => void> = [];
    if (hasEntry) {
      for (const id of fieldIds) {
        const fieldApi = (sdk.entry as any).fields?.[id];
        if (fieldApi && typeof fieldApi.onValueChanged === "function") {
          const off = fieldApi.onValueChanged(() => {
            setVersion((v) => v + 1);
          });
          detach.push(off);
        }
      }
    }
    return () => {
      for (const off of detach) {
        try {
          off();
        } catch {
          // ignore
        }
      }
    };
  }, [sdk, hasEntry]);

  const contentFieldApi = fieldsApi.content;
  const contentValue = contentFieldApi?.getValue?.();
  const richContent =
    contentValue?.[activeLocale] ??
    contentValue?.[defaultLocale] ??
    contentValue;

  useEffect(() => {
    // Enrich embedded assets in the Rich Text with full CMA asset data so
    // previews can render actual images instead of generic stubs.
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

    if (ids.size === 0 || !sdk.cma || !sdk.ids?.space) {
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
        // On error, just fall back to stubs.
        setAssetsById({});
      });

    return () => {
      cancelled = true;
    };
  }, [sdk.cma, richContent]);

  const preview = useMemo(() => {
    if (!hasEntry) return null;
    const subject = getFieldValue("subject");
    const senderName = getFieldValue("senderName");
    const senderEmail = getFieldValue("senderEmail");
    const replyToEmail = getFieldValue("replyToEmail");
    const preheader = getFieldValue("preheader");

    return {
      subject,
      senderName,
      senderEmail,
      replyToEmail,
      preheader,
      content: richContent,
    };
  }, [hasEntry, richContent, activeLocale, defaultLocale, version]);

  if (!hasEntry) {
    return (
      <Note>
        <Paragraph>
          <Text>
            No entry loaded. Save your entry to preview the newsletter.
          </Text>
        </Paragraph>
      </Note>
    );
  }

  if (!preview) {
    return (
      <Note>
        <Spinner size="small" />
        <Text style={{ marginLeft: 8 }}>Preparing newsletter preview…</Text>
      </Note>
    );
  }

  const handleOpenDialog = async () => {
    if (!preview) return;
    await sdk.dialogs.openCurrentApp({
      title: preview.subject || "Newsletter preview",
      parameters: {
        subject: preview.subject,
        senderName: preview.senderName,
        senderEmail: preview.senderEmail,
        replyToEmail: preview.replyToEmail ?? null,
        preheader: preview.preheader ?? null,
        content: preview.content ?? null,
        theme,
        viewport,
        clientPreset,
      },
      allowHeightOverflow: true,
      minHeight: "600px",

      // width: "large",
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
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
        {/* Width controls are intentionally hidden in the sidebar; viewport is fixed. */}
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
        subject={preview.subject}
        senderName={preview.senderName}
        senderEmail={preview.senderEmail}
        replyToEmail={preview.replyToEmail}
        preheader={preview.preheader}
        content={preview.content}
        assetsById={assetsById}
        theme={theme}
        viewport={viewport}
        clientPreset={clientPreset}
      />
      <button
        type="button"
        onClick={handleOpenDialog}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: 32,
          height: 32,
          borderRadius: "999px",
          border: "none",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          cursor: "pointer",
          transform: "scale(1)",
          transition: "transform 120ms ease, background 120ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "scale(1.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        aria-label="Open full newsletter preview"
      >
        🔍
      </button>
    </div>
  );
};

export default StatsSidebar;

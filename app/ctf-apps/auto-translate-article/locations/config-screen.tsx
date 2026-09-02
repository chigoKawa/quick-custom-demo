"use client";

import { useCallback, useEffect, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { ConfigAppSDK } from "@contentful/app-sdk";

// Installation parameters — all strings (Contentful requirement). Arrays are
// stored as comma-separated values so the config screen and handler share the
// same simple format.
interface AppInstallationParameters {
  /** Comma-separated content type IDs to translate (empty = all). */
  CONTENT_TYPE_IDS?: string;
  /** Source locale for the translation (e.g. "en-US"). */
  SOURCE_LOCALE?: string;
  /** Comma-separated target locale codes. */
  TARGET_LOCALES?: string;
  /** The AI Action id (published) that produces the translation. */
  AI_ACTION_ID?: string;
  /** When "true", skip locales that already have a non-empty value. */
  SKIP_EXISTING?: string;
  /** When "true", publish the entry after writing translations. Default false
   *  so reviewers approve translations per locale. */
  PUBLISH_AFTER_UPDATE?: string;
  /** "PlainText" | "Markdown" | "RichText" — matches the AI Action output. */
  OUTPUT_FORMAT?: string;
}

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const [contentTypeIds, setContentTypeIds] = useState("article");
  const [sourceLocale, setSourceLocale] = useState("en-US");
  const [targetLocales, setTargetLocales] = useState("de, fr, es, it");
  const [aiActionId, setAiActionId] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [publishAfter, setPublishAfter] = useState(false);
  const [outputFormat, setOutputFormat] = useState<
    "PlainText" | "Markdown" | "RichText"
  >("PlainText");

  useEffect(() => {
    const params = sdk.parameters.installation as AppInstallationParameters;
    if (params) {
      if (params.CONTENT_TYPE_IDS !== undefined) setContentTypeIds(params.CONTENT_TYPE_IDS);
      if (params.SOURCE_LOCALE) setSourceLocale(params.SOURCE_LOCALE);
      if (params.TARGET_LOCALES) setTargetLocales(params.TARGET_LOCALES);
      if (params.AI_ACTION_ID) setAiActionId(params.AI_ACTION_ID);
      if (params.SKIP_EXISTING !== undefined) setSkipExisting(params.SKIP_EXISTING !== "false");
      if (params.PUBLISH_AFTER_UPDATE !== undefined) setPublishAfter(params.PUBLISH_AFTER_UPDATE === "true");
      if (
        params.OUTPUT_FORMAT === "PlainText" ||
        params.OUTPUT_FORMAT === "Markdown" ||
        params.OUTPUT_FORMAT === "RichText"
      ) {
        setOutputFormat(params.OUTPUT_FORMAT);
      }
    }
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const parameters: AppInstallationParameters = {
      CONTENT_TYPE_IDS: contentTypeIds.trim(),
      SOURCE_LOCALE: sourceLocale.trim(),
      TARGET_LOCALES: targetLocales.trim(),
      AI_ACTION_ID: aiActionId.trim(),
      SKIP_EXISTING: skipExisting ? "true" : "false",
      PUBLISH_AFTER_UPDATE: publishAfter ? "true" : "false",
      OUTPUT_FORMAT: outputFormat,
    };
    if (!parameters.AI_ACTION_ID) {
      sdk.notifier.error("AI Action ID is required.");
      return false;
    }
    if (!parameters.SOURCE_LOCALE || !parameters.TARGET_LOCALES) {
      sdk.notifier.error("Source and at least one target locale are required.");
      return false;
    }
    return { parameters };
  }, [
    contentTypeIds,
    sourceLocale,
    targetLocales,
    aiActionId,
    skipExisting,
    publishAfter,
    outputFormat,
    sdk,
  ]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  const labelStyle = { display: "block", marginBottom: 4, fontWeight: 500 } as const;
  const inputStyle = {
    width: "100%",
    padding: 8,
    border: "1px solid #cfd9e0",
    borderRadius: 4,
  } as const;
  const helpStyle = { fontSize: 12, color: "#666", marginTop: 4 } as const;

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Auto Translate Article</h1>
      <p style={{ marginBottom: 24, color: "#666" }}>
        Triggered by a Workflow Automation. The function discovers every
        field marked <code>Localized</code> on the entry&apos;s content type and
        invokes the configured AI Action once per (field × target locale).
        Results are written back as a draft.
      </p>

      <div style={{ marginBottom: 24, padding: 16, background: "#f7f9fa", borderRadius: 4 }}>
        <strong>Setup</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Publish an AI Action with variables <code>content</code> and <code>targetLocale</code>.</li>
          <li>Enter its ID below (or use the AI Actions app in Contentful to copy the id).</li>
          <li>Create an App Action pointing at this function (<code>Auto Translate Handler</code>).</li>
          <li>Create a Workflow with an appropriate step (e.g. &quot;Ready to translate&quot;).</li>
          <li>Create an Automation on that step to call the App Action.</li>
        </ol>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Content type IDs</label>
        <input
          type="text"
          value={contentTypeIds}
          onChange={(e) => setContentTypeIds(e.target.value)}
          placeholder="article, blogPost"
          style={inputStyle}
        />
        <p style={helpStyle}>Comma-separated. Empty = every content type.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Source locale</label>
        <input
          type="text"
          value={sourceLocale}
          onChange={(e) => setSourceLocale(e.target.value)}
          placeholder="en-US"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Target locales</label>
        <input
          type="text"
          value={targetLocales}
          onChange={(e) => setTargetLocales(e.target.value)}
          placeholder="de, fr, es, it"
          style={inputStyle}
        />
        <p style={helpStyle}>Comma-separated locale codes.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>AI Action ID</label>
        <input
          type="text"
          value={aiActionId}
          onChange={(e) => setAiActionId(e.target.value)}
          placeholder="1abc23DefGhi45JklMno"
          style={inputStyle}
        />
        <p style={helpStyle}>
          The published AI Action. Must accept variables <code>content</code> (text)
          and <code>targetLocale</code> (text).
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Output format</label>
        <select
          value={outputFormat}
          onChange={(e) =>
            setOutputFormat(e.target.value as "PlainText" | "Markdown" | "RichText")
          }
          style={inputStyle}
        >
          <option value="PlainText">PlainText</option>
          <option value="Markdown">Markdown</option>
          <option value="RichText">RichText</option>
        </select>
        <p style={helpStyle}>
          Must match the AI Action&apos;s configured output. Use RichText when
          translating rich-text body fields.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          <span>Skip target locales that already have a non-empty value</span>
        </label>
        <p style={helpStyle}>Prevents overwriting reviewer-edited translations.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={publishAfter}
            onChange={(e) => setPublishAfter(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          <span>Publish entry after writing translations</span>
        </label>
        <p style={helpStyle}>
          Default: unchecked. Reviewers should approve per locale before publishing.
        </p>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: "#e3f2fd", borderRadius: 4 }}>
        <strong>How it works</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Entry enters the configured workflow step.</li>
          <li>Automation triggers the App Action, which invokes this function.</li>
          <li>Function fetches the entry + its content type; filters by the content-type allowlist.</li>
          <li>Every field where <code>Localized</code> is on and the type is Symbol / Text / RichText is queued.</li>
          <li>For each (field × target locale), the AI Action is invoked and polled until completion.</li>
          <li>Translations are written back to the entry (as draft by default).</li>
        </ol>
        <p style={{ marginTop: 12, fontSize: 12, color: "#456" }}>
          Non-text localized fields (references, dates, booleans) are skipped
          automatically. Change what gets translated by toggling{" "}
          <code>Localized</code> on the content type.
        </p>
      </div>
    </div>
  );
}

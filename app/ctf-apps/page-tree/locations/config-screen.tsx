"use client";

import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useState } from "react";
import {
  APP_NAME,
  DEFAULT_CONTENT_TYPE_ID,
  DEFAULT_FULLPATH_FIELD,
  DEFAULT_LOCALE,
  DEFAULT_PARENT_FIELD,
  DEFAULT_SLUG_FIELD,
} from "../constants";
import type { ContentTypeConfig, PageTreeInstallationParameters } from "../types";
import { resolveContentTypes } from "../utils";
import styles from "./config-screen.module.css";

function makeEmptyConfig(): ContentTypeConfig {
  return {
    contentTypeId: "",
    parentFieldName: DEFAULT_PARENT_FIELD,
    fullPathFieldName: DEFAULT_FULLPATH_FIELD,
    slugFieldName: DEFAULT_SLUG_FIELD,
  };
}

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const installed = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;

  const [contentTypes, setContentTypes] = useState<ContentTypeConfig[]>(() => {
    const resolved = resolveContentTypes(installed);
    return resolved.length > 0 ? resolved : [{ ...makeEmptyConfig(), contentTypeId: DEFAULT_CONTENT_TYPE_ID }];
  });

  const [locale, setLocale] = useState(installed.locale ?? DEFAULT_LOCALE);
  const [siteBaseUrl, setSiteBaseUrl] = useState(installed.siteBaseUrl ?? "");
  const [homeSlug, setHomeSlug] = useState(installed.homeSlug ?? "home");

  useEffect(() => {
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const validTypes = contentTypes.filter((ct) => ct.contentTypeId.trim());

    const parameters: PageTreeInstallationParameters = {
      contentTypes: validTypes.map((ct) => ({
        contentTypeId: ct.contentTypeId.trim(),
        parentFieldName: ct.parentFieldName || DEFAULT_PARENT_FIELD,
        fullPathFieldName: ct.fullPathFieldName || DEFAULT_FULLPATH_FIELD,
        slugFieldName: ct.slugFieldName || DEFAULT_SLUG_FIELD,
      })),
      locale: locale || DEFAULT_LOCALE,
      siteBaseUrl: siteBaseUrl.trim() || undefined,
      homeSlug: homeSlug || "home",
    };
    return { parameters } as unknown as ReturnType<Parameters<typeof sdk.app.onConfigure>[0]>;
  }, [contentTypes, locale, siteBaseUrl, homeSlug]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure as Parameters<typeof sdk.app.onConfigure>[0]);
  }, [sdk, onConfigure]);

  const updateType = (index: number, patch: Partial<ContentTypeConfig>) => {
    setContentTypes((prev) => prev.map((ct, i) => (i === index ? { ...ct, ...patch } : ct)));
  };

  const addType = () => {
    setContentTypes((prev) => [...prev, makeEmptyConfig()]);
  };

  const removeType = (index: number) => {
    setContentTypes((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🌳 {APP_NAME}</h1>
        <p className={styles.subtitle}>
          Configure the Page Tree app. It adds parent/child hierarchy support across
          multiple content types and provides a unified tree view of your site structure.
        </p>
      </div>

      <div className={styles.formSection}>
        <div className={styles.sectionTitle}>Content Types</div>
        <div className={styles.helpText} style={{ marginBottom: 16 }}>
          Add every content type that participates in your page hierarchy.
          Each type needs a <code>parent</code> (entry link), <code>slug</code>,
          and <code>fullPath</code> field. Entries of any listed type can be a parent
          to entries of any other listed type.
        </div>

        {contentTypes.map((ct, index) => (
          <div key={index} className={styles.typeCard}>
            <div className={styles.typeCardHeader}>
              <span className={styles.typeCardNumber}>#{index + 1}</span>
              {contentTypes.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => removeType(index)}
                  title="Remove this content type"
                >
                  ✕
                </button>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Content Type ID</label>
              <input
                className={styles.input}
                value={ct.contentTypeId}
                onChange={(e) => updateType(index, { contentTypeId: e.target.value })}
                placeholder={DEFAULT_CONTENT_TYPE_ID}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Parent Field</label>
                <input
                  className={styles.input}
                  value={ct.parentFieldName}
                  onChange={(e) => updateType(index, { parentFieldName: e.target.value })}
                  placeholder={DEFAULT_PARENT_FIELD}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Slug Field</label>
                <input
                  className={styles.input}
                  value={ct.slugFieldName}
                  onChange={(e) => updateType(index, { slugFieldName: e.target.value })}
                  placeholder={DEFAULT_SLUG_FIELD}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Path Field</label>
                <input
                  className={styles.input}
                  value={ct.fullPathFieldName}
                  onChange={(e) => updateType(index, { fullPathFieldName: e.target.value })}
                  placeholder={DEFAULT_FULLPATH_FIELD}
                />
              </div>
            </div>
          </div>
        ))}

        <button className={styles.addBtn} onClick={addType}>
          + Add content type
        </button>
      </div>

      <div className={styles.formSection}>
        <div className={styles.sectionTitle}>Locale &amp; URLs</div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Locale</label>
          <input
            className={styles.input}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            placeholder={DEFAULT_LOCALE}
          />
          <div className={styles.helpText}>
            Locale code used when reading field values (default: <code>en-US</code>).
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Site Base URL</label>
          <input
            className={styles.input}
            value={siteBaseUrl}
            onChange={(e) => setSiteBaseUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <div className={styles.helpText}>
            Optional. Used to generate live page links in the tree view.
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Home Slug</label>
          <input
            className={styles.input}
            value={homeSlug}
            onChange={(e) => setHomeSlug(e.target.value)}
            placeholder="home"
          />
          <div className={styles.helpText}>
            Slug value that maps to <code>/</code> (default: <code>home</code>).
          </div>
        </div>
      </div>

      <div className={styles.infoBox}>
        <p>
          <strong>💡 Tip:</strong> After installing, add this app to the entry sidebar for
          each configured content type. The sidebar lets editors pick a parent page (from any
          listed type) and view the computed full path. The page view gives a full site tree
          overview across all types.
        </p>
      </div>
    </div>
  );
}

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
import type { PageTreeInstallationParameters } from "../types";
import styles from "./config-screen.module.css";

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const installed = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;

  const [contentTypeId, setContentTypeId] = useState(
    installed.contentTypeId ?? DEFAULT_CONTENT_TYPE_ID
  );
  const [parentFieldName, setParentFieldName] = useState(
    installed.parentFieldName ?? DEFAULT_PARENT_FIELD
  );
  const [fullPathFieldName, setFullPathFieldName] = useState(
    installed.fullPathFieldName ?? DEFAULT_FULLPATH_FIELD
  );
  const [slugFieldName, setSlugFieldName] = useState(
    installed.slugFieldName ?? DEFAULT_SLUG_FIELD
  );
  const [locale, setLocale] = useState(installed.locale ?? DEFAULT_LOCALE);
  const [siteBaseUrl, setSiteBaseUrl] = useState(installed.siteBaseUrl ?? "");
  const [homeSlug, setHomeSlug] = useState(installed.homeSlug ?? "home");

  useEffect(() => {
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const parameters: PageTreeInstallationParameters = {
      contentTypeId: contentTypeId || DEFAULT_CONTENT_TYPE_ID,
      parentFieldName: parentFieldName || DEFAULT_PARENT_FIELD,
      fullPathFieldName: fullPathFieldName || DEFAULT_FULLPATH_FIELD,
      slugFieldName: slugFieldName || DEFAULT_SLUG_FIELD,
      locale: locale || DEFAULT_LOCALE,
      siteBaseUrl: siteBaseUrl.trim() || undefined,
      homeSlug: homeSlug || "home",
    };
    return { parameters } as unknown as ReturnType<Parameters<typeof sdk.app.onConfigure>[0]>;
  }, [contentTypeId, parentFieldName, fullPathFieldName, slugFieldName, locale, siteBaseUrl, homeSlug]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure as Parameters<typeof sdk.app.onConfigure>[0]);
  }, [sdk, onConfigure]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🌳 {APP_NAME}</h1>
        <p className={styles.subtitle}>
          Configure the Page Tree app. It adds parent/child hierarchy support to your content
          and provides a full-page tree view of your site structure.
        </p>
      </div>

      <div className={styles.formSection}>
        <div className={styles.sectionTitle}>Content Type</div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Content Type ID</label>
          <input
            className={styles.input}
            value={contentTypeId}
            onChange={(e) => setContentTypeId(e.target.value)}
            placeholder={DEFAULT_CONTENT_TYPE_ID}
          />
          <div className={styles.helpText}>
            The content type to build the tree from (e.g. <code>landingPage</code>).
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Parent Field Name</label>
          <input
            className={styles.input}
            value={parentFieldName}
            onChange={(e) => setParentFieldName(e.target.value)}
            placeholder={DEFAULT_PARENT_FIELD}
          />
          <div className={styles.helpText}>
            Field ID for the parent entry link (default: <code>parent</code>).
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Full Path Field Name</label>
          <input
            className={styles.input}
            value={fullPathFieldName}
            onChange={(e) => setFullPathFieldName(e.target.value)}
            placeholder={DEFAULT_FULLPATH_FIELD}
          />
          <div className={styles.helpText}>
            Field ID where the computed URL path is written (default: <code>fullPath</code>).
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Slug Field Name</label>
          <input
            className={styles.input}
            value={slugFieldName}
            onChange={(e) => setSlugFieldName(e.target.value)}
            placeholder={DEFAULT_SLUG_FIELD}
          />
          <div className={styles.helpText}>
            Field ID for the URL slug (default: <code>slug</code>).
          </div>
        </div>
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
          your content type. The sidebar lets editors pick a parent page and view the computed
          full path. The page view gives a full site tree overview.
        </p>
      </div>
    </div>
  );
}

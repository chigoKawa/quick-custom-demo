"use client";

import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_CONTENT_TYPE_ID, DEFAULT_FULLPATH_FIELD, DEFAULT_LOCALE, DEFAULT_PARENT_FIELD } from "../constants";
import type { PageTreeEntry, PageTreeInstallationParameters } from "../types";
import { computeFullPath, fetchWithTimeout } from "../utils";
import styles from "./page-tree-sidebar.module.css";

export default function PageTreeSidebar() {
  const sdk = useSDK<SidebarAppSDK>();

  const installParams = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;
  const parentFieldName = installParams.parentFieldName ?? DEFAULT_PARENT_FIELD;
  const fullPathFieldName = installParams.fullPathFieldName ?? DEFAULT_FULLPATH_FIELD;
  const contentTypeId = installParams.contentTypeId ?? DEFAULT_CONTENT_TYPE_ID;
  const locale = installParams.locale ?? DEFAULT_LOCALE;
  const homeSlug = installParams.homeSlug ?? "home";

  const currentEntryId = sdk.entry.getSys().id;

  // Check if parent field exists on this entry
  const parentField = sdk.entry.fields[parentFieldName];
  const fullPathField = sdk.entry.fields[fullPathFieldName];

  const [entries, setEntries] = useState<PageTreeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [storedFullPath, setStoredFullPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  // Load entries for breadcrumb + path computation
  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchWithTimeout<{ success: boolean; data: PageTreeEntry[] }>(
      `/api/page-tree/entries?contentTypeId=${contentTypeId}&locale=${locale}`,
      {},
      10000
    );
    if (!result.ok) {
      setError(result.error);
    } else if (!result.data.success) {
      setError("Failed to load entries");
    } else {
      setEntries(result.data.data);
    }
    setLoading(false);
  }, [contentTypeId, locale]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Read initial parent value and subscribe to changes
  useEffect(() => {
    if (!parentField) return;
    const readParent = () => {
      const val = parentField.getValue() as { sys?: { id?: string } } | undefined;
      setCurrentParentId(val?.sys?.id ?? null);
    };
    readParent();
    const unsubscribe = parentField.onValueChanged(readParent);
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [parentField]);

  // Subscribe to fullPath field changes so the display is always in sync
  useEffect(() => {
    if (!fullPathField) return;
    const read = () => {
      const val = fullPathField.getValue() as string | undefined;
      setStoredFullPath(val ?? null);
    };
    read();
    const unsubscribe = fullPathField.onValueChanged(read);
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [fullPathField]);

  // Computed path based on current entries — uses entries with parentId kept in sync
  const computedPath = useMemo(() => {
    if (entries.length === 0) return null;
    return computeFullPath(entries, currentEntryId, homeSlug);
  }, [entries, currentEntryId, homeSlug]);

  // Breadcrumb — walk the parent chain in the flat list
  const breadcrumb = useMemo(() => {
    if (!currentParentId || entries.length === 0) return [];
    const chain: PageTreeEntry[] = [];
    const visited = new Set<string>();
    let id: string | null = currentParentId;
    while (id && !visited.has(id)) {
      visited.add(id);
      const entry = entries.find((e) => e.id === id);
      if (!entry) break;
      chain.unshift(entry);
      id = entry.parentId;
    }
    return chain;
  }, [currentParentId, entries]);

  const parentEntry = useMemo(
    () => entries.find((e) => e.id === currentParentId) ?? null,
    [entries, currentParentId]
  );

  const handleChangeParent = useCallback(async () => {
    const result = await sdk.dialogs.openCurrentApp({
      title: "Select parent page",
      width: 900,
      minHeight: 600,
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      parameters: {
        invocation: {
          currentEntryId,
          selectedEntryId: currentParentId,
        },
      },
    });

    if (!result || typeof result !== "object") return;
    const res = result as { selectedEntryId?: string };
    const newParentId = res.selectedEntryId ?? null;

    setSaving(true);
    try {
      if (!parentField) return;

      if (newParentId) {
        await parentField.setValue({
          sys: { type: "Link", linkType: "Entry", id: newParentId },
        });
      } else {
        await parentField.removeValue();
      }

      // Patch entries state so computedPath useMemo re-runs with the new parentId
      const updatedEntries = entries.map((e) =>
        e.id === currentEntryId ? { ...e, parentId: newParentId } : e
      );
      setEntries(updatedEntries);

      const newPath = computeFullPath(updatedEntries, currentEntryId, homeSlug);

      if (fullPathField && !newPath.includes("(cycle-detected)")) {
        await fullPathField.setValue(newPath);
        // storedFullPath will update via the onValueChanged subscription above
      }

      setCurrentParentId(newParentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save parent");
    } finally {
      setSaving(false);
    }
  }, [
    sdk,
    currentEntryId,
    currentParentId,
    parentField,
    fullPathField,
    entries,
    homeSlug,
  ]);

  const handleViewInTree = useCallback(() => {
    const appId = sdk.ids.app;
    if (!appId) return;
    (sdk.navigator as unknown as { openAppPage?: (opts: { id: string }) => void })
      .openAppPage?.({ id: appId });
  }, [sdk.navigator, sdk.ids.app]);

  if (!parentField) {
    return (
      <div className={styles.degraded}>
        <div className={styles.degradedTitle}>Page Tree</div>
        <div className={styles.degradedMessage}>
          The <code>{parentFieldName}</code> field is not available on this entry.
          Make sure the Page Tree app is installed on the correct content type.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Full Path</div>
        {loading ? (
          <div className={styles.loadingRow}>
            <div className={styles.spinner} />
            <span>Computing...</span>
          </div>
        ) : (
          <div className={styles.pathValue}>
            {computedPath ?? storedFullPath ?? <span className={styles.empty}>—</span>}
          </div>
        )}
      </div>

      {breadcrumb.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Breadcrumb</div>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbRoot}>/</span>
            {breadcrumb.map((entry, i) => (
              <span key={entry.id} className={styles.breadcrumbItem}>
                {i > 0 && <span className={styles.breadcrumbSep}>/</span>}
                <button
                  className={styles.breadcrumbLink}
                  onClick={() => sdk.navigator.openEntry(entry.id, { slideIn: true })}
                >
                  {entry.title}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Parent Page</div>
        {parentEntry ? (
          <div className={styles.parentCard}>
            <div className={styles.parentTitle}>{parentEntry.title}</div>
            <div className={styles.parentPath}>{parentEntry.slug}</div>
          </div>
        ) : (
          <div className={styles.empty}>No parent set (root page)</div>
        )}
        <button
          className={styles.btnPrimary}
          onClick={handleChangeParent}
          disabled={saving || loading}
          style={{ marginTop: 8 }}
        >
          {saving ? "Saving..." : "Change parent"}
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.section}>
        <button className={styles.btnSecondary} onClick={handleViewInTree}>
          View in tree
        </button>
      </div>
    </div>
  );
}

"use client";

import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAllEntries } from "../cma-service";
import { DEFAULT_FULLPATH_FIELD, DEFAULT_LOCALE, DEFAULT_PARENT_FIELD } from "../constants";
import type { PageTreeEntry, PageTreeInstallationParameters } from "../types";
import {
  computeFullPath,
  getConfigForType,
  resolveContentTypes,
} from "../utils";
import styles from "./page-tree-sidebar.module.css";

export default function PageTreeSidebar() {
  const sdk = useSDK<SidebarAppSDK>();

  const installParams = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;
  const contentTypeConfigs = resolveContentTypes(installParams);
  const locale = installParams.locale ?? DEFAULT_LOCALE;
  const homeSlug = installParams.homeSlug ?? "home";

  const currentEntryId = sdk.entry.getSys().id;
  const currentContentType = sdk.entry.getSys().contentType.sys.id;
  const currentConfig = getConfigForType(contentTypeConfigs, currentContentType);

  const parentFieldName = currentConfig.parentFieldName ?? DEFAULT_PARENT_FIELD;
  const fullPathFieldName = currentConfig.fullPathFieldName ?? DEFAULT_FULLPATH_FIELD;

  const parentField = sdk.entry.fields[parentFieldName];
  const fullPathField = sdk.entry.fields[fullPathFieldName];

  // Always include the current entry's type so the fetch returns it
  const allConfigs = useMemo(() => {
    const hasCurrentType = contentTypeConfigs.some(
      (c) => c.contentTypeId === currentContentType
    );
    if (hasCurrentType) return contentTypeConfigs;
    return [
      ...contentTypeConfigs,
      {
        contentTypeId: currentContentType,
        parentFieldName: parentFieldName,
        fullPathFieldName: fullPathFieldName,
        slugFieldName: currentConfig.slugFieldName,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(contentTypeConfigs), currentContentType]);

  // Stable key for configs to prevent infinite re-fetches
  const configsKey = useMemo(
    () => JSON.stringify(allConfigs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(allConfigs)]
  );

  const [entries, setEntries] = useState<PageTreeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [storedFullPath, setStoredFullPath] = useState<string | null>(null);
  const [fullPathReady, setFullPathReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  const slugField = sdk.entry.fields[currentConfig.slugFieldName ?? "slug"];

  // Live slug value — kept in sync via onValueChanged so path computation
  // always uses the latest slug, even on a brand-new entry.
  const [currentSlug, setCurrentSlug] = useState<string>(() => {
    return (slugField?.getValue() as string) ?? "";
  });

  useEffect(() => {
    if (!slugField) return;
    const read = () => setCurrentSlug((slugField.getValue() as string) ?? "");
    read();
    const unsubscribe = slugField.onValueChanged(read);
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [slugField]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fetched = await fetchAllEntries(sdk.cma, allConfigs, locale);
      // If the current entry isn't in the list (e.g. still a draft not yet
      // returned by CMA pagination), inject it from SDK data so path
      // computation works.
      if (!fetched.some((e) => e.id === currentEntryId)) {
        const parentVal = parentField?.getValue() as { sys?: { id?: string } } | undefined;
        fetched = [
          ...fetched,
          {
            id: currentEntryId,
            title: (sdk.entry.fields.title?.getValue() as string) ?? currentEntryId,
            slug: currentSlug,
            fullPath: null,
            parentId: parentVal?.sys?.id ?? null,
            contentTypeId: currentContentType,
            status: "draft" as const,
            updatedAt: new Date().toISOString(),
            publishedAt: null,
          },
        ];
      }
      setEntries(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configsKey, locale, currentEntryId, currentContentType, currentSlug, parentField, sdk.cma, sdk.entry.fields]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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

  useEffect(() => {
    if (!fullPathField) return;
    const read = () => {
      const val = fullPathField.getValue() as string | undefined;
      setStoredFullPath(val ?? null);
      setFullPathReady(true);
    };
    read();
    const unsubscribe = fullPathField.onValueChanged(read);
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [fullPathField]);

  // Patch the current entry's parentId and slug with live SDK values so
  // computeFullPath always reflects real-time state, not the potentially
  // stale values from the last CMA fetch (critical for new entries).
  const liveEntries = useMemo(() => {
    if (entries.length === 0) return entries;
    return entries.map((e) =>
      e.id === currentEntryId
        ? { ...e, parentId: currentParentId, slug: currentSlug || e.slug }
        : e
    );
  }, [entries, currentEntryId, currentParentId, currentSlug]);

  const computedPath = useMemo(() => {
    if (liveEntries.length === 0) return null;
    return computeFullPath(liveEntries, currentEntryId, homeSlug);
  }, [liveEntries, currentEntryId, homeSlug]);

  // Track previous parentId so we can detect external parent changes
  // (e.g. user edits the parent field directly in the entry editor)
  // and keep fullPath in sync. We use the SDK field API (not CMA update)
  // to avoid version conflicts with the editor's auto-save.
  const prevParentIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const isInitialMount = prevParentIdRef.current === undefined;
    const parentChanged = !isInitialMount && prevParentIdRef.current !== currentParentId;
    prevParentIdRef.current = currentParentId;

    if (!parentChanged || saving || liveEntries.length === 0) return;

    // Recompute fullPath locally and set via SDK field API
    const newPath = computeFullPath(liveEntries, currentEntryId, homeSlug);
    if (
      fullPathField &&
      newPath &&
      newPath !== "/unknown" &&
      !newPath.includes("(cycle-detected)")
    ) {
      fullPathField.setValue(newPath);
    }
  }, [currentParentId, currentEntryId, homeSlug, saving, liveEntries, fullPathField]);

  // Write the fullPath field when the computed path changes, but only
  // after we've read the initial stored value (prevents race condition
  // where a stale computed path overwrites a correct stored value).
  useEffect(() => {
    if (
      !fullPathField ||
      !fullPathReady ||
      !computedPath ||
      computedPath === "/unknown" ||
      computedPath.includes("(cycle-detected)")
    )
      return;

    if (computedPath !== storedFullPath) {
      fullPathField.setValue(computedPath);
    }
  }, [computedPath, storedFullPath, fullPathField, fullPathReady]);

  const breadcrumb = useMemo(() => {
    if (!currentParentId || liveEntries.length === 0) return [];
    const chain: PageTreeEntry[] = [];
    const visited = new Set<string>();
    let id: string | null = currentParentId;
    while (id && !visited.has(id)) {
      visited.add(id);
      const entry = liveEntries.find((e) => e.id === id);
      if (!entry) break;
      chain.unshift(entry);
      id = entry.parentId;
    }
    return chain;
  }, [currentParentId, liveEntries]);

  const children = useMemo(
    () => liveEntries.filter((e) => e.parentId === currentEntryId),
    [liveEntries, currentEntryId]
  );

  const parentEntry = useMemo(
    () => liveEntries.find((e) => e.id === currentParentId) ?? null,
    [liveEntries, currentParentId]
  );

  const handleChangeParent = useCallback(async () => {
    const result = await sdk.dialogs.openCurrentApp({
      title: "Select parent page",
      width: 900,
      minHeight: 600,
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      parameters: {
        currentEntryId,
        selectedEntryId: currentParentId,
      },
    });

    if (!result || typeof result !== "object") return;
    const res = result as { selectedEntryId?: string | null };
    const newParentId = res.selectedEntryId ?? null;

    if (newParentId === currentParentId) return;

    setSaving(true);
    try {
      if (!parentField) return;

      // 1. Set parent via SDK field API (editor handles persistence)
      if (newParentId) {
        await parentField.setValue({
          sys: { type: "Link", linkType: "Entry", id: newParentId },
        });
      } else {
        await parentField.removeValue();
      }

      // 2. Update local entries for immediate path computation
      const updatedEntries = liveEntries.map((e) =>
        e.id === currentEntryId ? { ...e, parentId: newParentId } : e
      );
      setEntries(updatedEntries);

      // 3. Compute and set fullPath via SDK field API
      const newPath = computeFullPath(updatedEntries, currentEntryId, homeSlug);
      if (fullPathField && !newPath.includes("(cycle-detected)")) {
        await fullPathField.setValue(newPath);
      }

      setCurrentParentId(newParentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save parent");
    } finally {
      setSaving(false);
    }
  }, [
    sdk.dialogs,
    currentEntryId,
    currentParentId,
    parentField,
    fullPathField,
    liveEntries,
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
          Make sure the Page Tree app is configured for content type <code>{currentContentType}</code>.
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
            <div className={styles.parentPath}>
              {parentEntry.slug}
              <span className={styles.parentType}>{parentEntry.contentTypeId}</span>
            </div>
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

      {children.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Children ({children.length})</div>
          <div className={styles.childrenList}>
            {children.slice(0, 10).map((child) => (
              <button
                key={child.id}
                className={styles.childItem}
                onClick={() => sdk.navigator.openEntry(child.id, { slideIn: true })}
              >
                <span className={styles.childTitle}>{child.title}</span>
                <span className={styles.childSlug}>/{child.slug}</span>
              </button>
            ))}
            {children.length > 10 && (
              <div className={styles.childOverflow}>
                +{children.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.section}>
        <button className={styles.btnSecondary} onClick={handleViewInTree}>
          View in tree
        </button>
      </div>
    </div>
  );
}

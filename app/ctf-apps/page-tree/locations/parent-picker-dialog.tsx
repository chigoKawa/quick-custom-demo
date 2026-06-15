"use client";

import type { DialogAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getBadgeColour, DEFAULT_LOCALE } from "../constants";
import { fetchAllEntries } from "../cma-service";
import type { PageTreeInstallationParameters, PageTreeEntry, PageTreeNode } from "../types";
import { buildTree, computeFullPath, getInitials, resolveContentTypes } from "../utils";
import styles from "./parent-picker-dialog.module.css";

interface InvocationParams {
  currentEntryId: string;
  selectedEntryId: string | null;
}

function collectDescendantIds(
  nodeMap: Map<string, PageTreeNode>,
  entryId: string
): Set<string> {
  const result = new Set<string>();
  const queue = [entryId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (!node) continue;
    for (const child of node.children) {
      if (!result.has(child.id)) {
        result.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return result;
}

export default function ParentPickerDialog() {
  const sdk = useSDK<DialogAppSDK>();

  const installParams = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;
  const rawInvocation = (sdk.parameters as unknown as { invocation?: InvocationParams }).invocation;
  const invocation: InvocationParams = rawInvocation && typeof rawInvocation === "object"
    ? {
        currentEntryId: rawInvocation.currentEntryId ?? "",
        selectedEntryId: rawInvocation.selectedEntryId ?? null,
      }
    : { currentEntryId: "", selectedEntryId: null };

  const contentTypeConfigs = resolveContentTypes(installParams);
  const locale = installParams.locale ?? DEFAULT_LOCALE;
  const homeSlug = installParams.homeSlug ?? "home";

  // Stable key for configs to prevent infinite re-fetches
  const configsKey = useMemo(
    () => JSON.stringify(contentTypeConfigs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(contentTypeConfigs)]
  );

  const [entries, setEntries] = useState<PageTreeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(invocation.selectedEntryId);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllEntries(sdk.cma, contentTypeConfigs, locale);
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load entries");
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configsKey, locale, sdk.cma]);

  const excludedIds = useMemo(() => {
    const { roots, orphans } = buildTree(entries, homeSlug);
    const map = new Map<string, PageTreeNode>();
    const flatten = (node: PageTreeNode) => {
      map.set(node.id, node);
      for (const c of node.children) flatten(c);
    };
    for (const r of roots) flatten(r);
    for (const o of orphans) flatten(o);

    const excluded = new Set<string>();
    excluded.add(invocation.currentEntryId);
    const descendants = collectDescendantIds(map, invocation.currentEntryId);
    for (const id of descendants) excluded.add(id);

    return excluded;
  }, [entries, homeSlug, invocation.currentEntryId]);

  // All entries with computed paths; excluded ones are marked disabled
  const selectableEntries = useMemo(() => {
    return entries
      .map((e) => ({
        ...e,
        computedPath: computeFullPath(entries, e.id, homeSlug),
        disabled: excludedIds.has(e.id),
      }))
      .filter((e) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.computedPath.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.computedPath.localeCompare(b.computedPath);
      });
  }, [entries, excludedIds, homeSlug, search]);

  const handleConfirm = useCallback(() => {
    if (!selectedId) {
      (sdk as unknown as { close: (v: unknown) => void }).close(null);
      return;
    }
    (sdk as unknown as { close: (v: unknown) => void }).close({ selectedEntryId: selectedId });
  }, [sdk, selectedId]);

  const handleRemoveParent = useCallback(() => {
    (sdk as unknown as { close: (v: unknown) => void }).close({ selectedEntryId: null });
  }, [sdk]);

  const handleCancel = useCallback(() => {
    (sdk as unknown as { close: (v: unknown) => void }).close(null);
  }, [sdk]);

  const getBadgeStyle = (ctId: string) => {
    const colours = getBadgeColour(ctId);
    return { background: colours.bg, color: colours.text };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Select Parent Page</h2>
        <input
          className={styles.search}
          type="text"
          placeholder="Search by title or path..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.listWrapper}>
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading pages...</span>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <div className={styles.errorTitle}>Error loading pages</div>
            <div className={styles.errorMessage}>{error}</div>
          </div>
        )}

        {!loading && !error && selectableEntries.length === 0 && (
          <div className={styles.emptyState}>
            {search ? "No pages match your search." : "No pages available."}
          </div>
        )}

        {!loading && !error && selectableEntries.length > 0 && (
          <div className={styles.list}>
            {selectableEntries.map((entry) => {
              const isSelected = selectedId === entry.id;
              const isDisabled = entry.disabled;
              return (
                <div
                  key={entry.id}
                  className={`${styles.listRow} ${isSelected ? styles.listRowSelected : ""} ${isDisabled ? styles.listRowDisabled : ""}`}
                  onClick={() => {
                    if (isDisabled) return;
                    setSelectedId(isSelected ? null : entry.id);
                  }}
                >
                  <span
                    className={styles.initials}
                    style={isDisabled ? { background: "#f3f4f6", color: "#9ca3af" } : getBadgeStyle(entry.contentTypeId)}
                  >
                    {getInitials(entry.contentTypeId)}
                  </span>
                  <div className={styles.listRowContent}>
                    <div className={styles.listRowTitle}>
                      {entry.title}
                      {entry.id === invocation.currentEntryId && (
                        <span className={styles.currentBadge}>current</span>
                      )}
                    </div>
                    <div className={styles.listRowPath}>{entry.computedPath}</div>
                  </div>
                  {isSelected && <span className={styles.checkmark}>✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={handleCancel}>
          Cancel
        </button>
        {invocation.selectedEntryId && (
          <button className={styles.removeParentBtn} onClick={handleRemoveParent}>
            Set as root page
          </button>
        )}
        <button
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={!selectedId}
        >
          {selectedId ? "Confirm Selection" : "Select a page"}
        </button>
      </div>
    </div>
  );
}

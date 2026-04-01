"use client";

import type { EditorAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  BADGE_COLOURS,
  DEFAULT_CONTENT_TYPE_ID,
  DEFAULT_LOCALE,
} from "../constants";
import type {
  PageTreeEntry,
  PageTreeInstallationParameters,
  PageTreeNode,
} from "../types";
import { buildTree, fetchWithTimeout, getInitials } from "../utils";
import styles from "./page-tree-editor.module.css";

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: PageTreeEntry["status"] }) {
  const colour =
    status === "published" ? "#389e0d"
    : status === "draft"   ? "#d48806"
    :                        "#0066cc"; // changed
  return (
    <span
      className={styles.statusDot}
      style={{ background: colour }}
      title={status}
    />
  );
}

// ---------------------------------------------------------------------------
// Row action menu
// ---------------------------------------------------------------------------

interface RowActionsProps {
  node: PageTreeNode;
  onOpen: (id: string) => void;
  onNewChild: (parentId: string) => void;
  onChangeParent: (id: string, currentParentId: string | null) => void;
  siteBaseUrl?: string;
}

function RowActions({
  node,
  onOpen,
  onNewChild,
  onChangeParent,
  siteBaseUrl,
}: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className={styles.actionsWrap} ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        className={styles.actionsBtn}
        onClick={() => setOpen((v) => !v)}
        title="Actions"
      >
        •••
      </button>
      {open && (
        <div className={styles.actionsMenu}>
          <button
            className={styles.actionsItem}
            onClick={() => { setOpen(false); onOpen(node.id); }}
          >
            ✏️ Edit entry
          </button>
          <button
            className={styles.actionsItem}
            onClick={() => { setOpen(false); onNewChild(node.id); }}
          >
            ➕ Add child page
          </button>
          <button
            className={styles.actionsItem}
            onClick={() => { setOpen(false); onChangeParent(node.id, node.parentId); }}
          >
            🔀 Move (change parent)
          </button>
          {siteBaseUrl && (
            <a
              className={styles.actionsItemLink}
              href={siteBaseUrl.replace(/\/$/, "") + node.computedPath}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              ↗ View live
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recursive tree node
// ---------------------------------------------------------------------------

interface TreeNodeProps {
  node: PageTreeNode;
  expanded: Set<string>;
  highlightedId: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onNewChild: (parentId: string) => void;
  onChangeParent: (id: string, currentParentId: string | null) => void;
  siteBaseUrl?: string;
}

function TreeNode({
  node,
  expanded,
  highlightedId,
  onToggle,
  onOpen,
  onNewChild,
  onChangeParent,
  siteBaseUrl,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isHighlighted = node.id === highlightedId;
  const colours = BADGE_COLOURS[node.contentTypeId] ?? BADGE_COLOURS.default;

  return (
    <div className={styles.nodeWrap}>
      <div
        className={`${styles.nodeRow} ${isHighlighted ? styles.nodeRowHighlighted : ""}`}
        onClick={() => onOpen(node.id)}
      >
        <button
          className={styles.toggleBtn}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          disabled={!hasChildren}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {hasChildren ? (
            <span
              className={styles.toggleIcon}
              style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              ▶
            </span>
          ) : (
            <span className={styles.toggleLeaf}>—</span>
          )}
        </button>

        <span
          className={styles.typeBadge}
          style={{ background: colours.bg, color: colours.text }}
        >
          {getInitials(node.contentTypeId)}
        </span>

        <StatusDot status={node.status} />

        <span className={styles.nodeTitle}>{node.title}</span>

        <span className={styles.nodePath}>{node.computedPath}</span>

        {hasChildren && (
          <span className={styles.childCount} title={`${node.children.length} child page${node.children.length !== 1 ? "s" : ""}`}>
            {node.children.length}
          </span>
        )}

        <RowActions
          node={node}
          onOpen={onOpen}
          onNewChild={onNewChild}
          onChangeParent={onChangeParent}
          siteBaseUrl={siteBaseUrl}
        />
      </div>

      {/* Genuinely nested children */}
      {hasChildren && isExpanded && (
        <div className={styles.childrenWrap}>
          <div className={styles.guideLine} />
          <div className={styles.childrenContent}>
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                expanded={expanded}
                highlightedId={highlightedId}
                onToggle={onToggle}
                onOpen={onOpen}
                onNewChild={onNewChild}
                onChangeParent={onChangeParent}
                siteBaseUrl={siteBaseUrl}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

export default function PageTreeEditor() {
  const sdk = useSDK<EditorAppSDK>();

  const installParams = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;
  const contentTypeId = installParams.contentTypeId ?? DEFAULT_CONTENT_TYPE_ID;
  const locale = installParams.locale ?? DEFAULT_LOCALE;
  const siteBaseUrl = installParams.siteBaseUrl;

  // The entry currently open in the editor — highlight it in the tree
  const currentEntryId = sdk.entry.getSys().id;

  const [entries, setEntries] = useState<PageTreeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const initialExpandDone = useRef(false);

  // ----- Data loading -----

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchWithTimeout<{ success: boolean; data: PageTreeEntry[] }>(
      `/api/page-tree/entries?contentTypeId=${contentTypeId}&locale=${locale}`,
      {},
      15000
    );
    if (!result.ok) {
      setError(result.error);
    } else if (!result.data.success) {
      setError("API returned an error");
    } else {
      setEntries(result.data.data);
    }
    setLoading(false);
  }, [contentTypeId, locale]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const { roots, orphans } = useMemo(() => buildTree(entries), [entries]);

  // ----- Default expansion: depth 0+1, plus ancestors of current entry -----

  useEffect(() => {
    if (loading || initialExpandDone.current) return;
    initialExpandDone.current = true;

    const toExpand = new Set<string>();
    for (const root of roots) {
      toExpand.add(root.id);
      for (const child of root.children) toExpand.add(child.id);
    }

    // Walk up the parent chain so the current entry is visible
    let id: string | null = currentEntryId;
    const visited = new Set<string>();
    while (id && !visited.has(id)) {
      visited.add(id);
      const entry = entries.find((e) => e.id === id);
      if (!entry?.parentId) break;
      toExpand.add(entry.parentId);
      id = entry.parentId;
    }

    setExpanded(toExpand);
  }, [loading, roots, entries, currentEntryId]);

  // ----- Handlers -----

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (id: string) => sdk.navigator.openEntry(id, { slideIn: true }),
    [sdk.navigator]
  );

  const handleNewChild = useCallback(() => {
    if (sdk.navigator.openNewEntry) {
      sdk.navigator.openNewEntry(contentTypeId, { slideIn: true });
    }
  }, [sdk.navigator, contentTypeId]);

  const handleChangeParent = useCallback(
    async (entryId: string, currentParentId: string | null) => {
      const result = await sdk.dialogs.openCurrentApp({
        title: "Move page — select new parent",
        width: 900,
        minHeight: 600,
        shouldCloseOnOverlayClick: true,
        shouldCloseOnEscapePress: true,
        parameters: {
          invocation: { currentEntryId: entryId, selectedEntryId: currentParentId },
        },
      });

      if (!result || typeof result !== "object") return;
      const { selectedEntryId: newParentId = null } = result as { selectedEntryId?: string | null };

      setSaving(true);
      try {
        const res = await fetch("/api/page-tree/set-parent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId, parentId: newParentId, locale }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to move entry");
        await loadEntries();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move entry");
      } finally {
        setSaving(false);
      }
    },
    [sdk.dialogs, locale, loadEntries]
  );

  const handleExpandAll = useCallback(() => {
    const ids = new Set<string>();
    const traverse = (n: PageTreeNode) => { ids.add(n.id); n.children.forEach(traverse); };
    roots.forEach(traverse);
    setExpanded(ids);
  }, [roots]);

  const handleCollapseAll = useCallback(() => setExpanded(new Set()), []);

  // ----- Filter: flat list while searching -----

  const filteredNodes = useMemo<PageTreeNode[] | null>(() => {
    if (!filter.trim()) return null;
    const q = filter.toLowerCase();
    const all: PageTreeNode[] = [];
    const traverse = (n: PageTreeNode) => { all.push(n); n.children.forEach(traverse); };
    roots.forEach(traverse);
    orphans.forEach(traverse);
    return all.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.computedPath.toLowerCase().includes(q) ||
        n.slug.toLowerCase().includes(q)
    );
  }, [filter, roots, orphans]);

  // ----- Render -----

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>🌳 Page Tree</span>
          <span className={styles.countBadge}>{entries.length}</span>
          {saving && <span className={styles.savingLabel}>Saving…</span>}
        </div>
        <div className={styles.headerRight}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search pages…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {!filter && (
            <>
              <button className={styles.iconBtn} onClick={handleExpandAll} title="Expand all">⊞</button>
              <button className={styles.iconBtn} onClick={handleCollapseAll} title="Collapse all">⊟</button>
            </>
          )}
          <button className={styles.iconBtn} onClick={loadEntries} disabled={loading} title="Refresh">
            {loading ? "…" : "↻"}
          </button>
          <button className={styles.newBtn} onClick={handleNewChild}>
            + New page
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading tree…</span>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button className={styles.retryBtn} onClick={() => { setError(null); loadEntries(); }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className={styles.emptyState}>
            No {contentTypeId} entries found.
          </div>
        )}

        {/* Flat search results */}
        {!loading && !error && filteredNodes !== null && (
          filteredNodes.length === 0
            ? <div className={styles.emptyState}>No pages match &ldquo;{filter}&rdquo;</div>
            : <div className={styles.tree}>
                {filteredNodes.map((node) => {
                  const colours = BADGE_COLOURS[node.contentTypeId] ?? BADGE_COLOURS.default;
                  return (
                    <div
                      key={node.id}
                      className={`${styles.nodeRow} ${node.id === currentEntryId ? styles.nodeRowHighlighted : ""}`}
                      style={{ paddingLeft: 12 }}
                      onClick={() => handleOpen(node.id)}
                    >
                      <span className={styles.toggleLeaf}>—</span>
                      <span
                        className={styles.typeBadge}
                        style={{ background: colours.bg, color: colours.text }}
                      >
                        {getInitials(node.contentTypeId)}
                      </span>
                      <StatusDot status={node.status} />
                      <span className={styles.nodeTitle}>{node.title}</span>
                      <span className={styles.nodePath}>{node.computedPath}</span>
                      <RowActions
                        node={node}
                        onOpen={handleOpen}
                        onNewChild={handleNewChild}
                        onChangeParent={handleChangeParent}
                        siteBaseUrl={siteBaseUrl}
                      />
                    </div>
                  );
                })}
              </div>
        )}

        {/* Full nested tree */}
        {!loading && !error && filteredNodes === null && entries.length > 0 && (
          <div className={styles.tree}>
            {roots.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                expanded={expanded}
                highlightedId={currentEntryId}
                onToggle={handleToggle}
                onOpen={handleOpen}
                onNewChild={handleNewChild}
                onChangeParent={handleChangeParent}
                siteBaseUrl={siteBaseUrl}
              />
            ))}

            {orphans.length > 0 && (
              <div className={styles.orphanSection}>
                <div className={styles.orphanDivider}>
                  ⚠️ Orphaned pages ({orphans.length}) — parent not found in list
                </div>
                {orphans.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    expanded={expanded}
                    highlightedId={currentEntryId}
                    onToggle={handleToggle}
                    onOpen={handleOpen}
                    onNewChild={handleNewChild}
                    onChangeParent={handleChangeParent}
                    siteBaseUrl={siteBaseUrl}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

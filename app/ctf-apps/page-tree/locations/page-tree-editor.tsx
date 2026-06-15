"use client";

import type { EditorAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { memo, useCallback, useEffect, useRef, useMemo, useState } from "react";
import { fetchAllEntries, setEntryParent } from "../cma-service";
import {
  getBadgeColour,
  DEFAULT_LOCALE,
} from "../constants";
import type {
  PageTreeEntry,
  PageTreeInstallationParameters,
  PageTreeNode,
} from "../types";
import { useDebouncedValue } from "../use-debounced-value";
import { buildTree, computeFullPath, countDescendants, getConfigForType, getInitials, resolveContentTypes, timeAgo, type TreeSortMode } from "../utils";
import Pagination, { DEFAULT_PAGE_SIZE } from "./pagination";
import { TreeSkeleton } from "./skeleton";
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

const RowActions = memo(function RowActions({
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
});

// ---------------------------------------------------------------------------
// Recursive tree node
// ---------------------------------------------------------------------------

interface TreeNodeProps {
  node: PageTreeNode;
  expanded: Set<string>;
  highlightedId: string;
  focusedId: string | null;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onNewChild: (parentId: string) => void;
  onChangeParent: (id: string, currentParentId: string | null) => void;
  siteBaseUrl?: string;
}

const TreeNode = memo(function TreeNode({
  node,
  expanded,
  highlightedId,
  focusedId,
  onToggle,
  onOpen,
  onNewChild,
  onChangeParent,
  siteBaseUrl,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isHighlighted = node.id === highlightedId;
  const isFocused = node.id === focusedId;
  const colours = getBadgeColour(node.contentTypeId);

  return (
    <div className={styles.nodeWrap}>
      <div
        data-tree-row
        className={`${styles.nodeRow} ${isHighlighted ? styles.nodeRowHighlighted : ""} ${isFocused ? styles.nodeRowFocused : ""}`}
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

        <span className={styles.timeLabel} title={node.updatedAt}>
          {timeAgo(node.updatedAt)}
        </span>

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
                focusedId={focusedId}
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
});

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

export default function PageTreeEditor() {
  const sdk = useSDK<EditorAppSDK>();

  const installParams = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;
  const contentTypeConfigs = resolveContentTypes(installParams);
  const locale = installParams.locale ?? DEFAULT_LOCALE;
  const homeSlug = installParams.homeSlug ?? "home";
  const siteBaseUrl = installParams.siteBaseUrl;

  const currentEntryId = sdk.entry.getSys().id;

  // Stable key for configs to prevent infinite re-fetches
  const configsKey = useMemo(
    () => JSON.stringify(contentTypeConfigs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(contentTypeConfigs)]
  );

  const [entries, setEntries] = useState<PageTreeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebouncedValue(filter, 250);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortMode, setSortMode] = useState<TreeSortMode>("recent");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const treeRef = useRef<HTMLDivElement>(null);
  const initialExpandDone = useRef(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllEntries(sdk.cma, contentTypeConfigs, locale);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configsKey, locale, sdk.cma]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const { roots, orphans } = useMemo(() => buildTree(entries, homeSlug, sortMode), [entries, homeSlug, sortMode]);

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

  const handleNewChild = useCallback((parentId?: string) => {
    const firstType = contentTypeConfigs[0]?.contentTypeId ?? "landingPage";
    if (sdk.navigator.openNewEntry) {
      sdk.navigator.openNewEntry(firstType, { slideIn: true });
    }
    // After the entry is created, set its parent if parentId was provided.
    // The Contentful SDK doesn't support initial field values on openNewEntry,
    // but we store it so the sidebar can pick it up via a dialog parameter.
    if (parentId) {
      setTimeout(() => {
        // Best-effort: reload entries after a brief delay to pick up the new entry
        loadEntries();
      }, 2000);
    }
  }, [sdk.navigator, contentTypeConfigs, loadEntries]);

  const [toast, setToast] = useState<string | null>(null);

  const handleChangeParent = useCallback(
    async (entryId: string, currentParentId: string | null) => {
      const result = await sdk.dialogs.openCurrentApp({
        title: "Move page — select new parent",
        width: 900,
        minHeight: 600,
        shouldCloseOnOverlayClick: true,
        shouldCloseOnEscapePress: true,
        parameters: {
          currentEntryId: entryId,
          selectedEntryId: currentParentId,
        },
      });

      if (!result || typeof result !== "object") return;
      const { selectedEntryId: newParentId = null } = result as { selectedEntryId?: string | null };

      if (newParentId === currentParentId) return;

      // Confirmation for entries with descendants
      const descendantCount = countDescendants(entries, entryId);
      if (descendantCount > 0) {
        const entryTitle = entries.find((e) => e.id === entryId)?.title ?? "this page";
        const confirmed = window.confirm(
          `Move "${entryTitle}" and update paths for ${descendantCount} descendant${descendantCount !== 1 ? "s" : ""}?`
        );
        if (!confirmed) return;
      }

      setSaving(true);
      setToast(null);
      try {
        const entry = entries.find((e) => e.id === entryId);
        const cfg = entry
          ? getConfigForType(contentTypeConfigs, entry.contentTypeId)
          : contentTypeConfigs[0];

        if (entryId === currentEntryId) {
          const pField = sdk.entry.fields[cfg?.parentFieldName ?? "parent"];
          const fpField = sdk.entry.fields[cfg?.fullPathFieldName ?? "fullPath"];
          if (pField) {
            if (newParentId) {
              await pField.setValue({ sys: { type: "Link", linkType: "Entry", id: newParentId } });
            } else {
              await pField.removeValue();
            }
          }
          const updatedEntries = entries.map((e) =>
            e.id === entryId ? { ...e, parentId: newParentId } : e
          );
          const newPath = computeFullPath(updatedEntries, entryId, homeSlug);
          if (fpField && !newPath.includes("(cycle-detected)")) {
            await fpField.setValue(newPath);
          }
        } else {
          const moveResult = await setEntryParent(sdk.cma, {
            entryId,
            parentId: newParentId,
            locale,
            parentFieldName: cfg?.parentFieldName,
            fullPathFieldName: cfg?.fullPathFieldName,
            slugFieldName: cfg?.slugFieldName,
            homeSlug,
            allEntries: entries,
          });

          const prop = moveResult.propagation;
          if (prop && prop.total > 0) {
            if (prop.failed > 0) {
              setToast(`Moved. Updated ${prop.updated}/${prop.total} descendant paths (${prop.failed} failed).`);
            } else {
              setToast(`Moved. Updated ${prop.updated} descendant path${prop.updated !== 1 ? "s" : ""}.`);
            }
            setTimeout(() => setToast(null), 5000);
          }
        }

        setEntries((prev) => {
          const patched = prev.map((e) =>
            e.id === entryId ? { ...e, parentId: newParentId } : e
          );
          const newPath = computeFullPath(patched, entryId, homeSlug);
          return patched.map((e) =>
            e.id === entryId ? { ...e, fullPath: newPath } : e
          );
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move entry");
      } finally {
        setSaving(false);
      }
    },
    [sdk.dialogs, sdk.cma, sdk.entry.fields, locale, entries, contentTypeConfigs, currentEntryId, homeSlug]
  );

  const handleExpandAll = useCallback(() => {
    const ids = new Set<string>();
    const traverse = (n: PageTreeNode) => { ids.add(n.id); n.children.forEach(traverse); };
    roots.forEach(traverse);
    setExpanded(ids);
    setCurrentPage(1);
  }, [roots]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
    setCurrentPage(1);
  }, []);

  // ----- Filter: flat list while searching -----

  const filteredNodes = useMemo<PageTreeNode[] | null>(() => {
    if (!debouncedFilter.trim()) return null;
    const q = debouncedFilter.toLowerCase();
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
  }, [debouncedFilter, roots, orphans]);

  // ----- Pagination -----

  const allRootsAndOrphans = useMemo(() => [...roots, ...orphans], [roots, orphans]);
  const paginationTotal = filteredNodes !== null ? filteredNodes.length : allRootsAndOrphans.length;

  const paginatedRoots = useMemo(() => {
    if (filteredNodes !== null) return [];
    const start = (currentPage - 1) * pageSize;
    return allRootsAndOrphans.slice(start, start + pageSize);
  }, [filteredNodes, allRootsAndOrphans, currentPage, pageSize]);

  const paginatedFilteredNodes = useMemo(() => {
    if (filteredNodes === null) return [];
    const start = (currentPage - 1) * pageSize;
    return filteredNodes.slice(start, start + pageSize);
  }, [filteredNodes, currentPage, pageSize]);

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // ----- Keyboard navigation -----

  const visibleNodeIds = useMemo(() => {
    if (filteredNodes !== null) {
      return paginatedFilteredNodes.map((n) => n.id);
    }
    const ids: string[] = [];
    const collect = (node: PageTreeNode) => {
      ids.push(node.id);
      if (expanded.has(node.id)) {
        for (const child of node.children) collect(child);
      }
    };
    for (const root of paginatedRoots) collect(root);
    return ids;
  }, [filteredNodes, paginatedFilteredNodes, paginatedRoots, expanded]);

  useEffect(() => {
    const el = treeRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visibleNodeIds.length) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIdx((prev) => Math.min(prev + 1, visibleNodeIds.length - 1));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setFocusedIdx((prev) => Math.max(prev - 1, 0));
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const id = visibleNodeIds[focusedIdx];
          if (id && !expanded.has(id)) {
            setExpanded((prev) => new Set([...prev, id]));
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const id = visibleNodeIds[focusedIdx];
          if (id && expanded.has(id)) {
            setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          const id = visibleNodeIds[focusedIdx];
          if (id) handleOpen(id);
          break;
        }
        case " ": {
          e.preventDefault();
          const id = visibleNodeIds[focusedIdx];
          if (id) handleToggle(id);
          break;
        }
      }
    };

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [visibleNodeIds, focusedIdx, expanded, handleOpen, handleToggle]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIdx < 0) return;
    const el = treeRef.current;
    if (!el) return;
    const rows = el.querySelectorAll(`[data-tree-row]`);
    rows[focusedIdx]?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

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
            onChange={(e) => handleFilterChange(e.target.value)}
          />
          {!filter && (
            <>
              <button className={styles.iconBtn} onClick={handleExpandAll} title="Expand all">⊞</button>
              <button className={styles.iconBtn} onClick={handleCollapseAll} title="Collapse all">⊟</button>
            </>
          )}
          <button
            className={styles.iconBtn}
            onClick={() => setSortMode((m) => (m === "recent" ? "alpha" : "recent"))}
            title={sortMode === "recent" ? "Sorted by recent — click for A-Z" : "Sorted A-Z — click for recent"}
          >
            {sortMode === "recent" ? "🕑" : "🔤"}
          </button>
          <button className={styles.iconBtn} onClick={loadEntries} disabled={loading} title="Refresh">
            {loading ? "…" : "↻"}
          </button>
          <button className={styles.newBtn} onClick={() => handleNewChild()}>
            + New page
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={styles.toast}>{toast}</div>
      )}

      {/* Body */}
      <div className={styles.body} ref={treeRef} tabIndex={0}>
        {loading && <TreeSkeleton rows={10} />}

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
            No entries found.
          </div>
        )}

        {/* Flat search results */}
        {!loading && !error && filteredNodes !== null && (
          filteredNodes.length === 0
            ? <div className={styles.emptyState}>No pages match &ldquo;{filter}&rdquo;</div>
            : <div className={styles.tree}>
                {paginatedFilteredNodes.map((node) => {
                  const colours = getBadgeColour(node.contentTypeId);
                  const isFocused = visibleNodeIds[focusedIdx] === node.id;
                  return (
                    <div
                      key={node.id}
                      data-tree-row
                      className={`${styles.nodeRow} ${node.id === currentEntryId ? styles.nodeRowHighlighted : ""} ${isFocused ? styles.nodeRowFocused : ""}`}
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

        {/* Full nested tree (paginated by root nodes) */}
        {!loading && !error && filteredNodes === null && entries.length > 0 && (
          <div className={styles.tree}>
            {paginatedRoots.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                expanded={expanded}
                highlightedId={currentEntryId}
                focusedId={visibleNodeIds[focusedIdx] ?? null}
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

      {!loading && !error && paginationTotal > 0 && (
        <Pagination
          totalItems={paginationTotal}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

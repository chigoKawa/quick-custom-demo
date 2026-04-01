"use client";

import type { PageAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BADGE_COLOURS,
  DEFAULT_CONTENT_TYPE_ID,
  DEFAULT_LOCALE,
} from "../constants";
import type { PageTreeEntry, PageTreeInstallationParameters, PageTreeNode } from "../types";
import { buildTree, fetchWithTimeout, getInitials } from "../utils";
import styles from "./page-tree-page.module.css";

function StatusBadge({ status }: { status: PageTreeEntry["status"] }) {
  const colours: Record<string, { bg: string; text: string }> = {
    published: { bg: "#f6ffed", text: "#389e0d" },
    draft:     { bg: "#fffbe6", text: "#d48806" },
    changed:   { bg: "#e6f4ff", text: "#0066cc" },
  };
  const c = colours[status] ?? colours.published;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        padding: "1px 7px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        flexShrink: 0,
      }}
    >
      {status}
    </span>
  );
}

function collectAllIds(nodes: PageTreeNode[]): Set<string> {
  const ids = new Set<string>();
  const traverse = (node: PageTreeNode) => {
    ids.add(node.id);
    for (const c of node.children) traverse(c);
  };
  for (const n of nodes) traverse(n);
  return ids;
}

function flattenVisible(
  nodes: PageTreeNode[],
  expanded: Set<string>
): PageTreeNode[] {
  const result: PageTreeNode[] = [];
  const traverse = (node: PageTreeNode) => {
    result.push(node);
    if (expanded.has(node.id)) {
      for (const c of node.children) traverse(c);
    }
  };
  for (const n of nodes) traverse(n);
  return result;
}

interface TreeRowProps {
  node: PageTreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  isOrphan?: boolean;
  siteBaseUrl?: string;
}

function TreeRow({ node, expanded, onToggle, onOpen, isOrphan, siteBaseUrl }: TreeRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const badgeColours = BADGE_COLOURS[node.contentTypeId] ?? BADGE_COLOURS.default;

  return (
    <div
      className={styles.treeRow}
      style={{ paddingLeft: node.depth * 24 + 12 }}
    >
      <span className={styles.dragHandle}>≡</span>

      <button
        className={styles.toggleBtn}
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggle(node.id);
        }}
        disabled={!hasChildren}
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        {hasChildren ? (isExpanded ? "▼" : "▶") : <span style={{ opacity: 0 }}>▶</span>}
      </button>

      <span
        className={styles.typeBadge}
        style={{ background: badgeColours.bg, color: badgeColours.text }}
      >
        {getInitials(node.contentTypeId)}
      </span>

      <button
        className={styles.titleBtn}
        onClick={() => onOpen(node.id)}
      >
        {node.title}
      </button>

      <span className={styles.pathLabel}>{node.computedPath}</span>

      <StatusBadge status={node.status} />

      <span className={styles.ctLabel}>{node.contentTypeId}</span>

      {isOrphan && (
        <span className={styles.orphanBadge}>orphan</span>
      )}

      {siteBaseUrl && (
        <a
          className={styles.liveLink}
          href={siteBaseUrl.replace(/\/$/, "") + node.computedPath}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          ↗
        </a>
      )}
    </div>
  );
}

export default function PageTreePage() {
  const sdk = useSDK<PageAppSDK>();

  const installParams = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;
  const contentTypeId = installParams.contentTypeId ?? DEFAULT_CONTENT_TYPE_ID;
  const locale = installParams.locale ?? DEFAULT_LOCALE;
  const siteBaseUrl = installParams.siteBaseUrl;

  const [entries, setEntries] = useState<PageTreeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const initialExpandDone = useRef(false);

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

  // Default expand depth 0 and 1 on first load
  useEffect(() => {
    if (loading || initialExpandDone.current) return;
    initialExpandDone.current = true;

    const toExpand = new Set<string>();
    for (const root of roots) {
      toExpand.add(root.id);
      for (const child of root.children) {
        toExpand.add(child.id);
      }
    }
    setExpanded(toExpand);
  }, [loading, roots]);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (id: string) => {
      sdk.navigator.openEntry(id, { slideIn: true });
    },
    [sdk.navigator]
  );

  const handleNewPage = useCallback(() => {
    if (sdk.navigator.openNewEntry) {
      sdk.navigator.openNewEntry(contentTypeId, { slideIn: true });
    }
  }, [sdk.navigator, contentTypeId]);

  const handleExpandAll = useCallback(() => {
    const allIds = collectAllIds(roots);
    setExpanded(allIds);
  }, [roots]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // Filtered flat list (no tree structure when searching)
  const filteredFlat = useMemo(() => {
    if (!filter.trim()) return null;
    const q = filter.toLowerCase();
    return entries
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.fullPath ?? "").toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q)
      )
      .map((e) => {
        const node = roots
          .flatMap((r) => {
            const flat: PageTreeNode[] = [];
            const traverse = (n: PageTreeNode) => { flat.push(n); n.children.forEach(traverse); };
            traverse(r);
            return flat;
          })
          .find((n) => n.id === e.id);
        return node ?? ({ ...e, children: [], depth: 0, computedPath: "/" + e.slug } as PageTreeNode);
      });
  }, [filter, entries, roots]);

  const visibleNodes = useMemo(() => {
    if (filteredFlat) return filteredFlat;
    return flattenVisible(roots, expanded);
  }, [filteredFlat, roots, expanded]);

  const visibleOrphans = useMemo(() => {
    if (filteredFlat) return [];
    return orphans;
  }, [filteredFlat, orphans]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>🌳 Page Tree</h1>
          <span className={styles.entryCount}>{entries.length} pages</span>
        </div>
        <div className={styles.headerRight}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search pages..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {!filter && (
            <>
              <button className={styles.btnIcon} onClick={handleExpandAll} title="Expand all">
                ⊞
              </button>
              <button className={styles.btnIcon} onClick={handleCollapseAll} title="Collapse all">
                ⊟
              </button>
            </>
          )}
          <button className={styles.btnRefresh} onClick={loadEntries} disabled={loading}>
            {loading ? "..." : "Refresh"}
          </button>
          <button className={styles.btnNew} onClick={handleNewPage}>
            + New page
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className={styles.colHeaders}>
        <span style={{ flex: 1, minWidth: 0 }}>Title</span>
        <span className={styles.colPath}>Path</span>
        <span className={styles.colStatus}>Status</span>
        <span className={styles.colType}>Type</span>
      </div>

      {/* Content */}
      <div className={styles.treeBody}>
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
            <button className={styles.btnRefresh} onClick={loadEntries} style={{ marginTop: 8 }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className={styles.emptyState}>
            No {contentTypeId} entries found.
          </div>
        )}

        {!loading && !error && visibleNodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            expanded={expanded}
            onToggle={handleToggle}
            onOpen={handleOpen}
            siteBaseUrl={siteBaseUrl}
          />
        ))}

        {/* Orphans section */}
        {!loading && !error && visibleOrphans.length > 0 && (
          <>
            <div className={styles.orphanDivider}>
              <hr className={styles.orphanHr} />
              <div className={styles.orphanHeader}>
                ⚠️ Orphaned pages ({visibleOrphans.length}) — parent not found in this list
              </div>
            </div>
            {visibleOrphans.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                expanded={expanded}
                onToggle={handleToggle}
                onOpen={handleOpen}
                isOrphan
                siteBaseUrl={siteBaseUrl}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

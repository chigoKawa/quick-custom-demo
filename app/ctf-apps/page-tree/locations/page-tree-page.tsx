"use client";

import type { PageAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BADGE_COLOURS,
  DEFAULT_LOCALE,
} from "../constants";
import { fetchAllEntries } from "../cma-service";
import type { PageTreeEntry, PageTreeInstallationParameters, PageTreeNode } from "../types";
import { useDebouncedValue } from "../use-debounced-value";
import { buildTree, getInitials, resolveContentTypes } from "../utils";
import Pagination, { DEFAULT_PAGE_SIZE } from "./pagination";
import { TableSkeleton } from "./skeleton";
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

const TreeRow = memo(function TreeRow({ node, expanded, onToggle, onOpen, isOrphan, siteBaseUrl }: TreeRowProps) {
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
});

export default function PageTreePage() {
  const sdk = useSDK<PageAppSDK>();

  const installParams = (sdk.parameters.installation ?? {}) as PageTreeInstallationParameters;
  const contentTypeConfigs = resolveContentTypes(installParams);
  const locale = installParams.locale ?? DEFAULT_LOCALE;
  const homeSlug = installParams.homeSlug ?? "home";
  const siteBaseUrl = installParams.siteBaseUrl;

  const showTabs = contentTypeConfigs.length > 1;

  // Stable key for configs to prevent infinite re-fetches
  const configsKey = useMemo(
    () => JSON.stringify(contentTypeConfigs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(contentTypeConfigs)]
  );

  const [allEntries, setAllEntries] = useState<PageTreeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebouncedValue(filter, 250);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const initialExpandDone = useRef(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllEntries(sdk.cma, contentTypeConfigs, locale);
      setAllEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configsKey, locale, sdk.cma]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Filter entries for the active tab. For per-type tabs, entries whose
  // parent is of a different type are promoted to root (parentId → null).
  const entries = useMemo(() => {
    if (activeTab === "all") return allEntries;
    const typeEntries = allEntries.filter((e) => e.contentTypeId === activeTab);
    const idSet = new Set(typeEntries.map((e) => e.id));
    return typeEntries.map((e) =>
      e.parentId && !idSet.has(e.parentId) ? { ...e, parentId: null } : e
    );
  }, [allEntries, activeTab]);

  const { roots, orphans } = useMemo(() => buildTree(entries, homeSlug), [entries, homeSlug]);

  // Per-type counts for tab badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allEntries) {
      counts[e.contentTypeId] = (counts[e.contentTypeId] ?? 0) + 1;
    }
    return counts;
  }, [allEntries]);

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

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setFilter("");
    setExpanded(new Set());
    setCurrentPage(1);
    initialExpandDone.current = false;
  }, []);

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

  const newPageType = activeTab !== "all" ? activeTab : contentTypeConfigs[0]?.contentTypeId ?? "landingPage";
  const handleNewPage = useCallback(() => {
    if (sdk.navigator.openNewEntry) {
      sdk.navigator.openNewEntry(newPageType, { slideIn: true });
    }
  }, [sdk.navigator, newPageType]);

  const handleExpandAll = useCallback(() => {
    const allIds = collectAllIds(roots);
    setExpanded(allIds);
    setCurrentPage(1);
  }, [roots]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
    setCurrentPage(1);
  }, []);

  // Filtered flat list (no tree structure when searching)
  const filteredFlat = useMemo(() => {
    if (!debouncedFilter.trim()) return null;
    const q = debouncedFilter.toLowerCase();
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
  }, [debouncedFilter, entries, roots]);

  const visibleNodes = useMemo(() => {
    if (filteredFlat) return filteredFlat;
    return flattenVisible(roots, expanded);
  }, [filteredFlat, roots, expanded]);

  const visibleOrphans = useMemo(() => {
    if (filteredFlat) return [];
    return orphans;
  }, [filteredFlat, orphans]);

  // Combine main nodes + orphans into one list for unified pagination
  const allVisibleNodes = useMemo(() => {
    return [...visibleNodes, ...visibleOrphans];
  }, [visibleNodes, visibleOrphans]);

  const totalVisible = allVisibleNodes.length;
  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allVisibleNodes.slice(start, start + pageSize);
  }, [allVisibleNodes, currentPage, pageSize]);

  // Determine which paginated nodes are orphans for badge display
  const orphanIdSet = useMemo(
    () => new Set(visibleOrphans.map((n) => n.id)),
    [visibleOrphans]
  );

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

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
            onChange={(e) => handleFilterChange(e.target.value)}
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
            + New {activeTab !== "all" ? activeTab : "page"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      {showTabs && (
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === "all" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("all")}
          >
            All
            <span className={styles.tabCount}>{allEntries.length}</span>
          </button>
          {contentTypeConfigs.map((c) => {
            const colours = BADGE_COLOURS[c.contentTypeId] ?? BADGE_COLOURS.default;
            return (
              <button
                key={c.contentTypeId}
                className={`${styles.tab} ${activeTab === c.contentTypeId ? styles.tabActive : ""}`}
                onClick={() => handleTabChange(c.contentTypeId)}
              >
                <span
                  className={styles.typeBadge}
                  style={{ background: colours.bg, color: colours.text }}
                >
                  {getInitials(c.contentTypeId)}
                </span>
                {c.contentTypeId}
                <span className={styles.tabCount}>{typeCounts[c.contentTypeId] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Column headers */}
      <div className={styles.colHeaders}>
        <span style={{ flex: 1, minWidth: 0 }}>Title</span>
        <span className={styles.colPath}>Path</span>
        <span className={styles.colStatus}>Status</span>
        <span className={styles.colType}>Type</span>
      </div>

      {/* Content */}
      <div className={styles.treeBody}>
        {loading && <TableSkeleton rows={12} />}

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
            {activeTab === "all"
              ? "No entries found."
              : `No ${activeTab} entries found.`}
          </div>
        )}

        {!loading && !error && paginatedNodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            expanded={expanded}
            onToggle={handleToggle}
            onOpen={handleOpen}
            isOrphan={orphanIdSet.has(node.id)}
            siteBaseUrl={siteBaseUrl}
          />
        ))}
      </div>

      {!loading && !error && totalVisible > 0 && (
        <Pagination
          totalItems={totalVisible}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

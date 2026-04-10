"use client";

import type { HomeAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BADGE_COLOURS, DEFAULT_LOCALE } from "../constants";
import { fetchAllEntries } from "../cma-service";
import type { PageTreeEntry, PageTreeInstallationParameters, PageTreeNode } from "../types";
import { useDebouncedValue } from "../use-debounced-value";
import { buildTree, getInitials, resolveContentTypes } from "../utils";
import Pagination, { DEFAULT_PAGE_SIZE } from "./pagination";
import { StatsSkeleton, TreeSkeleton } from "./skeleton";
import styles from "./page-tree-home.module.css";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  colour,
  sub,
}: {
  label: string;
  value: number | string;
  colour: string;
  sub?: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: colour }}>
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: PageTreeEntry["status"] }) {
  const colour =
    status === "published" ? "#389e0d" : status === "draft" ? "#d48806" : "#0066cc";
  return (
    <span className={styles.statusDot} style={{ background: colour }} title={status} />
  );
}

// ---------------------------------------------------------------------------
// Recursive tree node (same pattern as editor, self-contained here)
// ---------------------------------------------------------------------------

interface TreeNodeProps {
  node: PageTreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  siteBaseUrl?: string;
}

const TreeNode = memo(function TreeNode({ node, expanded, onToggle, onOpen, siteBaseUrl }: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const colours = BADGE_COLOURS[node.contentTypeId] ?? BADGE_COLOURS.default;

  return (
    <div className={styles.nodeWrap}>
      <div className={styles.nodeRow} onClick={() => onOpen(node.id)}>
        <button
          className={styles.toggleBtn}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          disabled={!hasChildren}
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

        <span className={styles.typeBadge} style={{ background: colours.bg, color: colours.text }}>
          {getInitials(node.contentTypeId)}
        </span>

        <StatusDot status={node.status} />

        <span className={styles.nodeTitle}>{node.title}</span>

        <span className={styles.nodePath}>{node.computedPath}</span>

        {hasChildren && (
          <span className={styles.childCount}>{node.children.length}</span>
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

      {hasChildren && isExpanded && (
        <div className={styles.childrenWrap}>
          <div className={styles.guideLine} />
          <div className={styles.childrenContent}>
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                expanded={expanded}
                onToggle={onToggle}
                onOpen={onOpen}
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
// Stats computation
// ---------------------------------------------------------------------------

interface TreeStats {
  total: number;
  published: number;
  draft: number;
  changed: number;
  orphans: number;
  maxDepth: number;
  depthDistribution: Record<number, number>;
  missingFullPath: number;
  rootPages: number;
}

function computeStats(entries: PageTreeEntry[], roots: PageTreeNode[], orphans: PageTreeNode[]): TreeStats {
  const statusCounts = { published: 0, draft: 0, changed: 0 };
  let missingFullPath = 0;

  for (const e of entries) {
    statusCounts[e.status]++;
    if (!e.fullPath) missingFullPath++;
  }

  // Depth distribution via tree traversal
  const depthDist: Record<number, number> = {};
  let maxDepth = 0;

  const traverse = (node: PageTreeNode) => {
    depthDist[node.depth] = (depthDist[node.depth] ?? 0) + 1;
    if (node.depth > maxDepth) maxDepth = node.depth;
    for (const c of node.children) traverse(c);
  };
  for (const r of roots) traverse(r);
  for (const o of orphans) { depthDist[0] = (depthDist[0] ?? 0) + 1; }

  return {
    total: entries.length,
    published: statusCounts.published,
    draft: statusCounts.draft,
    changed: statusCounts.changed,
    orphans: orphans.length,
    maxDepth,
    depthDistribution: depthDist,
    missingFullPath,
    rootPages: roots.length,
  };
}

// ---------------------------------------------------------------------------
// Depth bar chart
// ---------------------------------------------------------------------------

function DepthChart({ distribution, max }: { distribution: Record<number, number>; max: number }) {
  const entries = Object.entries(distribution)
    .map(([d, c]) => ({ depth: Number(d), count: c }))
    .sort((a, b) => a.depth - b.depth);

  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div className={styles.depthChart}>
      {entries.map(({ depth, count }) => (
        <div key={depth} className={styles.depthBar}>
          <div className={styles.depthBarTrack}>
            <div
              className={styles.depthBarFill}
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <div className={styles.depthBarLabel}>
            <span className={styles.depthBarDepth}>L{depth}</span>
            <span className={styles.depthBarCount}>{count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function PageTreeHome() {
  const sdk = useSDK<HomeAppSDK>();

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

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Filter entries for the active tab. For per-type tabs, entries whose
  // parent is of a different type are promoted to root (parentId → null)
  // so they don't show as orphans.
  const entries = useMemo(() => {
    if (activeTab === "all") return allEntries;
    const typeEntries = allEntries.filter((e) => e.contentTypeId === activeTab);
    const idSet = new Set(typeEntries.map((e) => e.id));
    return typeEntries.map((e) =>
      e.parentId && !idSet.has(e.parentId) ? { ...e, parentId: null } : e
    );
  }, [allEntries, activeTab]);

  const { roots, orphans } = useMemo(() => buildTree(entries, homeSlug), [entries, homeSlug]);
  const stats = useMemo(() => computeStats(entries, roots, orphans), [entries, roots, orphans]);

  // Per-type counts for tab badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allEntries) {
      counts[e.contentTypeId] = (counts[e.contentTypeId] ?? 0) + 1;
    }
    return counts;
  }, [allEntries]);

  // Default expand depth 0 + 1
  useEffect(() => {
    if (loading || initialExpandDone.current) return;
    initialExpandDone.current = true;
    const toExpand = new Set<string>();
    for (const root of roots) {
      toExpand.add(root.id);
      for (const child of root.children) toExpand.add(child.id);
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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (id: string) => sdk.navigator.openEntry(id, { slideIn: true }),
    [sdk.navigator]
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

  const newPageType = activeTab !== "all" ? activeTab : contentTypeConfigs[0]?.contentTypeId ?? "landingPage";
  const handleNewPage = useCallback(() => {
    if (sdk.navigator.openNewEntry) sdk.navigator.openNewEntry(newPageType, { slideIn: true });
  }, [sdk.navigator, newPageType]);

  // Flat search results (uses debounced filter for performance)
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

  // Pagination: for tree view paginate root nodes, for search paginate flat list
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

  const orphanIdSet = useMemo(
    () => new Set(orphans.map((n) => n.id)),
    [orphans]
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
      {/* Top header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.pageTitle}>🌳 Page Tree</h1>
        </div>
        <div className={styles.pageHeaderRight}>
          <button className={styles.iconBtn} onClick={loadEntries} disabled={loading} title="Refresh">
            {loading ? "…" : "↻ Refresh"}
          </button>
          <button className={styles.newBtn} onClick={handleNewPage}>
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
                  className={styles.tabBadge}
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

      {/* Stats row */}
      {loading && <StatsSkeleton count={6} />}
      {!loading && !error && (
        <div className={styles.statsRow}>
          <StatCard label="Total pages" value={stats.total} colour="#111827" />
          <StatCard label="Published" value={stats.published} colour="#389e0d" sub={`${Math.round((stats.published / Math.max(stats.total, 1)) * 100)}%`} />
          <StatCard label="Draft" value={stats.draft} colour="#d48806" sub={stats.draft > 0 ? "need publishing" : "all clean"} />
          <StatCard label="Changed" value={stats.changed} colour="#0066cc" sub={stats.changed > 0 ? "unpublished edits" : undefined} />
          <StatCard label="Root pages" value={stats.rootPages} colour="#6b7280" />
          <StatCard label="Max depth" value={stats.maxDepth} colour="#6b7280" sub={`${stats.maxDepth + 1} level${stats.maxDepth !== 0 ? "s" : ""}`} />
          {stats.orphans > 0 && (
            <StatCard label="Orphaned" value={stats.orphans} colour="#c2410c" sub="parent missing" />
          )}
          {stats.missingFullPath > 0 && (
            <StatCard label="No fullPath" value={stats.missingFullPath} colour="#9ca3af" sub="use sidebar to fix" />
          )}
        </div>
      )}

      {/* Depth distribution */}
      {!loading && !error && entries.length > 0 && (
        <div className={styles.depthSection}>
          <div className={styles.sectionTitle}>Pages per level</div>
          <DepthChart distribution={stats.depthDistribution} max={stats.maxDepth} />
        </div>
      )}

      {/* Tree section */}
      <div className={styles.treeSection}>
        <div className={styles.treeHeader}>
          <div className={styles.treeHeaderLeft}>
            <span className={styles.sectionTitle}>
              {activeTab === "all" ? "Site tree" : activeTab}
            </span>
            <span className={styles.countBadge}>{entries.length}</span>
          </div>
          <div className={styles.treeHeaderRight}>
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
          </div>
        </div>

        <div className={styles.treeBody}>
          {loading && <TreeSkeleton rows={8} />}

          {!loading && error && (
            <div className={styles.errorBanner}>
              {error}
              <button className={styles.retryBtn} onClick={() => { setError(null); loadEntries(); }}>Retry</button>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className={styles.emptyState}>
              {activeTab === "all"
                ? "No entries found."
                : `No ${activeTab} entries found.`}
            </div>
          )}

          {/* Flat search */}
          {!loading && !error && filteredNodes !== null && (
            filteredNodes.length === 0
              ? <div className={styles.emptyState}>No pages match &ldquo;{filter}&rdquo;</div>
              : <div>
                  {paginatedFilteredNodes.map((node) => {
                    const colours = BADGE_COLOURS[node.contentTypeId] ?? BADGE_COLOURS.default;
                    return (
                      <div
                        key={node.id}
                        className={styles.nodeRow}
                        style={{ paddingLeft: 12 }}
                        onClick={() => handleOpen(node.id)}
                      >
                        <span className={styles.toggleLeaf}>—</span>
                        <span className={styles.typeBadge} style={{ background: colours.bg, color: colours.text }}>
                          {getInitials(node.contentTypeId)}
                        </span>
                        <StatusDot status={node.status} />
                        <span className={styles.nodeTitle}>{node.title}</span>
                        <span className={styles.nodePath}>{node.computedPath}</span>
                      </div>
                    );
                  })}
                </div>
          )}

          {/* Full nested tree (paginated by root nodes) */}
          {!loading && !error && filteredNodes === null && entries.length > 0 && (
            <div>
              {paginatedRoots.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  expanded={expanded}
                  onToggle={handleToggle}
                  onOpen={handleOpen}
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
    </div>
  );
}

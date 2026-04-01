import type { PageTreeEntry, PageTreeNode } from "./types";

/**
 * Walks the parent chain to compute the full URL path for an entry.
 * Depth guard = 20 levels (cycle protection).
 * Returns "/" for root slug matching homeSlug, "/(cycle-detected)" on cycle.
 */
export function computeFullPath(
  entries: PageTreeEntry[],
  entryId: string,
  homeSlug = "home",
  depth = 0
): string {
  if (depth > 20) return "/(cycle-detected)";

  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return "/unknown";

  if (entry.slug === homeSlug) return "/";

  if (!entry.parentId) {
    return "/" + entry.slug;
  }

  const parentPath = computeFullPath(entries, entry.parentId, homeSlug, depth + 1);
  if (parentPath === "/(cycle-detected)") return "/(cycle-detected)";
  if (parentPath === "/") return "/" + entry.slug;
  return parentPath + "/" + entry.slug;
}

/**
 * Splits a flat list into { roots, orphans }.
 * Orphan = parentId is set but that parent ID is not in the list.
 * Uses a Map for O(1) lookups.
 */
export function buildTree(entries: PageTreeEntry[]): {
  roots: PageTreeNode[];
  orphans: PageTreeNode[];
} {
  const nodeMap = new Map<string, PageTreeNode>();

  // First pass: create all nodes
  for (const entry of entries) {
    nodeMap.set(entry.id, {
      ...entry,
      children: [],
      depth: 0,
      computedPath: "",
    });
  }

  // Second pass: wire up parent-child relationships
  const roots: PageTreeNode[] = [];
  const orphans: PageTreeNode[] = [];

  for (const node of nodeMap.values()) {
    if (!node.parentId) {
      roots.push(node);
    } else if (nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      orphans.push(node);
    }
  }

  // Third pass: assign depths and computedPaths (BFS from roots)
  const homeSlug = "home";
  const assignDepthAndPath = (node: PageTreeNode, depth: number, parentPath: string) => {
    node.depth = depth;
    if (node.slug === homeSlug) {
      node.computedPath = "/";
    } else if (parentPath === "/") {
      node.computedPath = "/" + node.slug;
    } else {
      node.computedPath = parentPath + "/" + node.slug;
    }
    for (const child of node.children) {
      assignDepthAndPath(child, depth + 1, node.computedPath);
    }
  };

  for (const root of roots) {
    assignDepthAndPath(root, 0, "");
  }

  for (const orphan of orphans) {
    orphan.computedPath = "/" + orphan.slug;
  }

  // Sort roots and children alphabetically by title
  const sortNodes = (nodes: PageTreeNode[]) => {
    nodes.sort((a, b) => a.title.localeCompare(b.title));
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);
  sortNodes(orphans);

  return { roots, orphans };
}

/**
 * "landingPage" → "LP", "heroBanner" → "HB"
 */
export function getInitials(contentTypeId: string): string {
  return contentTypeId
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
}

/**
 * Fetch with AbortController timeout.
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      return { ok: false, error: `Request failed with status ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err: unknown) {
    const isAbort = (err as { name?: string })?.name === "AbortError";
    return {
      ok: false,
      error: isAbort ? `Request timed out after ${timeoutMs}ms` : "Network error",
    };
  } finally {
    clearTimeout(id);
  }
}

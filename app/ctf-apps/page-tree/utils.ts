import {
  DEFAULT_CONTENT_TYPE_ID,
  DEFAULT_FULLPATH_FIELD,
  DEFAULT_PARENT_FIELD,
  DEFAULT_SLUG_FIELD,
} from "./constants";
import type {
  ContentTypeConfig,
  PageTreeEntry,
  PageTreeInstallationParameters,
  PageTreeNode,
} from "./types";

/**
 * Normalises installation parameters into a ContentTypeConfig[].
 * Handles both the new `contentTypes` array and the legacy single-type fields.
 */
export function resolveContentTypes(
  params: PageTreeInstallationParameters
): ContentTypeConfig[] {
  if (params.contentTypes && params.contentTypes.length > 0) {
    return params.contentTypes;
  }
  return [
    {
      contentTypeId: params.contentTypeId ?? DEFAULT_CONTENT_TYPE_ID,
      parentFieldName: params.parentFieldName ?? DEFAULT_PARENT_FIELD,
      fullPathFieldName: params.fullPathFieldName ?? DEFAULT_FULLPATH_FIELD,
      slugFieldName: params.slugFieldName ?? DEFAULT_SLUG_FIELD,
    },
  ];
}

/**
 * Look up the ContentTypeConfig for a given content type ID.
 * Falls back to defaults if not found.
 */
export function getConfigForType(
  configs: ContentTypeConfig[],
  contentTypeId: string
): ContentTypeConfig {
  return (
    configs.find((c) => c.contentTypeId === contentTypeId) ?? {
      contentTypeId,
      parentFieldName: DEFAULT_PARENT_FIELD,
      fullPathFieldName: DEFAULT_FULLPATH_FIELD,
      slugFieldName: DEFAULT_SLUG_FIELD,
    }
  );
}

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

  const slug = entry.slug || entryId;

  if (slug === homeSlug) return "/";

  if (!entry.parentId) {
    return "/" + slug;
  }

  const parentPath = computeFullPath(entries, entry.parentId, homeSlug, depth + 1);
  if (parentPath === "/(cycle-detected)") return "/(cycle-detected)";
  if (parentPath === "/") return "/" + slug;
  return parentPath + "/" + slug;
}

/**
 * Splits a flat list into { roots, orphans }.
 * Orphan = parentId is set but that parent ID is not in the list.
 * Uses a Map for O(1) lookups.
 */
export function buildTree(
  entries: PageTreeEntry[],
  homeSlug = "home"
): {
  roots: PageTreeNode[];
  orphans: PageTreeNode[];
} {
  const nodeMap = new Map<string, PageTreeNode>();

  for (const entry of entries) {
    nodeMap.set(entry.id, {
      ...entry,
      children: [],
      depth: 0,
      computedPath: "",
    });
  }

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

  const assignDepthAndPath = (node: PageTreeNode, depth: number, parentPath: string) => {
    node.depth = depth;
    const slug = node.slug || node.id;
    if (slug === homeSlug) {
      node.computedPath = "/";
    } else if (parentPath === "/") {
      node.computedPath = "/" + slug;
    } else {
      node.computedPath = parentPath + "/" + slug;
    }
    for (const child of node.children) {
      assignDepthAndPath(child, depth + 1, node.computedPath);
    }
  };

  for (const root of roots) {
    assignDepthAndPath(root, 0, "");
  }

  for (const orphan of orphans) {
    orphan.computedPath = "/" + (orphan.slug || orphan.id);
  }

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


import type { Document, Block, Inline, Text, TopLevelBlock } from "@contentful/rich-text-types";

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

/**
 * Interpolate `{{key}}` tokens in a plain string.
 * Unresolved placeholders are left as-is but wrapped in a unicode marker
 * so renderers can highlight them.
 */
export function interpolateString(
  text: string,
  data: Record<string, string>,
): string {
  return text.replace(PLACEHOLDER_RE, (match, key: string) => {
    return key in data ? data[key] : match;
  });
}

/**
 * Returns true if the string still contains unresolved `{{…}}` tokens.
 */
export function hasUnresolvedPlaceholders(text: string): boolean {
  return PLACEHOLDER_RE.test(text);
}

/**
 * Deep-clone a Rich Text document and replace all `{{key}}` tokens
 * in text nodes with values from the data map.
 */
export function interpolateRichText(
  doc: Document | null | undefined,
  data: Record<string, string>,
): Document | null {
  if (!doc) return null;
  return walkDocument(doc, data);
}

function walkDocument(
  doc: Document,
  data: Record<string, string>,
): Document {
  return {
    ...doc,
    content: doc.content.map((node) => walkNode(node, data)) as TopLevelBlock[],
  };
}

function walkNode(
  node: Block | Inline | Text,
  data: Record<string, string>,
): Block | Inline | Text {
  if (node.nodeType === "text") {
    return {
      ...node,
      value: interpolateString((node as Text).value, data),
    } as Text;
  }

  const block = node as Block | Inline;
  if (block.content) {
    return {
      ...block,
      content: block.content.map((child) => walkNode(child, data)),
    } as Block | Inline;
  }

  return node;
}

/**
 * Extract all `{{key}}` placeholder names from a Rich Text document.
 */
export function extractPlaceholders(doc: Document | null | undefined): string[] {
  if (!doc) return [];
  const keys = new Set<string>();
  visitNodes(doc.content, keys);
  return Array.from(keys);
}

function visitNodes(
  nodes: readonly (Block | Inline | Text)[],
  keys: Set<string>,
): void {
  for (const node of nodes) {
    if (node.nodeType === "text") {
      let m: RegExpExecArray | null;
      const re = /\{\{(\w+)\}\}/g;
      while ((m = re.exec((node as Text).value)) !== null) {
        keys.add(m[1]);
      }
    } else {
      const block = node as Block | Inline;
      if (block.content) {
        visitNodes(block.content, keys);
      }
    }
  }
}

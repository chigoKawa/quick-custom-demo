// Walk an appScreen's resolved entry tree and produce a flat map of every
// referenced entry as `{sys, fields}` shallow copies. The map is shipped to
// the client so each leaf component can subscribe to its own entry via
// useContentfulLiveUpdates, giving real-time updates on any field of any
// nested entry (topics, widgets, microcopy, buttons, nav, ...).
//
// CRITICAL — per CLAUDE.md: never pass a deeply-resolved entry to
// useContentfulLiveUpdates (lodash isEqual blows the stack at include:5).
// Each indexed entry replaces nested entry links with bare sys stubs and
// keeps only scalar field values (Symbol, Text, RichText, Object, Asset,
// arrays-of-links). Assets keep their full data because the SDK accepts
// them and rendering needs file.url.
import { shallowEntryFields } from "@/lib/contentful-live-preview-shallow";

export type IndexedEntry = {
  sys: { id: string; contentType?: { sys: { id: string } } };
  fields: Record<string, unknown>;
};

export type EntriesIndex = Record<string, IndexedEntry>;

function isEntryLike(value: unknown): value is { sys: { id: string }; fields: Record<string, unknown> } {
  if (!value || typeof value !== "object") return false;
  const v = value as { sys?: { id?: string }; fields?: unknown };
  return typeof v.sys?.id === "string" && !!v.fields && typeof v.fields === "object";
}

function getContentTypeId(entry: unknown): string | undefined {
  const e = entry as { sys?: { contentType?: { sys?: { id?: string } } } } | undefined;
  return e?.sys?.contentType?.sys?.id;
}

// Walk every entry reachable via `fields` only (never arbitrary object
// values — that's where include:5 cycles bite). For each entry encountered,
// store a shallow {sys, fields} projection in the index.
function walk(node: unknown, index: EntriesIndex) {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, index);
    return;
  }
  if (!isEntryLike(node)) return;

  const id = node.sys.id;
  if (index[id]) return; // already visited

  const ctId = getContentTypeId(node);
  const indexed: IndexedEntry = {
    sys: ctId
      ? { id, contentType: { sys: { id: ctId } } }
      : { id },
    fields: shallowEntryFields(node.fields),
  };
  index[id] = indexed;

  // Recurse into fields only — and only via arrays / single entry links.
  for (const v of Object.values(node.fields)) {
    walk(v, index);
  }
}

export function buildEntriesIndex(screens: unknown[]): EntriesIndex {
  const index: EntriesIndex = {};
  for (const screen of screens) walk(screen, index);
  return index;
}

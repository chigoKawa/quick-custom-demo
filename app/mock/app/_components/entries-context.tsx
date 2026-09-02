"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import type { Document } from "@contentful/rich-text-types";
import { Inspectable } from "./inspectable";
import type { EntriesIndex, IndexedEntry } from "../_lib/entries-index";

// ============================================================
// Context — the flat entries map shipped from the server
// ============================================================

type EntriesContextValue = {
  index: EntriesIndex;
  /** Microcopy key → entry id, so consumers can look up by `app.foo`. */
  microcopyByKey: Record<string, string>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({
  index,
  children,
}: {
  index: EntriesIndex;
  children: React.ReactNode;
}) {
  const value = useMemo<EntriesContextValue>(() => {
    const microcopyByKey: Record<string, string> = {};
    for (const [id, entry] of Object.entries(index)) {
      if (entry.sys.contentType?.sys.id !== "microcopy") continue;
      const key = entry.fields.key as string | undefined;
      if (key && !microcopyByKey[key]) microcopyByKey[key] = id;
    }
    return { index, microcopyByKey };
  }, [index]);

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

function useEntriesContext(): EntriesContextValue {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error("useLiveEntry must be used inside EntriesProvider");
  return ctx;
}

// ============================================================
// Hooks
// ============================================================

/**
 * Subscribe to a single Contentful entry by id. Returns the live-updated
 * shallow entry. If no id or not in the index, returns null.
 *
 * Each call is a separate live subscription — keep these inside leaf
 * components so the surrounding tree doesn't re-render on every keystroke.
 */
export function useLiveEntry(id: string | null | undefined): IndexedEntry | null {
  const { index } = useEntriesContext();
  const initial = id ? index[id] ?? null : null;
  // useContentfulLiveUpdates is safe with null — it just returns the value.
  const live = useContentfulLiveUpdates(initial);
  return (live as IndexedEntry | null) ?? initial;
}

/**
 * Read an ordered list of linked-entry ids from a parent entry field.
 * The parent is live-subscribed, so reorders/additions/removals propagate.
 *
 * Returns an array of bare ids — pass each to useLiveEntry in a child
 * component to render that entry's live fields.
 */
export function useLiveLinkedIds(parentId: string, fieldId: string): string[] {
  const live = useLiveEntry(parentId);
  const v = live?.fields?.[fieldId];
  if (!Array.isArray(v)) return [];
  const ids: string[] = [];
  for (const item of v) {
    const id = (item as { sys?: { id?: string } } | undefined)?.sys?.id;
    if (typeof id === "string") ids.push(id);
  }
  return ids;
}

/** Read a single linked-entry id from a parent field. */
export function useLiveLinkedId(parentId: string, fieldId: string): string | null {
  const live = useLiveEntry(parentId);
  const v = live?.fields?.[fieldId];
  const id = (v as { sys?: { id?: string } } | undefined)?.sys?.id;
  return typeof id === "string" ? id : null;
}

/** Resolve a microcopy key (e.g. `app.tab.home`) to its entry id. */
export function useMicrocopyId(key: string | null | undefined): string | null {
  const { microcopyByKey } = useEntriesContext();
  if (!key) return null;
  return microcopyByKey[key] ?? null;
}

// ============================================================
// Live primitives — drop-in JSX components
// ============================================================

type CommonStyle = {
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
};

/**
 * Live scalar field reader. Subscribes to the entry and renders the
 * current value of `fieldId`, wrapped with Inspector data attrs so
 * clicking opens the right field. Falls back to `fallback` when the
 * entry/field is absent.
 */
export function LiveField({
  entryId,
  fieldId,
  fallback,
  as,
  className,
  style,
}: CommonStyle & {
  entryId: string | null | undefined;
  fieldId: string;
  fallback?: React.ReactNode;
}) {
  const entry = useLiveEntry(entryId);
  const value = entry?.fields?.[fieldId];
  const text = typeof value === "string" ? value : value == null ? "" : String(value);

  if (!entryId || !entry) {
    const Tag = (as ?? "span") as React.ElementType;
    return (
      <Tag className={className} style={style}>
        {text || fallback || ""}
      </Tag>
    );
  }

  return (
    <Inspectable entryId={entryId} fieldId={fieldId} as={as} className={className} style={style}>
      {text || fallback || ""}
    </Inspectable>
  );
}

/**
 * Live RichText. Inspector tagged like LiveField.
 */
export function LiveRichText({
  entryId,
  fieldId,
  className,
  style,
}: CommonStyle & {
  entryId: string | null | undefined;
  fieldId: string;
}) {
  const entry = useLiveEntry(entryId);
  const doc = entry?.fields?.[fieldId] as Document | undefined;
  if (!entryId || !doc) return null;
  return (
    <Inspectable
      entryId={entryId}
      fieldId={fieldId}
      as="div"
      className={className ?? "text-sm leading-relaxed"}
      style={style}
    >
      {documentToReactComponents(doc)}
    </Inspectable>
  );
}

/**
 * Live microcopy lookup by key. Resolves the entry from `microcopyByKey`,
 * subscribes to it, and renders the live `value` field. Falls back to a
 * plain text node if the key isn't present in the index.
 */
export function LiveMicrocopy({
  k,
  fallback,
  as,
  className,
  style,
}: CommonStyle & {
  k: string;
  fallback?: string;
}) {
  const id = useMicrocopyId(k);
  if (!id) {
    const Tag = (as ?? "span") as React.ElementType;
    return (
      <Tag className={className} style={style}>
        {fallback ?? ""}
      </Tag>
    );
  }
  return (
    <LiveField
      entryId={id}
      fieldId="value"
      fallback={fallback}
      as={as}
      className={className}
      style={style}
    />
  );
}

/** Imperative-ish helper: read the current value of microcopy `k` (live). */
export function useMicrocopyValue(k: string, fallback = ""): string {
  const id = useMicrocopyId(k);
  const entry = useLiveEntry(id);
  const v = entry?.fields?.value;
  return typeof v === "string" ? v : fallback;
}

/** Read any field of any entry as a raw value (live). For values that aren't
 *  rendered as JSX (config JSON, enum strings, asset urls). */
export function useLiveFieldValue<T = unknown>(
  entryId: string | null | undefined,
  fieldId: string
): T | undefined {
  const entry = useLiveEntry(entryId);
  return entry?.fields?.[fieldId] as T | undefined;
}

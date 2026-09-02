import type { IMicrocopy, IAppScreen } from "@/features/contentful/type";

export type MicrocopyEntry = { value: string; entryId: string };
export type MicrocopyMap = Record<string, MicrocopyEntry>;

export function buildMicrocopyMap(entries: IMicrocopy[]): MicrocopyMap {
  const out: MicrocopyMap = {};
  for (const e of entries) {
    const key = e?.fields?.key as string | undefined;
    const value = e?.fields?.value as string | undefined;
    const id = e?.sys?.id;
    if (!key || !value || !id) continue;
    if (out[key]) continue;
    out[key] = { value, entryId: id };
  }
  return out;
}

// Walk a fully-resolved appScreen tree and collect every linked microcopy entry
// from modules and their widgets. Used so we can build a single flat dictionary
// passed to the client.
export function collectMicrocopyFromScreen(screen: IAppScreen): IMicrocopy[] {
  const out: IMicrocopy[] = [];
  const seen = new Set<string>();

  const push = (m: unknown) => {
    const entry = m as IMicrocopy | undefined;
    const id = entry?.sys?.id;
    if (!id || seen.has(id)) return;
    if (!entry?.fields?.key) return;
    seen.add(id);
    out.push(entry);
  };

  for (const mod of screen.fields.modules ?? []) {
    const fields = (mod as { fields?: { microcopySet?: unknown[]; widget?: { fields?: { microcopySet?: unknown[] } } } })?.fields;
    if (!fields) continue;
    for (const m of fields.microcopySet ?? []) push(m);
    for (const m of fields.widget?.fields?.microcopySet ?? []) push(m);
  }

  // Nav-item labels also come from microcopy entries
  const nav = screen.fields.navigation as { fields?: { items?: Array<{ fields?: { labelMicrocopy?: unknown } }> } } | undefined;
  for (const item of nav?.fields?.items ?? []) {
    push(item?.fields?.labelMicrocopy);
  }

  return out;
}

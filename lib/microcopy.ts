import { getEntries } from "./contentful";
import type { MicrocopySkeleton, IMicrocopy } from "@/features/contentful/type";

export type MicrocopyMap = Record<string, string>;

export type MicrocopyEntry = {
  value: string;
  entryId: string;
};

export type MicrocopyDataMap = Record<string, MicrocopyEntry>;

/**
 * Fetch all microcopy entries for a given locale and return as a key-value map.
 * Keys are the microcopy `key` field, values are the localized `value` field.
 */
export async function getMicrocopy(
  locale: string,
  isPreview: boolean = false,
  timelineToken?: string | null,
  environmentId?: string | null
): Promise<MicrocopyMap> {
  const entries = await getEntries<MicrocopySkeleton>(
    {
      content_type: "microcopy",
      locale,
      limit: 1000,
    },
    isPreview,
    timelineToken,
    environmentId
  );

  const map: MicrocopyMap = {};

  for (const entry of entries) {
    const e = entry as unknown as IMicrocopy;
    const key = e?.fields?.key;
    const value = e?.fields?.value;

    if (typeof key === "string" && typeof value === "string") {
      map[key] = value;
    }
  }

  return map;
}

/**
 * Fetch all microcopy entries with entry IDs for Live Preview inspector support.
 * Returns a map of key -> { value, entryId }
 */
export async function getMicrocopyWithIds(
  locale: string,
  isPreview: boolean = false,
  timelineToken?: string | null,
  environmentId?: string | null
): Promise<MicrocopyDataMap> {
  const entries = await getEntries<MicrocopySkeleton>(
    {
      content_type: "microcopy",
      locale,
      limit: 1000,
    },
    isPreview,
    timelineToken,
    environmentId
  );

  const map: MicrocopyDataMap = {};

  for (const entry of entries) {
    const e = entry as unknown as IMicrocopy;
    const key = e?.fields?.key;
    const value = e?.fields?.value;
    const entryId = e?.sys?.id;

    if (typeof key === "string" && typeof value === "string" && entryId) {
      map[key] = { value, entryId };
    }
  }

  return map;
}

/**
 * Get a single microcopy value by key, with optional fallback.
 */
export function getMicrocopyValue(
  map: MicrocopyMap,
  key: string,
  fallback: string = ""
): string {
  return map[key] ?? fallback;
}

/**
 * Create a helper function to get microcopy values from a preloaded map.
 */
export function createMicrocopyGetter(map: MicrocopyMap) {
  return (key: string, fallback: string = ""): string => {
    return map[key] ?? fallback;
  };
}

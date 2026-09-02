/**
 * Reading the Personalization content model and deriving the registry.
 *
 * The client is `sdk.cma` — the App SDK's own CMA client. No token, no `createClient`: the
 * installation authorizes the calls, so the app inherits exactly the caller's permissions.
 */

import type { CMAClient } from "@contentful/app-sdk";

import { CT_AUDIENCE, CT_EXPERIENCE, EXPERIENCE_TYPE_EXPERIMENT } from "../constants";
import {
  formatFromValueType,
  normaliseVariants,
  parseConfig,
  unwrapValue,
} from "./nt-config";
import type {
  Audience,
  CollisionGroup,
  EntryStatus,
  FlagRow,
  RegistrySnapshot,
} from "./types";

const PAGE_SIZE = 100;

/* ------------------------------------------------------------------ *
 * Shared helpers (same semantics as page-tree/cma-service.ts)
 * ------------------------------------------------------------------ */

/** Locale-keyed field → value, preferring the given locale, then `en-US`, then whatever exists. */
function getLocalized<T = unknown>(
  field: Record<string, T> | undefined,
  locale: string
): T | undefined {
  if (!field) return undefined;
  return field[locale] ?? field["en-US"] ?? Object.values(field)[0];
}

function deriveStatus(sys: {
  publishedAt?: string | null;
  version: number;
  publishedVersion?: number | null;
}): EntryStatus {
  if (!sys.publishedAt) return "draft";
  if (sys.version > (sys.publishedVersion ?? 0) + 1) return "changed";
  return "published";
}

interface RawEntry {
  sys: {
    id: string;
    version: number;
    publishedAt?: string | null;
    publishedVersion?: number | null;
    updatedAt?: string;
  };
  fields?: Record<string, Record<string, unknown>>;
}

/**
 * Fetch every entry of a content type, following `total`.
 *
 * `order` matters for experiences: sorting by `sys.id` makes the collision winner — the
 * alphabetically lowest id — fall out of the fetch order for free (PLAN.md §3.3).
 */
async function fetchAll(
  cma: CMAClient,
  contentTypeId: string,
  order: string
): Promise<RawEntry[]> {
  const items: RawEntry[] = [];
  let skip = 0;
  let total = Infinity;

  while (items.length < total) {
    const response = await cma.entry.getMany({
      query: { content_type: contentTypeId, skip, limit: PAGE_SIZE, order },
    });

    total = response.total;
    items.push(...(response.items as unknown as RawEntry[]));

    skip += response.items.length;
    if (response.items.length === 0) break;
  }

  return items;
}

/* ------------------------------------------------------------------ *
 * Audiences
 * ------------------------------------------------------------------ */

/**
 * Audience names change rarely and the picker needs them on every wizard open, so cache for the
 * session. The experience list is deliberately **not** cached — a stale registry produces false
 * collision verdicts (PLAN.md §3.2).
 */
let audienceCache: Audience[] | null = null;

export function clearAudienceCache(): void {
  audienceCache = null;
}

export async function fetchAudiences(
  cma: CMAClient,
  locale: string
): Promise<Audience[]> {
  if (audienceCache) return audienceCache;

  const entries = await fetchAll(cma, CT_AUDIENCE, "sys.id");
  const audiences = entries.map((entry) => ({
    id: entry.sys.id,
    name:
      getLocalized<string>(
        entry.fields?.nt_name as Record<string, string> | undefined,
        locale
      ) || entry.sys.id,
  }));

  audienceCache = audiences;
  return audiences;
}

/* ------------------------------------------------------------------ *
 * The registry
 * ------------------------------------------------------------------ */

/**
 * Read every experience and flatten its custom flags into registry rows.
 *
 * Deliberately no `nt_type` filter: the registry has to see personalizations too, because a
 * personalization can claim the same flag key as an experiment and collide with it. Only
 * *creation* is scoped to experiments (PLAN.md §6.1).
 */
export async function loadRegistry(
  cma: CMAClient,
  locale: string
): Promise<RegistrySnapshot> {
  const [experiences, audiences] = await Promise.all([
    fetchAll(cma, CT_EXPERIENCE, "sys.id"),
    fetchAudiences(cma, locale).catch(() => [] as Audience[]),
  ]);

  const audienceNameById = new Map(audiences.map((a) => [a.id, a.name]));
  const rows: FlagRow[] = [];
  const metricsInUse = new Set<string>();
  const experienceNames = new Set<string>();

  for (const entry of experiences) {
    const fields = entry.fields ?? {};
    const config = parseConfig(getLocalized(fields.nt_config, locale));

    const experienceName =
      getLocalized<string>(
        fields.nt_name as Record<string, string> | undefined,
        locale
      ) || entry.sys.id;

    // Collected before the no-flags guard below: a name is taken whether or not the experience
    // it belongs to happens to carry a custom flag.
    experienceNames.add(experienceName.trim().toLowerCase());

    if (config.primaryMetric) metricsInUse.add(config.primaryMetric);
    if (config.inlineVariables.length === 0) continue;

    const ntType = getLocalized<string>(
      fields.nt_type as Record<string, string> | undefined,
      locale
    );

    const audienceLink = getLocalized(fields.nt_audience, locale) as
      | { sys?: { id?: string } }
      | undefined;
    const audienceId = audienceLink?.sys?.id ?? null;

    const status = deriveStatus(entry.sys);

    for (const component of config.inlineVariables) {
      const baselineValue = unwrapValue(component.baseline);
      const variantValues = normaliseVariants(component.variants).map(unwrapValue);

      rows.push({
        id: `${entry.sys.id}:${component.key}`,
        key: component.key,
        format: formatFromValueType(component.valueType, baselineValue),
        experience: experienceName,
        entryId: entry.sys.id,
        kind: ntType === EXPERIENCE_TYPE_EXPERIMENT ? "Experiment" : "Personalization",
        variantCount: 1 + variantValues.length,
        status,
        baselineValue,
        variantValues,
        audienceId,
        audienceName: audienceId ? audienceNameById.get(audienceId) ?? null : null,
        trafficPct: config.trafficPct,
        distributionPcts: config.distributionPcts,
        primaryMetric: config.primaryMetric,
      });
    }
  }

  const collisions = findCollisions(rows);

  return {
    rows,
    collisions,
    collidingKeys: new Set(collisions.map((group) => group.key)),
    audiences,
    metricsInUse: [...metricsInUse].sort(),
    experienceNames,
  };
}

/**
 * Keys claimed by more than one experience.
 *
 * When a visitor qualifies for two experiences that set the same key, resolution is
 * non-deterministic and there is no configurable priority — the entry with the alphabetically
 * lower id wins. Nothing in the product surfaces this, which is why the registry exists.
 */
export function findCollisions(rows: FlagRow[]): CollisionGroup[] {
  const byKey = new Map<string, FlagRow[]>();

  for (const row of rows) {
    const group = byKey.get(row.key);
    if (group) group.push(row);
    else byKey.set(row.key, [row]);
  }

  const collisions: CollisionGroup[] = [];

  for (const [key, group] of byKey) {
    // A single entry declaring the same key twice is still one entry, not a cross-experience
    // collision — group by entry before deciding.
    const distinctEntries = new Set(group.map((row) => row.entryId));
    if (distinctEntries.size < 2) continue;

    const sorted = [...group].sort((a, b) => (a.entryId < b.entryId ? -1 : 1));
    collisions.push({ key, rows: sorted, winner: sorted[0] });
  }

  return collisions.sort((a, b) => a.key.localeCompare(b.key));
}

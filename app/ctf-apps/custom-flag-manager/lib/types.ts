import type { FlagFormat } from "./nt-config";

export type EntryStatus = "published" | "draft" | "changed";

export type ExperienceKind = "Experiment" | "Personalization";

/**
 * One row in the registry: a single custom flag inside a single experience.
 *
 * One experience entry can carry several `InlineVariable` components, so rows are per
 * *(entry, key)* — the registry is a flatMap over entries, not a map (PLAN.md §3.3).
 */
export interface FlagRow {
  /** `${entryId}:${key}` — rows are keyed by the pair, since neither is unique alone. */
  id: string;
  key: string;
  format: FlagFormat;
  /** `nt_name`, falling back to the entry id. */
  experience: string;
  entryId: string;
  kind: ExperienceKind;
  /** Baseline + variants. */
  variantCount: number;
  status: EntryStatus;
  baselineValue: unknown;
  variantValues: unknown[];
  audienceId: string | null;
  audienceName: string | null;
  trafficPct: number;
  distributionPcts: number[];
  primaryMetric: string | null;
}

/** A flag key claimed by more than one experience. */
export interface CollisionGroup {
  key: string;
  rows: FlagRow[];
  /** The row that actually wins at runtime: alphabetically lowest entry id. */
  winner: FlagRow;
}

export interface Audience {
  id: string;
  name: string;
}

export interface RegistrySnapshot {
  rows: FlagRow[];
  collisions: CollisionGroup[];
  /** Keys that collide, for O(1) lookup per row. */
  collidingKeys: Set<string>;
  audiences: Audience[];
  /** Metric UUIDs already in use across the space — the only source we have (PLAN.md §6.2). */
  metricsInUse: string[];
  /**
   * Every experience name in the space, lowercased. `nt_name` is unique, so the create wizard
   * checks against this instead of discovering the clash as a 422 at submit (PLAN.md §4 risk 3).
   */
  experienceNames: Set<string>;
}

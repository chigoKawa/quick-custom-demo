import type { FlagFormat } from "./nt-config";
import type { FlagRow } from "./types";

export type FormatFilter = "All" | FlagFormat;
export type KindFilter = "All" | "Experiments" | "Personalizations";

export interface RegistryFilters {
  query: string;
  format: FormatFilter;
  kind: KindFilter;
  duplicatesOnly: boolean;
}

export const EMPTY_FILTERS: RegistryFilters = {
  query: "",
  format: "All",
  kind: "All",
  duplicatesOnly: false,
};

/** Search matches the flag key or the experience name — both are how people look a flag up. */
export function applyFilters(
  rows: FlagRow[],
  filters: RegistryFilters,
  collidingKeys: Set<string>
): FlagRow[] {
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (query && !row.key.toLowerCase().includes(query) && !row.experience.toLowerCase().includes(query)) {
      return false;
    }
    if (filters.format !== "All" && row.format !== filters.format) return false;
    if (filters.kind === "Experiments" && row.kind !== "Experiment") return false;
    if (filters.kind === "Personalizations" && row.kind !== "Personalization") return false;
    if (filters.duplicatesOnly && !collidingKeys.has(row.key)) return false;
    return true;
  });
}

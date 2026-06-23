import { getEntries, getAllPageSlugs } from "./contentful";
import type {
  IPmsPropertyEntry,
  PmsPropertyEntrySkeleton,
} from "@/features/contentful/type";

const INCLUDES_COUNT = 6;

/**
 * Fetch a single PMS property entry by propertyId.
 * Returns null when not found.
 */
export async function getPmsPropertyEntryById(
  propertyId: string,
  locale?: string,
  preview = false,
  timelineToken?: string | null,
  environmentId?: string | null
): Promise<IPmsPropertyEntry | null> {
  try {
    const entries = await getEntries<PmsPropertyEntrySkeleton>(
      {
        content_type: "pmsProperty",
        "fields.propertyId": propertyId,
        limit: 1,
        include: INCLUDES_COUNT,
        ...(locale ? { locale } : {}),
      },
      preview,
      timelineToken,
      environmentId
    );
    return (entries[0] as IPmsPropertyEntry | undefined) ?? null;
  } catch (err) {
    console.error("[pms-property] getPmsPropertyEntryById error", { propertyId, locale, err });
    return null;
  }
}

/**
 * Fetch all PMS property IDs for static generation.
 */
export async function getAllPmsPropertyIds(
  preview = false
): Promise<string[]> {
  try {
    const entries = await getEntries<PmsPropertyEntrySkeleton>(
      { content_type: "pmsProperty", include: 1 },
      preview
    );
    return entries
      .map((e) => (e as IPmsPropertyEntry).fields?.propertyId)
      .filter((id): id is string => typeof id === "string");
  } catch (err) {
    console.error("[pms-property] getAllPmsPropertyIds error", err);
    return [];
  }
}

/**
 * Safely serialize a PMS property entry for the server→client boundary.
 */
export function mapPmsPropertyEntryToProps(entry: IPmsPropertyEntry): IPmsPropertyEntry {
  try {
    return structuredClone(entry);
  } catch {
    return JSON.parse(JSON.stringify(entry));
  }
}

import type { CMAClient } from "@contentful/app-sdk";
import type { ContentTypeConfig, PageTreeEntry } from "./types";

interface FieldMapping {
  parent: string;
  slug: string;
  fullPath: string;
}

/**
 * Resolve a localized field value with a three-tier fallback:
 * configured locale -> "en-US" -> first available locale value.
 * Works for any space regardless of its default locale.
 */
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
}): "published" | "draft" | "changed" {
  if (!sys.publishedAt) return "draft";
  if (sys.version > (sys.publishedVersion ?? 0) + 1) return "changed";
  return "published";
}

// Session-level cache for displayField per content type.
// Display fields don't change during a session, so we only fetch once.
const displayFieldCache = new Map<string, string>();

/**
 * Resolve the displayField for a content type. Every Contentful content
 * type has exactly one display field — this is what Contentful itself uses
 * as the entry title everywhere in the UI.
 *
 * Results are cached for the lifetime of the app session.
 */
async function resolveDisplayField(
  cma: CMAClient,
  contentTypeId: string
): Promise<string> {
  const cached = displayFieldCache.get(contentTypeId);
  if (cached) return cached;

  const ct = await cma.contentType.get({ contentTypeId });
  if (!ct.displayField) {
    throw new Error(
      `Content type "${contentTypeId}" has no display field configured. ` +
        `Open the content type in Contentful and set a display field.`
    );
  }
  displayFieldCache.set(contentTypeId, ct.displayField);
  return ct.displayField;
}

async function fetchEntriesForType(
  cma: CMAClient,
  contentTypeId: string,
  locale: string,
  mapping: FieldMapping,
  displayField: string
): Promise<PageTreeEntry[]> {
  let skip = 0;
  const limit = 200;
  let total = Infinity;
  const items: PageTreeEntry[] = [];

  while (items.length < total) {
    const response = await cma.entry.getMany({
      query: {
        content_type: contentTypeId,
        skip,
        limit,
        order: "sys.updatedAt",
      },
    });

    total = response.total;

    for (const item of response.items) {
      const fields = item.fields as Record<string, Record<string, unknown>>;
      const sys = item.sys as {
        id: string;
        publishedAt?: string | null;
        version: number;
        publishedVersion?: number | null;
        updatedAt: string;
        contentType: { sys: { id: string } };
      };

      const title =
        (getLocalized<string>(
          fields[displayField] as Record<string, string> | undefined,
          locale
        )) || sys.id;

      const slug =
        (getLocalized<string>(
          fields[mapping.slug] as Record<string, string> | undefined,
          locale
        )) || "";

      const fullPath =
        (getLocalized<string>(
          fields[mapping.fullPath] as Record<string, string> | undefined,
          locale
        )) ?? null;

      const parentFieldValues = fields[mapping.parent] as
        | Record<string, { sys?: { id?: string } }>
        | undefined;
      const parentLink = getLocalized(parentFieldValues, locale) as
        | { sys?: { id?: string } }
        | undefined;
      const parentId = parentLink?.sys?.id ?? null;

      items.push({
        id: sys.id,
        title,
        slug,
        fullPath,
        parentId,
        contentTypeId: sys.contentType.sys.id,
        status: deriveStatus({
          publishedAt: sys.publishedAt,
          version: sys.version,
          publishedVersion: sys.publishedVersion,
        }),
        updatedAt: sys.updatedAt,
        publishedAt: sys.publishedAt ?? null,
      });
    }

    skip += response.items.length;
    if (response.items.length === 0) break;
  }

  return items;
}

/**
 * Fetch entries for all configured content types using the CMA client
 * provided by the Contentful App SDK (`sdk.cma`).
 *
 * Resolves each content type's `displayField` to use as the entry title.
 * Individual content type failures are isolated — the app still loads
 * entries from the types that succeed, and collects errors for the rest.
 */
export async function fetchAllEntries(
  cma: CMAClient,
  configs: ContentTypeConfig[],
  locale: string
): Promise<PageTreeEntry[]> {
  const allEntries: PageTreeEntry[] = [];
  const errors: string[] = [];

  const settled = await Promise.allSettled(
    configs.map(async (cfg) => {
      const displayField = await resolveDisplayField(cma, cfg.contentTypeId);
      return fetchEntriesForType(cma, cfg.contentTypeId, locale, {
        parent: cfg.parentFieldName,
        slug: cfg.slugFieldName,
        fullPath: cfg.fullPathFieldName,
      }, displayField);
    })
  );

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      allEntries.push(...result.value);
    } else {
      errors.push(
        `${configs[i].contentTypeId}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
      );
    }
  }

  // If ALL types failed, throw so the UI shows an error
  if (allEntries.length === 0 && errors.length > 0) {
    throw new Error(`Failed to load entries:\n${errors.join("\n")}`);
  }

  return allEntries;
}

// ---------------------------------------------------------------------------
// set-parent
// ---------------------------------------------------------------------------

async function computePath(
  cma: CMAClient,
  entryId: string,
  parentId: string | null,
  locale: string,
  slugFieldName: string,
  parentFieldName: string,
  homeSlug: string,
  depth = 0
): Promise<string> {
  if (depth > 20) return "/(cycle-detected)";

  const entry = await cma.entry.get({ entryId });
  const fields = entry.fields as Record<string, Record<string, unknown>>;
  const slug = (getLocalized<string>(
    fields[slugFieldName] as Record<string, string> | undefined,
    locale
  ) ?? entryId) as string;

  if (slug === homeSlug) return "/";
  if (!parentId) return "/" + slug;

  const parentEntry = await cma.entry.get({ entryId: parentId });
  const parentFields = parentEntry.fields as Record<
    string,
    Record<string, unknown>
  >;

  const parentParentLink =
    (getLocalized(
      parentFields[parentFieldName] as Record<string, { sys?: { id?: string } }> | undefined,
      locale
    ) as { sys?: { id?: string } } | undefined) ??
    (getLocalized(
      parentFields.parent as Record<string, { sys?: { id?: string } }> | undefined,
      locale
    ) as { sys?: { id?: string } } | undefined);
  const parentParentId = parentParentLink?.sys?.id ?? null;

  const parentPath = await computePath(
    cma,
    parentId,
    parentParentId,
    locale,
    slugFieldName,
    parentFieldName,
    homeSlug,
    depth + 1
  );
  if (parentPath === "/(cycle-detected)") return "/(cycle-detected)";
  if (parentPath === "/") return "/" + slug;
  return parentPath + "/" + slug;
}

/**
 * Update an entry's parent link and recompute its fullPath, persisting
 * both via the CMA client from the Contentful App SDK (`sdk.cma`).
 *
 * Returns `{ id, fullPath }` on success.
 */
export async function setEntryParent(
  cma: CMAClient,
  opts: {
    entryId: string;
    parentId: string | null;
    locale: string;
    parentFieldName?: string;
    fullPathFieldName?: string;
    slugFieldName?: string;
    homeSlug?: string;
  }
): Promise<{ id: string; fullPath: string }> {
  const {
    entryId,
    parentId,
    locale,
    parentFieldName = "parent",
    fullPathFieldName = "fullPath",
    slugFieldName = "slug",
    homeSlug = "home",
  } = opts;

  if (parentId === entryId) {
    throw new Error("An entry cannot be its own parent.");
  }

  const entry = await cma.entry.get({ entryId });
  const fields = entry.fields as Record<string, Record<string, unknown>>;

  if (parentId) {
    fields[parentFieldName] = {
      [locale]: {
        sys: { type: "Link", linkType: "Entry", id: parentId },
      },
    };
  } else {
    delete fields[parentFieldName];
  }

  const newPath = await computePath(
    cma,
    entryId,
    parentId,
    locale,
    slugFieldName,
    parentFieldName,
    homeSlug
  );

  if (fields[fullPathFieldName] !== undefined || newPath) {
    fields[fullPathFieldName] = { [locale]: newPath };
  }

  const updated = await cma.entry.update(
    { entryId },
    { ...entry, fields }
  );

  return { id: updated.sys.id, fullPath: newPath };
}

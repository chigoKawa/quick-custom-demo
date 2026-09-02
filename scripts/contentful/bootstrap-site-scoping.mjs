import "dotenv/config";
import contentfulManagement from "contentful-management";
const { createClient } = contentfulManagement;

/**
 * Bootstraps the optional site-scoping model:
 *   1. Creates the `site` content type (name + siteSettings reference + metadata).
 *   2. Additively adds an optional `site` reference field to site-owned content types.
 *
 * Additive and idempotent by design. Existing fields are never replaced: each
 * patch is a read-modify-write against `current.fields`, so running this twice
 * is a no-op. No entry data is written and no backfill is performed — the new
 * field is optional, so every existing entry stays valid and renders unchanged
 * while site scoping is switched off.
 *
 * Usage:
 *   node scripts/contentful/bootstrap-site-scoping.mjs [--dry-run]
 */

const SPACE_ID = process.env.NEXT_PUBLIC_CTF_SPACE_ID;
const ENVIRONMENT_ID =
  process.env.NEXT_PUBLIC_CTF_ENVIRONMENT ||
  process.env.CONTENTFUL_ENVIRONMENT ||
  "master";
// NOTE: CTF_MANAGEMENT_TOKEN — not CONTENTFUL_MANAGEMENT_TOKEN, which is the
// stale name read by bootstrap-site-settings.mjs and currently returns 401.
const MANAGEMENT_TOKEN =
  process.env.CTF_MANAGEMENT_TOKEN || process.env.CONTENTFUL_MANAGEMENT_TOKEN;

const DRY_RUN = process.argv.includes("--dry-run");

/** Content types that belong to exactly one site and must be filterable. */
const SITE_OWNED_CONTENT_TYPES = [
  // Tier 1 — published entries behind a public route, or a global lookup table.
  "landingPage",
  "blogPost",
  "campaign",
  "productStory",
  "redirect",
  // Tier 2 — a public route exists, but no published entries yet, so adding the
  // field now costs nothing and avoids a backfill later.
  "microcopy",
  "kbArticle",
  "categoryPage",
  "productCategory",
  "pmsProperty",
  "auction",
];

/** The optional reference added to every site-owned type. */
const SITE_FIELD = {
  id: "site",
  name: "Site",
  type: "Link",
  linkType: "Entry",
  required: false,
  localized: false,
  validations: [{ linkContentType: ["site"] }],
};

const SITE_CONTENT_TYPE = {
  id: "site",
  name: "Site",
  description:
    "A brand/site served from this space. Only used when site scoping is enabled; single-site demos ignore it entirely.",
  displayField: "internalName",
  fields: [
    {
      id: "internalName",
      name: "Internal name",
      type: "Symbol",
      required: true,
      localized: false,
      validations: [{ unique: true }],
    },
    {
      id: "siteSettings",
      name: "Site settings",
      type: "Link",
      linkType: "Entry",
      required: true,
      localized: false,
      validations: [{ linkContentType: ["siteSettings"] }],
    },
    {
      id: "domain",
      name: "Domain",
      type: "Symbol",
      required: false,
      localized: false,
      validations: [{ unique: true }],
    },
    {
      id: "defaultLocale",
      name: "Default locale",
      type: "Symbol",
      required: false,
      localized: false,
    },
  ],
};

function requireEnv(name, value) {
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required env var: ${name}`);
  }
}

function buildClient() {
  requireEnv("CTF_MANAGEMENT_TOKEN", MANAGEMENT_TOKEN);
  requireEnv("NEXT_PUBLIC_CTF_SPACE_ID", SPACE_ID);

  return createClient(
    { accessToken: MANAGEMENT_TOKEN },
    {
      type: "plain",
      defaults: { spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID },
    }
  );
}

async function getContentType(client, contentTypeId) {
  try {
    return await client.contentType.get({ contentTypeId });
  } catch {
    return null;
  }
}

async function publishIfNeeded(client, contentTypeId, updated) {
  const shouldPublish =
    !updated.sys.publishedVersion ||
    updated.sys.version > updated.sys.publishedVersion;

  if (!shouldPublish) return updated;

  return client.contentType.publish(
    { contentTypeId },
    { sys: { version: updated.sys.version } }
  );
}

/** Creates the `site` content type, or reports it as already present. */
async function ensureSiteContentType(client) {
  const existing = await getContentType(client, SITE_CONTENT_TYPE.id);

  if (existing) {
    const fieldIds = new Set((existing.fields || []).map((f) => f.id));
    const missing = SITE_CONTENT_TYPE.fields
      .map((f) => f.id)
      .filter((id) => !fieldIds.has(id));

    if (missing.length === 0) {
      console.log("[site] content type already exists — no change");
      return;
    }

    // Additive only: append missing fields, never replace the array.
    console.log(`[site] adding missing fields: ${missing.join(", ")}`);
    if (DRY_RUN) return;

    const appended = SITE_CONTENT_TYPE.fields.filter((f) =>
      missing.includes(f.id)
    );
    const updated = await client.contentType.update(
      { contentTypeId: SITE_CONTENT_TYPE.id },
      { ...existing, fields: [...existing.fields, ...appended] }
    );
    await publishIfNeeded(client, SITE_CONTENT_TYPE.id, updated);
    console.log("[site] updated & published");
    return;
  }

  console.log("[site] creating content type");
  if (DRY_RUN) return;

  const created = await client.contentType.createWithId(
    { contentTypeId: SITE_CONTENT_TYPE.id },
    {
      name: SITE_CONTENT_TYPE.name,
      description: SITE_CONTENT_TYPE.description,
      displayField: SITE_CONTENT_TYPE.displayField,
      fields: SITE_CONTENT_TYPE.fields,
    }
  );
  await client.contentType.publish(
    { contentTypeId: created.sys.id },
    { sys: { version: created.sys.version } }
  );
  console.log("[site] created & published");
}

/**
 * Appends the optional `site` reference to one content type.
 * Read-modify-write: the existing fields array is spread, never rebuilt, so
 * unrelated fields and their validations are preserved exactly.
 */
async function addSiteFieldTo(client, contentTypeId) {
  const current = await getContentType(client, contentTypeId);

  if (!current) {
    console.log(`[${contentTypeId}] not found in this environment — skipped`);
    return { status: "missing" };
  }

  const fields = current.fields || [];
  if (fields.some((f) => f.id === SITE_FIELD.id)) {
    console.log(`[${contentTypeId}] already has 'site' — no change`);
    return { status: "unchanged" };
  }

  console.log(
    `[${contentTypeId}] adding 'site' (${fields.length} -> ${fields.length + 1} fields)`
  );
  if (DRY_RUN) return { status: "would-patch" };

  const updated = await client.contentType.update(
    { contentTypeId },
    { ...current, fields: [...fields, SITE_FIELD] }
  );
  await publishIfNeeded(client, contentTypeId, updated);
  return { status: "patched" };
}

async function main() {
  const client = buildClient();

  console.log(
    `\nSite scoping bootstrap — space ${SPACE_ID}, environment ${ENVIRONMENT_ID}${
      DRY_RUN ? " (DRY RUN — no writes)" : ""
    }\n`
  );

  await ensureSiteContentType(client);
  console.log("");

  const results = [];
  for (const contentTypeId of SITE_OWNED_CONTENT_TYPES) {
    results.push([contentTypeId, await addSiteFieldTo(client, contentTypeId)]);
  }

  const tally = results.reduce((acc, [, r]) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log(
    `\nDone. ${Object.entries(tally)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ")}`
  );
  console.log(
    "No entry data was modified. The 'site' field is optional, so existing content renders unchanged while site scoping is off.\n"
  );
}

main().catch((err) => {
  console.error("\nBootstrap failed:", err?.message || err);
  process.exitCode = 1;
});

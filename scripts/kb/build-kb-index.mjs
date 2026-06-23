import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// Load env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SPACE = process.env.NEXT_PUBLIC_CTF_SPACE_ID;
const TOKEN = process.env.NEXT_PUBLIC_CTF_DELIVERY_TOKEN;
const ENV = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";

const ORG = process.env.CTF_ORGANIZATION_ID || process.env.NEXT_PUBLIC_CTF_ORGANIZATION_ID;
const MANAGEMENT_TOKEN =
  process.env.CTF_MANAGEMENT_TOKEN ||
  process.env.CONTENTFUL_MANAGEMENT_TOKEN ||
  process.env.CMA_TOKEN;

if (!SPACE || !TOKEN) {
  console.warn("[KB] Missing Contentful credentials. Skipping KB index build.");
  process.exit(0);
}

const LOCALES_FILE = path.join(process.cwd(), "lib", "locales.json");
const OUT_DIR = path.join(process.cwd(), "data", "kb-index");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fetchAllArticles(locale) {
  const baseUrl = `https://cdn.contentful.com/spaces/${SPACE}/environments/${ENV}/entries`;

  const params = new URLSearchParams({
    content_type: "kbArticle",
    locale,
    include: "1",
    limit: "1000",
  });

  const url = `${baseUrl}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    console.warn(`[KB] Failed to fetch articles for ${locale}: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  // Build a map of included entries by ID so we can resolve reference links
  const includedEntries = Array.isArray(data.includes?.Entry) ? data.includes.Entry : [];
  const includedById = new Map();
  for (const inc of includedEntries) {
    if (inc?.sys?.id) includedById.set(inc.sys.id, inc);
  }

  const conceptIds = collectConceptIds(items);
  const conceptSlugsById = await fetchConceptSlugsById(conceptIds);

  const docs = items
    .map((it) => mapEntryToDoc(it, { conceptSlugsById, includedById }, locale))
    .filter(Boolean);
  return docs;
}

function collectConceptIds(items) {
  const ids = new Set();
  for (const it of items) {
    const concepts = it?.metadata?.concepts;
    if (!concepts) continue;
    const arr = Array.isArray(concepts) ? concepts : [concepts];
    for (const c of arr) {
      const id = c?.sys?.id;
      if (id) ids.add(id);
    }
  }
  return Array.from(ids);
}

async function fetchConceptSlugsById(conceptIds) {
  const map = new Map();
  if (!conceptIds.length) return map;
  if (!MANAGEMENT_TOKEN || !ORG) {
    console.warn(
      "[KB] Missing taxonomy credentials (CTF_MANAGEMENT_TOKEN + CTF_ORGANIZATION_ID). Cannot resolve taxonomy concept slugs."
    );
    return map;
  }

  const baseUrl = `https://api.contentful.com/organizations/${ORG}/taxonomy/concepts`;
  let authFailed = false;
  for (const conceptId of conceptIds) {
    try {
      const res = await fetch(`${baseUrl}/${conceptId}`, {
        headers: {
          Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
          "Content-Type": "application/vnd.contentful.management.v1+json",
        },
      });
      if (res.status === 401 || res.status === 403) {
        if (!authFailed) {
          authFailed = true;
          console.warn(
            "[KB] Taxonomy concept resolution is unauthorized (401/403). " +
              "Set a valid Contentful Management API token in CTF_MANAGEMENT_TOKEN (or CONTENTFUL_MANAGEMENT_TOKEN) " +
              "with access to the organization in CTF_ORGANIZATION_ID, then re-run build:kb-index."
          );
        }
        break;
      }
      if (!res.ok) {
        console.warn(
          `[KB] Failed to resolve taxonomy concept ${conceptId}: ${res.status} ${res.statusText}`
        );
        continue;
      }
      const data = await res.json();
      const notations = data?.notations;
      const slug =
        Array.isArray(notations) && typeof notations[0] === "string"
          ? notations[0]
          : typeof notations === "string"
            ? notations
            : null;
      if (slug) map.set(conceptId, slug);
    } catch (e) {
      console.warn(
        `[KB] Failed to resolve taxonomy concept ${conceptId}:`,
        e?.message || e
      );
    }
  }
  return map;
}

function getLocalizedField(fields, key, locale) {
  const f = fields?.[key];
  if (!f) return undefined;
  if (typeof f === "string") return f; // already localized string
  if (typeof f === "object" && f !== null) return f[locale] ?? f[Object.keys(f)[0]]; // best-effort
  return undefined;
}

function richTextToPlain(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(richTextToPlain).join(" ");
  if (typeof node === "object") {
    const n = node;
    if (n.nodeType === "text" && typeof n.value === "string") return n.value;
    if (Array.isArray(n.content)) return n.content.map(richTextToPlain).join(" ");
  }
  return "";
}

function mapEntryToDoc(entry, { conceptSlugsById, includedById }, locale) {
  try {
    const { sys, fields } = entry || {};
    const id = sys?.id;
    if (!id) return null;

    const title = getLocalizedField(fields, "title", locale) || "";
    const slug = getLocalizedField(fields, "slug", locale) || id;
    const summary = getLocalizedField(fields, "summary", locale) || "";
    const bodyRt = getLocalizedField(fields, "body", locale);
    const body = bodyRt ? richTextToPlain(bodyRt) : "";

    // Resolve groups from the `groups` reference field (links to kbGroup entries)
    const groups = [];
    const groupLinks = fields?.groups;
    if (Array.isArray(groupLinks)) {
      for (const link of groupLinks) {
        const linkedId = link?.sys?.id;
        if (!linkedId) continue;
        const resolved = includedById?.get?.(linkedId);
        if (resolved?.fields) {
          const groupSlug = getLocalizedField(resolved.fields, "slug", locale);
          if (groupSlug) groups.push(groupSlug);
        }
      }
    }

    // Resolve categories from the `categories` reference field (links to kbCategory entries)
    const categories = [];
    const catLinks = fields?.categories;
    if (Array.isArray(catLinks)) {
      for (const link of catLinks) {
        const linkedId = link?.sys?.id;
        if (!linkedId) continue;
        const resolved = includedById?.get?.(linkedId);
        if (resolved?.fields) {
          const catSlug = getLocalizedField(resolved.fields, "slug", locale);
          if (catSlug) categories.push(catSlug);
        }
      }
    }

    // Supplement from taxonomy concepts (secondary source)
    const concepts = entry?.metadata?.concepts;
    const conceptLinks = Array.isArray(concepts) ? concepts : concepts ? [concepts] : [];
    for (const c of conceptLinks) {
      const conceptId = c?.sys?.id;
      if (!conceptId) continue;
      const slugFromConcept = conceptSlugsById?.get?.(conceptId) || null;
      if (!slugFromConcept) continue;
      if (!categories.includes(slugFromConcept) && !groups.includes(slugFromConcept)) {
        groups.push(slugFromConcept);
      }
    }

    const updatedAt = entry?.sys?.updatedAt || null;

    return {
      id,
      slug,
      title,
      summary,
      body,
      categories,
      groups,
      updatedAt,
      locale,
      categoriesJoined: categories.join(" "),
      groupsJoined: groups.join(" "),
    };
  } catch (e) {
    return null;
  }
}

async function main() {
  ensureDir(OUT_DIR);

  // Load locales produced by lib/fetchLocales.mjs
  let locales = [];
  try {
    const raw = fs.readFileSync(LOCALES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    locales = Array.isArray(parsed) ? parsed.map((l) => l.code).filter(Boolean) : [];
  } catch (e) {
    console.warn("[KB] locales.json missing. Building only default 'en-US'.");
    locales = ["en-US"];
  }

  for (const locale of locales) {
    try {
      const docs = await fetchAllArticles(locale);
      const outFile = path.join(OUT_DIR, `kb-index.${locale}.json`);
      fs.writeFileSync(outFile, JSON.stringify({ version: Date.now(), locale, docs }, null, 2));
      console.log(`✅ KB index built for ${locale}: ${outFile} (${docs.length} docs)`);
    } catch (e) {
      console.warn(`[KB] Failed to build index for ${locale}:`, e?.message || e);
    }
  }
}

main().catch((e) => {
  console.error("[KB] Unhandled error building KB index:", e);
  process.exit(1);
});

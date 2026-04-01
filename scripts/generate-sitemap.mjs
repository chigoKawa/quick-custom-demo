/**
 * generate-sitemap.mjs
 *
 * Generates public/sitemap.xml from published landingPage entries.
 * Reads fullPath from entry if set; otherwise computes it from parent chain.
 *
 * Usage: node scripts/generate-sitemap.mjs
 *        npm run sitemap
 */

import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SPACE = process.env.NEXT_PUBLIC_CTF_SPACE_ID;
const TOKEN = process.env.NEXT_PUBLIC_CTF_DELIVERY_TOKEN;
const ENV = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";
const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://example.com").replace(/\/$/, "");
const HOME_SLUG = process.env.NEXT_PUBLIC_CTF_HOMEPAGE_SLUG || "home";
const LOCALE = "en-US";

if (!SPACE || !TOKEN) {
  console.warn("[sitemap] Missing Contentful credentials. Set NEXT_PUBLIC_CTF_SPACE_ID and NEXT_PUBLIC_CTF_DELIVERY_TOKEN.");
  process.exit(1);
}

/**
 * @typedef {{ id: string; title: string; slug: string; fullPath: string | null; parentId: string | null }} SitemapEntry
 */

/** @param {SitemapEntry[]} entries @param {string} entryId @param {number} depth @returns {string} */
function computeFullPath(entries, entryId, depth = 0) {
  if (depth > 20) return "/(cycle-detected)";

  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return "/unknown";

  if (entry.slug === HOME_SLUG) return "/";
  if (!entry.parentId) return "/" + entry.slug;

  const parentPath = computeFullPath(entries, entry.parentId, depth + 1);
  if (parentPath === "/(cycle-detected)") return "/(cycle-detected)";
  if (parentPath === "/") return "/" + entry.slug;
  return parentPath + "/" + entry.slug;
}

/** @param {string} path @returns {number} */
function getDepth(urlPath) {
  if (urlPath === "/") return 0;
  return urlPath.split("/").filter(Boolean).length;
}

/** @param {number} depth @returns {number} */
function getPriority(depth) {
  if (depth === 0) return 1.0;
  if (depth === 1) return 0.8;
  return 0.6;
}

async function fetchAllPages() {
  const baseUrl = `https://cdn.contentful.com/spaces/${SPACE}/environments/${ENV}/entries`;
  const allItems = [];
  let skip = 0;
  const limit = 200;
  let total = Infinity;

  while (allItems.length < total) {
    const params = new URLSearchParams({
      content_type: "landingPage",
      locale: LOCALE,
      select: "sys.id,fields.title,fields.slug,fields.fullPath,fields.parent",
      limit: String(limit),
      skip: String(skip),
    });

    const res = await fetch(`${baseUrl}?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      throw new Error(`Contentful API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    total = data.total;
    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      const fields = item.fields || {};
      allItems.push({
        id: item.sys.id,
        title: fields.title || "",
        slug: fields.slug || item.sys.id,
        fullPath: fields.fullPath || null,
        parentId: fields.parent?.sys?.id || null,
      });
    }

    skip += items.length;
    if (items.length === 0) break;
  }

  return allItems;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function main() {
  console.log("[sitemap] Fetching published landingPage entries...");
  const entries = await fetchAllPages();
  console.log(`[sitemap] Fetched ${entries.length} entries.`);

  const today = new Date().toISOString().split("T")[0];
  const urls = [];

  for (const entry of entries) {
    // Use stored fullPath if available; otherwise compute
    const path = entry.fullPath && entry.fullPath.trim()
      ? entry.fullPath.trim()
      : computeFullPath(entries, entry.id);

    if (path.includes("(cycle-detected)") || path.includes("unknown")) {
      console.warn(`[sitemap] Skipping ${entry.id} (${entry.slug}): path = ${path}`);
      continue;
    }

    const depth = getDepth(path);
    const priority = getPriority(depth);
    const loc = escapeXml(SITE_BASE_URL + path);

    urls.push({ loc, priority, lastmod: today });
  }

  // Sort by path for consistent output
  urls.sort((a, b) => a.loc.localeCompare(b.loc));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      ({ loc, priority, lastmod }) =>
        `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>`
    ),
    "</urlset>",
  ].join("\n");

  const outPath = path.join(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  console.log(`[sitemap] Written ${urls.length} URLs to ${outPath}`);
}

main().catch((err) => {
  console.error("[sitemap] Error:", err.message || err);
  process.exit(1);
});

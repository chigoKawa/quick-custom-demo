// Prune the `master` environment down to Rabobank-only content.
//
// Strategy: compute the set of entries/assets REACHABLE from the Rabobank
// roots (site settings, Rabobank landing pages, blog posts, app screens),
// plus any orphaned Rabobank-named entries (so we never lose Rabobank
// content). Everything else is foreign/junk and gets unpublished + deleted.
//
// Because kept entries only ever link to other kept entries, deleting the
// non-kept set can never leave a broken reference in the Rabobank site.
//
//   Dry run (default):  node scripts/cleanup-master-rabobank.mjs
//   Apply:              node scripts/cleanup-master-rabobank.mjs --apply

const SPACE = "ace0ba6p9v98";
const ENV = "master";
const TOKEN = process.env.CTF_MANAGEMENT_TOKEN;
const APPLY = process.argv.includes("--apply");
if (!TOKEN) {
  console.error("Set CTF_MANAGEMENT_TOKEN");
  process.exit(1);
}
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/${ENV}`;

// ---- Rabobank roots (keep these + everything they reference) --------------
const ROOTS = [
  "4ztHcledfu8ov9Fn8vYWZU", // siteSettings – Rabobank
  "4fCfHLeXvsWb5C8dgAgm0k", // LP home
  "1Fd8ksZuMeU4wL5hkJDX45", // LP help (Knowledge & Support)
  "1KkK0ji2BZvq2PN76uLsGG", // LP security (Sustainability & Security)
  "6f2vis9NDlcFV2MJjQuZXE", // LP business (Wholesale Banking)
  "4zIfX6HiIY0QWCoOeQAizh", // LP personal (Personal Banking)
  "2XcI5a8CtjYgkSmGE2HUpe", // LP blog (index)
  "2Q5bsr1m5BcM4sxGykstzE", // blogPost feeding-the-world
  "UdA6nqVoKuZ9ofM5zYvtA",  // blogPost cooperative-banking
  "1tnZPKoq0ld3iBRI78hkbq", // blogPost energy-transition
  "1HB4nLCkjMfHpKxbbGmxUd", // blogPost global-food-system
  "2aeNJ07jogkmpA4PJKdGo4", // appScreen home
  "2Hd7VWSzxpPm5Eyp4plrNo", // appScreen help
  "76Enmvj3ibUcICydb2pHSq", // appScreen messages
];

// Orphaned but genuinely-Rabobank entries are kept via name match.
const RABO_NAME = /rabobank|\brabo\b|spaarpotjes|^app (screen|module|widget|flag|nav|tile|article|faq|promo|navigation)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cma(path, opts = {}, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/vnd.contentful.management.v1+json",
        ...(opts.headers || {}),
      },
    });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * (i + 1));
      continue;
    }
    return res;
  }
  throw new Error(`Too many retries for ${path}`);
}

async function fetchAll(kind) {
  const items = [];
  let skip = 0;
  for (;;) {
    const res = await cma(`/${kind}?limit=100&skip=${skip}`);
    const data = await res.json();
    items.push(...data.items);
    if (skip + 100 >= data.total) break;
    skip += 100;
  }
  return items;
}

function nameOf(e) {
  const f = e.fields || {};
  for (const k of ["internalName", "internalTitle", "name", "title", "nt_name", "slug"]) {
    const v = f[k]?.["en-US"];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

// Collect Entry/Asset links anywhere inside an entry's fields.
function linksOf(entry, outEntries, outAssets) {
  const walk = (v) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const link = v.sys;
    if (link && link.type === "Link" && link.id) {
      if (link.linkType === "Entry") outEntries.add(link.id);
      else if (link.linkType === "Asset") outAssets.add(link.id);
      return;
    }
    for (const val of Object.values(v)) walk(val);
  };
  walk(entry.fields || {});
}

async function main() {
  console.log("Fetching all entries + assets…");
  const [entries, assets] = await Promise.all([fetchAll("entries"), fetchAll("assets")]);
  console.log(`  entries: ${entries.length}, assets: ${assets.length}`);

  const byId = new Map(entries.map((e) => [e.sys.id, e]));
  const assetIds = new Set(assets.map((a) => a.sys.id));

  // Seed keep-set: roots + Rabobank-named entries.
  const keepEntries = new Set();
  const keepAssets = new Set();
  const queue = [];
  for (const id of ROOTS) if (byId.has(id)) { keepEntries.add(id); queue.push(id); }
  for (const e of entries) {
    if (RABO_NAME.test(nameOf(e)) && !keepEntries.has(e.sys.id)) {
      keepEntries.add(e.sys.id);
      queue.push(e.sys.id);
    }
  }

  // BFS closure over links.
  while (queue.length) {
    const id = queue.shift();
    const e = byId.get(id);
    if (!e) continue;
    const le = new Set(), la = new Set();
    linksOf(e, le, la);
    for (const cid of le) if (byId.has(cid) && !keepEntries.has(cid)) { keepEntries.add(cid); queue.push(cid); }
    for (const aid of la) if (assetIds.has(aid)) keepAssets.add(aid);
  }

  const delEntries = entries.filter((e) => !keepEntries.has(e.sys.id));
  const delAssets = assets.filter((a) => !keepAssets.has(a.sys.id));

  // ---- Report ----
  const FOREIGN = /christie|pooch|europris|metro|east.?west|ewr|paddle|poppy|vanthournout|vtc|deep river|giacometti|francis bacon/i;
  console.log(`\nKEEP  entries=${keepEntries.size} assets=${keepAssets.size}`);
  console.log(`DELETE entries=${delEntries.length} assets=${delAssets.length}`);

  for (const ct of ["landingPage", "campaign", "blogPost", "siteSettings"]) {
    const del = delEntries.filter((e) => e.sys.contentType.sys.id === ct);
    const keep = [...keepEntries].map((id) => byId.get(id)).filter((e) => e && e.sys.contentType.sys.id === ct);
    console.log(`\n-- ${ct}: KEEP ${keep.length} / DELETE ${del.length}`);
    for (const e of keep) console.log(`   KEEP   ${e.sys.id}  ${nameOf(e)}`);
    for (const e of del) console.log(`   delete ${e.sys.id}  ${nameOf(e)}`);
  }

  // Warn about anything suspicious.
  const keptForeign = [...keepEntries].map((id) => byId.get(id)).filter((e) => e && FOREIGN.test(nameOf(e)));
  if (keptForeign.length) {
    console.log(`\n⚠ KEPT entries with foreign-looking names (shared refs?):`);
    for (const e of keptForeign) console.log(`   ${e.sys.id}  [${e.sys.contentType.sys.id}]  ${nameOf(e)}`);
  }
  const delRabo = delEntries.filter((e) => /rabobank|\brabo\b/i.test(nameOf(e)));
  if (delRabo.length) {
    console.log(`\n⚠ DELETING entries with Rabobank-looking names (check!):`);
    for (const e of delRabo) console.log(`   ${e.sys.id}  [${e.sys.contentType.sys.id}]  ${nameOf(e)}`);
  }

  if (!APPLY) {
    console.log(`\nDry run only. Re-run with --apply to unpublish + delete.`);
    return;
  }

  await deleteAll(delEntries, "entries");
  await deleteAll(delAssets, "assets");
  console.log("\nDone.");
}

// Releases we've already torn down (shared across many entries).
const deletedReleases = new Set();
async function deleteReleaseOf(text) {
  const m = text.match(/"value":"([^"]+)"/);
  const rid = m && m[1];
  if (!rid || deletedReleases.has(rid)) return !!rid;
  deletedReleases.add(rid);
  const r = await cma(`/releases/${rid}`, { method: "DELETE" });
  console.log(`   released ${rid}: ${r.status}`);
  return true;
}

async function deleteOne(kind, it) {
  const id = it.sys.id;
  if (it.sys.publishedVersion) await cma(`/${kind}/${id}/published`, { method: "DELETE" });
  let res = await cma(`/${kind}/${id}`, { method: "DELETE" });
  if (res.ok || res.status === 404) return;
  let text = await res.text();
  // If locked in a release, delete the release then retry.
  if (res.status === 422 && text.includes("UsedInRelease")) {
    await deleteReleaseOf(text);
    res = await cma(`/${kind}/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 404) return;
    text = await res.text();
  }
  throw new Error(`${res.status} ${text.slice(0, 200)}`);
}

// Unpublish (if published) then delete, with limited concurrency.
async function deleteAll(items, kind) {
  console.log(`\nDeleting ${items.length} ${kind}…`);
  let done = 0, failed = 0;
  const CONCURRENCY = 6;
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const it = items[idx++];
      try {
        await deleteOne(kind, it);
        done++;
      } catch (err) {
        failed++;
        console.log(`   FAIL ${kind}/${it.sys.id}: ${String(err).slice(0, 200)}`);
      }
      if ((done + failed) % 50 === 0) console.log(`   …${done + failed}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`   ${kind}: deleted ${done}, failed ${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

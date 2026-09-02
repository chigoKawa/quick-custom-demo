// Read-only audit of the `master` environment: lists page-level containers
// so we can classify Rabobank vs foreign before any deletion.
const SPACE = "ace0ba6p9v98";
const ENV = "master";
const TOKEN = process.env.CTF_MANAGEMENT_TOKEN;
if (!TOKEN) {
  console.error("Set CTF_MANAGEMENT_TOKEN");
  process.exit(1);
}
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/${ENV}`;

async function cma(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function allOfType(ct) {
  const items = [];
  let skip = 0;
  for (;;) {
    const data = await cma(`/entries?content_type=${ct}&limit=100&skip=${skip}`);
    items.push(...data.items);
    if (data.items.length < 100) break;
    skip += 100;
  }
  return items;
}

function pick(fields, keys) {
  for (const k of keys) {
    const v = fields?.[k]?.["en-US"];
    if (typeof v === "string") return v;
  }
  return "";
}

for (const ct of ["landingPage", "campaign", "blogPost"]) {
  const items = await allOfType(ct);
  console.log(`\n===== ${ct} (${items.length}) =====`);
  for (const e of items) {
    const f = e.fields || {};
    const name = pick(f, ["internalName", "internalTitle", "name", "title", "pageTitle"]);
    const slug = pick(f, ["slug"]);
    console.log(`${e.sys.id}\t${slug}\t${name}`);
  }
}

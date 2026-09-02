const SPACE = "ace0ba6p9v98";
const ENV = "master";
const TOKEN = process.env.CTF_MANAGEMENT_TOKEN;
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/${ENV}`;
const H = { Authorization: `Bearer ${TOKEN}` };

const res = await fetch(`${BASE}/releases?limit=100`, { headers: H });
const data = await res.json();
if (!res.ok) { console.error(res.status, JSON.stringify(data)); process.exit(1); }
console.log(`releases: ${data.items?.length ?? 0} (total ${data.total})`);
for (const r of data.items || []) {
  console.log(`${r.sys.id}\t${r.sys.status ?? ""}\tentities=${r.entities?.items?.length ?? 0}\t${r.title}`);
}

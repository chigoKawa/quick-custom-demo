#!/usr/bin/env node
/**
 * Build and (optionally) upload a Contentful App Function bundle from this
 * monorepo. Runs `contentful-app-scripts build-functions` and (with --upload)
 * `contentful-app-scripts upload` against `app/ctf-apps/<name>/`.
 *
 * Why this exists: each app used to ship its own package.json + node_modules
 * + .env, duplicating deps and creating credential-leak risk. Now everything
 * lives at the repo root:
 *   - Deps: root package.json (`@contentful/app-scripts`, `@contentful/node-apps-toolkit`, `contentful-management`)
 *   - Config: root `.env` (gitignored) with per-app prefixed vars
 *   - Source: app/ctf-apps/<name>/ (only source files, no node_modules)
 *   - Output: app/ctf-apps/<name>/build/ (gitignored)
 *
 * Usage:
 *   node scripts/build-ctf-app.mjs <app-name>            # build only
 *   node scripts/build-ctf-app.mjs <app-name> --upload   # build + upload
 *
 * Env vars (in root .env):
 *   CTF_MANAGEMENT_TOKEN                                   ← shared CMA token
 *   CTF_ORG_ID                                             ← Contentful org id
 *   CTF_APP_<APP_NAME_UPPER_SNAKE>_APP_DEF_ID              ← per-app definition id
 *
 *   e.g. for `auto-translate-article`:
 *     CTF_APP_AUTO_TRANSLATE_ARTICLE_APP_DEF_ID=...
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const APPS_DIR = path.join(REPO_ROOT, "app", "ctf-apps");
const CLI = path.join(
  REPO_ROOT,
  "node_modules",
  "@contentful",
  "app-scripts",
  "lib",
  "bin.js"
);

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error("Usage: node scripts/build-ctf-app.mjs <app-name> [--upload]");
  console.error("\nAvailable apps:");
  try {
    for (const name of readdirSync(APPS_DIR)) {
      const manifest = path.join(APPS_DIR, name, "contentful-app-manifest.json");
      if (existsSync(manifest)) console.error(`  - ${name}`);
    }
  } catch {
    // ignore
  }
  process.exit(msg ? 1 : 0);
}

// ---------- args ----------

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length !== 1) usage("Exactly one app name required.");
const appName = positional[0];
const upload = flags.has("--upload");

const appDir = path.join(APPS_DIR, appName);
if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
  usage(`App directory not found: ${appDir}`);
}
if (!existsSync(path.join(appDir, "contentful-app-manifest.json"))) {
  usage(`No contentful-app-manifest.json in ${appDir}`);
}
if (!existsSync(CLI)) {
  usage(
    "@contentful/app-scripts is not installed. Run `npm install` at the repo root."
  );
}

// ---------- helpers ----------

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, {
      stdio: "inherit",
      env: process.env,
      ...opts,
    });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on("error", reject);
  });
}

/** UPPER_SNAKE conversion for env var lookup: `auto-translate-article` → `AUTO_TRANSLATE_ARTICLE`. */
function envPrefix(name) {
  return name.replace(/-/g, "_").toUpperCase();
}

// ---------- build ----------

console.log(`\n=== Building Contentful function for "${appName}" ===`);
await run("node", [CLI, "build-functions", "--ci"], { cwd: appDir });
console.log(`✔ Built to ${path.relative(REPO_ROOT, path.join(appDir, "build"))}\n`);

// ---------- upload (optional) ----------

if (upload) {
  const orgId =
    process.env.CTF_ORGANIZATION_ID ||
    process.env.CTF_ORG_ID;
  const token =
    process.env.CTF_MANAGEMENT_TOKEN ||
    process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  const appDefEnvVar = `CTF_APP_${envPrefix(appName)}_APP_DEF_ID`;
  const appDefId = process.env[appDefEnvVar];

  const missing = [];
  if (!orgId) missing.push("CTF_ORGANIZATION_ID");
  if (!token) missing.push("CTF_MANAGEMENT_TOKEN");
  if (!appDefId) missing.push(appDefEnvVar);
  if (missing.length > 0) {
    console.error(
      `\nCannot upload — missing env vars: ${missing.join(", ")}. Set them in the repo root .env file.`
    );
    process.exit(1);
  }

  console.log(`=== Uploading bundle for "${appName}" ===`);
  await run(
    "node",
    [
      CLI,
      "upload",
      "--ci",
      "--bundle-dir",
      "build",
      "--organization-id",
      orgId,
      "--definition-id",
      appDefId,
      "--token",
      token,
    ],
    { cwd: appDir }
  );
  console.log(`✔ Uploaded and activated bundle.\n`);
}

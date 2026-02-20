import fs from "fs";
import path from "path";
import type { KbIndexFile } from "./types";

const KB_DIR = path.join(process.cwd(), "data", "kb-index");

// In-memory cache per-locale
const CACHE: Map<string, { index: KbIndexFile; mtimeMs: number }> = new Map();

function getIndexPath(locale: string) {
  return path.join(KB_DIR, `kb-index.${locale}.json`);
}

export function loadKbIndexFromDisk(locale: string): KbIndexFile | null {
  try {
    const p = getIndexPath(locale);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf-8");
    const json = JSON.parse(raw) as KbIndexFile;
    if (!json || !Array.isArray(json.docs)) return null;
    return json;
  } catch {
    return null;
  }
}

export function getKbIndex(locale: string): KbIndexFile | null {
  try {
    const p = getIndexPath(locale);
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      const prev = CACHE.get(locale);
      if (!prev || prev.mtimeMs !== stat.mtimeMs) {
        const next = loadKbIndexFromDisk(locale);
        if (!next) return null;
        CACHE.set(locale, { index: next, mtimeMs: stat.mtimeMs });
        return next;
      }
      return prev.index;
    }
    return null;
  } catch {
    return null;
  }
}

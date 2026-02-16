import type {
  BookCover,
  BookDetail,
  BookListItem,
  CatalogDebug,
  CatalogIdType,
} from "./open-library.types";

const OPEN_LIBRARY_BASE = "https://openlibrary.org";

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeMaybeString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function coverUrlFromCoverI(coverI: number, size: "S" | "M" | "L" = "L"): string {
  return `https://covers.openlibrary.org/b/id/${coverI}-${size}.jpg`;
}

function coverUrlFromIsbn(isbn: string, size: "S" | "M" | "L" = "L"): string {
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-${size}.jpg`;
}

function internalHrefFromIds(ids: { isbn13?: string; olid?: string; workId?: string }): string {
  if (ids.isbn13) return `/p/isbn13/${encodeURIComponent(ids.isbn13)}`;
  if (ids.olid) return `/p/olid/${encodeURIComponent(ids.olid)}`;
  if (ids.workId) return `/p/work/${encodeURIComponent(ids.workId)}`;
  return "/p";
}

function hashStringToUint32(input: string): number {
  // FNV-1a 32-bit
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function fakeUsdPriceForBook(seed: {
  isbn13?: string;
  olid?: string;
  title?: string;
}): { amount: number; currency: "USD"; formatted: string } {
  const key =
    seed.isbn13 ??
    seed.olid ??
    (seed.title ? `title:${seed.title}` : "unknown");
  const h = hashStringToUint32(key);

  // Price buckets typical for books. Deterministic per key.
  const min = 7.99;
  const max = 34.99;
  const span = max - min;
  const normalized = h / 0xffffffff;
  const raw = min + normalized * span;

  // Snap to 0.99 endings for nicer demo prices.
  const dollars = Math.max(7, Math.min(34, Math.floor(raw)));
  const amount = Number(`${dollars}.99`);

  return {
    amount,
    currency: "USD",
    formatted: formatUsd(amount),
  };
}

export function parseCatalogIdType(value: string | null): CatalogIdType | null {
  if (value === "ISBN13" || value === "OLID" || value === "WORK") return value;
  return null;
}

export function parseDebugFlag(value: string | null): boolean {
  return value === "1";
}

export function parseLimit(value: string | null, defaultValue = 10): number {
  const asNum = value ? Number(value) : defaultValue;
  return clampInt(Number.isFinite(asNum) ? asNum : defaultValue, 1, 50);
}

async function fetchJson<T>(
  url: string,
  opts: {
    revalidateSeconds: number;
  }
): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  const res = await fetch(url, {
    next: { revalidate: opts.revalidateSeconds },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, text };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}

type OpenLibraryApiBooksItem = {
  title?: string;
  subtitle?: string;
  authors?: Array<{ name?: string }>;
  number_of_pages?: number;
  publish_date?: string;
  publishers?: Array<{ name?: string }>;
  cover?: { small?: string; medium?: string; large?: string };
  identifiers?: {
    isbn_13?: string[];
    openlibrary?: string[];
  };
  subjects?: Array<{ name?: string }>;
  notes?: unknown;
  url?: string;
};

type OpenLibraryApiBooksResponse = Record<string, OpenLibraryApiBooksItem | undefined>;

type OpenLibraryBookJson = {
  title?: string;
  subtitle?: string;
  description?: string | { value?: string };
  subjects?: string[];
  works?: Array<{ key?: string }>;
  authors?: Array<{ key?: string }>;
};

type OpenLibraryWorkJson = {
  title?: string;
  description?: string | { value?: string };
  subjects?: string[];
  covers?: number[];
  authors?: Array<{ author?: { key?: string } }>;
};

type OpenLibraryAuthorJson = {
  name?: string;
};

type OpenLibrarySearchDoc = {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  edition_key?: string[];
  cover_edition_key?: string;
  key?: string;
};

type OpenLibrarySearchResponse = {
  numFound?: number;
  docs?: OpenLibrarySearchDoc[];
};

function descriptionFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string") return normalizeMaybeString(value);
  if (value && typeof value === "object") {
    const v = (value as { value?: unknown }).value;
    if (typeof v === "string") return normalizeMaybeString(v);
  }
  return undefined;
}

function coverFromApiBooks(item: OpenLibraryApiBooksItem | undefined): BookCover | undefined {
  const cover = item?.cover;
  if (!cover) return undefined;
  const out: BookCover = {};
  if (normalizeMaybeString(cover.small)) out.small = cover.small;
  if (normalizeMaybeString(cover.medium)) out.medium = cover.medium;
  if (normalizeMaybeString(cover.large)) out.large = cover.large;
  return Object.keys(out).length > 0 ? out : undefined;
}

function pickIsbn13(ids?: string[]): string | undefined {
  const found = ids?.find((v) => typeof v === "string" && v.replaceAll("-", "").length === 13);
  return found ? found.replaceAll("-", "") : undefined;
}

export async function resolveBookDetail(
  params: {
    id: string;
    idType: CatalogIdType;
    revalidateSeconds: number;
    debug: boolean;
  }
): Promise<
  | { ok: true; book: BookDetail; debug?: CatalogDebug }
  | { ok: false; status: number; error: string; details?: unknown; debug?: CatalogDebug }
> {
  const ttl = clampInt(params.revalidateSeconds, 1, 60 * 60);
  const upstreamUrls: string[] = [];

  if (params.idType === "WORK") {
    const workId = params.id.trim();
    const workUrl = `${OPEN_LIBRARY_BASE}/works/${encodeURIComponent(workId)}.json`;
    upstreamUrls.push(workUrl);

    const workRes = await fetchJson<OpenLibraryWorkJson>(workUrl, {
      revalidateSeconds: ttl,
    });

    if (!workRes.ok) {
      return {
        ok: false,
        status: workRes.status === 404 ? 404 : 502,
        error: workRes.status === 404 ? "Book not found" : "Open Library upstream error",
        details: { status: workRes.status, text: workRes.text },
        debug: params.debug ? { upstreamUrls, queryUsed: workUrl } : undefined,
      };
    }

    const workJson = workRes.data;

    const authorKeys = (workJson.authors ?? [])
      .map((a) => normalizeMaybeString(a.author?.key))
      .filter((v): v is string => Boolean(v))
      .slice(0, 6);

    const authors: { name: string }[] = [];
    for (const key of authorKeys) {
      const authorUrl = `${OPEN_LIBRARY_BASE}${key}.json`;
      upstreamUrls.push(authorUrl);
      const authorRes = await fetchJson<OpenLibraryAuthorJson>(authorUrl, {
        revalidateSeconds: ttl,
      });
      if (authorRes.ok) {
        const name = normalizeMaybeString(authorRes.data.name);
        if (name) authors.push({ name });
      }
    }

    const title = normalizeMaybeString(workJson.title) ?? "";
    const description = descriptionFromUnknown(workJson.description);
    const subjects = (workJson.subjects ?? [])
      .map((s) => normalizeMaybeString(s))
      .filter((v): v is string => Boolean(v));

    const coverId = Array.isArray(workJson.covers) ? workJson.covers[0] : undefined;
    const coverLarge =
      typeof coverId === "number" ? coverUrlFromCoverI(coverId, "L") : undefined;

    const book: BookDetail = {
      id: params.id,
      idType: params.idType,
      title,
      authors,
      description,
      subjects: subjects.length > 0 ? subjects : undefined,
      workId,
      cover: coverLarge ? { large: coverLarge } : undefined,
      price: fakeUsdPriceForBook({ title }),
      href: internalHrefFromIds({ workId }),
    };

    return {
      ok: true,
      book,
      debug: params.debug ? { upstreamUrls, queryUsed: workUrl } : undefined,
    };
  }

  if (params.idType === "ISBN13") {
    const isbn = params.id.replaceAll("-", "").trim();
    const url = `${OPEN_LIBRARY_BASE}/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    upstreamUrls.push(url);

    const res = await fetchJson<OpenLibraryApiBooksResponse>(url, {
      revalidateSeconds: ttl,
    });

    if (!res.ok) {
      return {
        ok: false,
        status: 502,
        error: "Open Library upstream error",
        details: { status: res.status, text: res.text },
        debug: params.debug ? { upstreamUrls, queryUsed: url } : undefined,
      };
    }

    const item = res.data[`ISBN:${isbn}`];
    if (!item) {
      return {
        ok: false,
        status: 404,
        error: "Book not found",
        details: { id: isbn, idType: params.idType },
        debug: params.debug ? { upstreamUrls, queryUsed: url } : undefined,
      };
    }

    const isbn13 = pickIsbn13(item.identifiers?.isbn_13) ?? isbn;
    const olid = item.identifiers?.openlibrary?.[0];

    const cover = coverFromApiBooks(item);
    const fallbackCoverLarge = isbn13 ? coverUrlFromIsbn(isbn13, "L") : undefined;

    const title = normalizeMaybeString(item.title) ?? "";
    const subtitle = normalizeMaybeString(item.subtitle);
    const authors = (item.authors ?? [])
      .map((a) => normalizeMaybeString(a.name))
      .filter((v): v is string => Boolean(v))
      .map((name) => ({ name }));

    const subjects = (item.subjects ?? [])
      .map((s) => normalizeMaybeString(s.name))
      .filter((v): v is string => Boolean(v));

    const book: BookDetail = {
      id: params.id,
      idType: params.idType,
      title,
      subtitle,
      authors,
      description: descriptionFromUnknown(item.notes),
      subjects: subjects.length > 0 ? subjects : undefined,
      isbn13,
      olid,
      cover: cover ?? (fallbackCoverLarge ? { large: fallbackCoverLarge } : undefined),
      price: fakeUsdPriceForBook({ isbn13, olid, title }),
      href: internalHrefFromIds({ isbn13, olid }),
    };

    return {
      ok: true,
      book,
      debug: params.debug ? { upstreamUrls, queryUsed: url } : undefined,
    };
  }

  const olid = params.id.trim();
  const bookUrl = `${OPEN_LIBRARY_BASE}/books/${encodeURIComponent(olid)}.json`;
  upstreamUrls.push(bookUrl);

  const bookRes = await fetchJson<OpenLibraryBookJson>(bookUrl, {
    revalidateSeconds: ttl,
  });

  if (!bookRes.ok) {
    return {
      ok: false,
      status: 502,
      error: "Open Library upstream error",
      details: { status: bookRes.status, text: bookRes.text },
      debug: params.debug ? { upstreamUrls, queryUsed: bookUrl } : undefined,
    };
  }

  const bookJson = bookRes.data;
  const workKey = bookJson.works?.[0]?.key;
  const workIdFromEdition = workKey
    ? normalizeMaybeString(workKey.split("/").pop())
    : undefined;

  let workJson: OpenLibraryWorkJson | null = null;
  if (workKey) {
    const workUrl = `${OPEN_LIBRARY_BASE}${workKey}.json`;
    upstreamUrls.push(workUrl);
    const workRes = await fetchJson<OpenLibraryWorkJson>(workUrl, {
      revalidateSeconds: ttl,
    });
    if (workRes.ok) workJson = workRes.data;
  }

  const authorKeys = (bookJson.authors ?? [])
    .map((a) => normalizeMaybeString(a.key))
    .filter((v): v is string => Boolean(v))
    .slice(0, 6);

  const authors: { name: string }[] = [];
  for (const key of authorKeys) {
    const authorUrl = `${OPEN_LIBRARY_BASE}${key}.json`;
    upstreamUrls.push(authorUrl);
    const authorRes = await fetchJson<OpenLibraryAuthorJson>(authorUrl, {
      revalidateSeconds: ttl,
    });
    if (authorRes.ok) {
      const name = normalizeMaybeString(authorRes.data.name);
      if (name) authors.push({ name });
    }
  }

  const title =
    normalizeMaybeString(bookJson.title) ??
    normalizeMaybeString(workJson?.title) ??
    "";

  const subtitle = normalizeMaybeString(bookJson.subtitle);

  const description =
    descriptionFromUnknown(bookJson.description) ??
    descriptionFromUnknown(workJson?.description);

  const subjects = (bookJson.subjects ?? workJson?.subjects ?? [])
    .map((s) => normalizeMaybeString(s))
    .filter((v): v is string => Boolean(v));

  const book: BookDetail = {
    id: params.id,
    idType: params.idType,
    title,
    subtitle,
    authors,
    description,
    subjects: subjects.length > 0 ? subjects : undefined,
    olid,
    workId: workIdFromEdition,
    cover: { large: `https://covers.openlibrary.org/b/olid/${encodeURIComponent(olid)}-L.jpg` },
    price: fakeUsdPriceForBook({ olid, title }),
    href: internalHrefFromIds({ olid }),
  };

  return {
    ok: true,
    book,
    debug: params.debug ? { upstreamUrls, queryUsed: bookUrl } : undefined,
  };
}

function pickFirstIsbn13FromAny(isbns: unknown): string | undefined {
  if (!Array.isArray(isbns)) return undefined;
  const normalized = isbns
    .map((v) => (typeof v === "string" ? v.replaceAll("-", "") : ""))
    .filter((v) => v.length === 13);
  return normalized[0] || undefined;
}

function pickEditionOlidFromDoc(doc: OpenLibrarySearchDoc): string | undefined {
  const candidates: string[] = [];
  if (Array.isArray(doc.edition_key)) {
    for (const v of doc.edition_key) {
      const n = normalizeMaybeString(v);
      if (n) candidates.push(n);
    }
  }
  const cover = normalizeMaybeString(doc.cover_edition_key);
  if (cover) candidates.push(cover);

  return candidates.find((v) => /^OL\d+M$/.test(v)) || undefined;
}

function pickWorkIdFromDoc(doc: OpenLibrarySearchDoc): string | undefined {
  const raw = normalizeMaybeString(doc.key);
  if (!raw) return undefined;
  // API can return "OL...W" or "/works/OL...W"
  const trimmed = raw.startsWith("/") ? raw.split("/").pop() : raw;
  if (!trimmed) return undefined;
  return /^OL\d+W$/.test(trimmed) ? trimmed : undefined;
}

export async function searchCatalog(
  params: {
    q: string;
    limit: number;
    offset?: number;
    revalidateSeconds: number;
    debug: boolean;
  }
): Promise<
  | { ok: true; items: BookListItem[]; total: number; debug?: CatalogDebug }
  | { ok: false; status: number; error: string; details?: unknown; debug?: CatalogDebug }
> {
  const q = params.q.trim();
  if (!q) {
    return {
      ok: false,
      status: 400,
      error: "Missing query",
    };
  }

  const limit = clampInt(params.limit, 1, 50);
  const offset = clampInt(params.offset ?? 0, 0, 10000);
  const ttl = clampInt(params.revalidateSeconds, 1, 60 * 60);

  const url = `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
  const upstreamUrls = [url];

  const res = await fetchJson<OpenLibrarySearchResponse>(url, {
    revalidateSeconds: ttl,
  });

  if (!res.ok) {
    return {
      ok: false,
      status: 502,
      error: "Open Library upstream error",
      details: { status: res.status, text: res.text },
      debug: params.debug ? { upstreamUrls, queryUsed: url } : undefined,
    };
  }

  const docs = Array.isArray(res.data.docs) ? res.data.docs : [];
  const items: BookListItem[] = docs.slice(0, limit).map((doc) => {
    const isbn13 = pickFirstIsbn13FromAny(doc.isbn);
    const olid = pickEditionOlidFromDoc(doc);
    const workId = pickWorkIdFromDoc(doc);

    const coverUrl =
      typeof doc.cover_i === "number"
        ? coverUrlFromCoverI(doc.cover_i, "L")
        : isbn13
        ? coverUrlFromIsbn(isbn13, "L")
        : undefined;

    const title = normalizeMaybeString(doc.title) ?? "";
    const authors = (doc.author_name ?? [])
      .map((n) => normalizeMaybeString(n))
      .filter((v): v is string => Boolean(v))
      .slice(0, 6)
      .map((name) => ({ name }));

    return {
      title,
      authors,
      isbn13,
      olid,
      workId,
      coverUrl,
      price: fakeUsdPriceForBook({ isbn13, olid, title }),
      href: internalHrefFromIds({ isbn13, olid, workId }),
    };
  });

  const total = typeof res.data.numFound === "number" ? res.data.numFound : items.length;

  return {
    ok: true,
    items,
    total,
    debug: params.debug
      ? {
          upstreamUrls,
          queryUsed: url,
          counts: { returned: items.length, upstreamDocs: docs.length, total },
        }
      : undefined,
  };
}

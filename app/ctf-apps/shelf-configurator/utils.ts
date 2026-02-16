/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AppInstallationParameters, ShelfConfigV1 } from "./types";

export function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeShelfConfig(input: Partial<ShelfConfigV1>): ShelfConfigV1 {
  const internalName = normalizeOptionalString(input.internalName);
  const query = normalizeOptionalString(input.query) ?? "";

  const limitRaw = typeof input.limit === "number" ? input.limit : undefined;
  const limit = limitRaw ? clampInt(limitRaw, 1, 50) : undefined;

  const pinned = Array.isArray(input.pinned)
    ? input.pinned
        .map((p) => ({ idType: p.idType, id: normalizeOptionalString(p.id) }))
        .filter((p): p is { idType: any; id: string } => Boolean(p.id))
        .map((p) => ({ idType: p.idType, id: p.id }))
    : undefined;

  const presentation = input.presentation
    ? {
        variant: input.presentation.variant,
        showPrice:
          typeof input.presentation.showPrice === "boolean"
            ? input.presentation.showPrice
            : undefined,
        showBadge:
          typeof input.presentation.showBadge === "boolean"
            ? input.presentation.showBadge
            : undefined,
      }
    : undefined;

  const cleanedPresentation = presentation
    ? Object.fromEntries(
        Object.entries(presentation).filter(([, v]) => v !== undefined)
      )
    : undefined;

  const advanced = input.advanced
    ? {
        title: normalizeOptionalString(input.advanced.title),
        author: normalizeOptionalString(input.advanced.author),
        subject: normalizeOptionalString(input.advanced.subject),
        publisher: normalizeOptionalString(input.advanced.publisher),
        language: normalizeOptionalString(input.advanced.language),
        firstPublishYear:
          typeof input.advanced.firstPublishYear === "number" &&
          Number.isFinite(input.advanced.firstPublishYear)
            ? input.advanced.firstPublishYear
            : undefined,
        firstPublishYearRange: input.advanced.firstPublishYearRange
          ? {
              from:
                typeof input.advanced.firstPublishYearRange.from === "number" &&
                Number.isFinite(input.advanced.firstPublishYearRange.from)
                  ? input.advanced.firstPublishYearRange.from
                  : undefined,
              to:
                typeof input.advanced.firstPublishYearRange.to === "number" &&
                Number.isFinite(input.advanced.firstPublishYearRange.to)
                  ? input.advanced.firstPublishYearRange.to
                  : undefined,
            }
          : undefined,
        ebookAccess:
          input.advanced.ebookAccess === "no_ebook" ||
          input.advanced.ebookAccess === "printdisabled" ||
          input.advanced.ebookAccess === "borrowable" ||
          input.advanced.ebookAccess === "public"
            ? input.advanced.ebookAccess
            : undefined,
        sort:
          input.advanced.sort === "new" ||
          input.advanced.sort === "old" ||
          input.advanced.sort === "rating" ||
          input.advanced.sort === "editions" ||
          input.advanced.sort === "random"
            ? input.advanced.sort
            : undefined,
        hasFulltext:
          typeof input.advanced.hasFulltext === "boolean"
            ? input.advanced.hasFulltext
            : undefined,
      }
    : undefined;

  const cleanedAdvanced = advanced
    ? Object.fromEntries(
        Object.entries(advanced).filter(([, v]) => v !== undefined)
      )
    : undefined;

  const config: ShelfConfigV1 = {
    version: 1,
    mode: "search",
    query,
  };

  if (internalName) config.internalName = internalName;
  if (limit) config.limit = limit;
  if (pinned && pinned.length > 0) config.pinned = pinned;
  if (cleanedPresentation && Object.keys(cleanedPresentation).length > 0) {
    config.presentation = cleanedPresentation as ShelfConfigV1["presentation"];
  }
  if (cleanedAdvanced && Object.keys(cleanedAdvanced).length > 0) {
    config.advanced = cleanedAdvanced as ShelfConfigV1["advanced"];
  }
  if (typeof input.debug === "boolean") config.debug = input.debug;

  return config;
}

export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

export function validateTemplateUrl(
  template: string,
  requiredPlaceholders: string[]
): string[] {
  const errors: string[] = [];

  const trimmed = template.trim();
  if (!trimmed) {
    errors.push("Template is required");
    return errors;
  }

  for (const ph of requiredPlaceholders) {
    if (!trimmed.includes(`{{${ph}}}`)) {
      errors.push(`Missing required placeholder: {{${ph}}}`);
    }
  }

  // Best-effort URL validation by replacing placeholders with safe values.
  const sample = fillTemplate(trimmed, {
    q: encodeURIComponent("example"),
    limit: "10",
    debug: "0",
    id: "OL1M",
    idType: "OLID",
  });

  try {
    // eslint-disable-next-line no-new
    new URL(sample);
  } catch {
    errors.push("Template is not a valid URL after placeholder substitution");
  }

  return errors;
}

export async function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; error: string; details?: unknown }
> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");
    const json = (() => {
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    })();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: (json && (json.error as string)) || "Request failed",
        details: json?.details ?? json ?? text,
      };
    }

    return { ok: true, data: (json as T) ?? ({} as T), status: res.status };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      error: isAbort ? `Request timed out after ${timeoutMs}ms` : "Network error",
      details: isAbort ? undefined : String(err),
    };
  } finally {
    clearTimeout(id);
  }
}

export function getDefaultsFromParams(params?: AppInstallationParameters) {
  return {
    catalogSearchUrlTemplate:
      params?.catalogSearchUrlTemplate ??
      "http://localhost:3000/api/catalog/search?q={{q}}&limit={{limit}}&debug={{debug}}",
    bookDetailUrlTemplate:
      params?.bookDetailUrlTemplate ??
      "http://localhost:3000/api/catalog/books/{{id}}?idType={{idType}}&debug={{debug}}",
    defaultLimit: params?.defaultLimit ?? 10,
    requestTimeoutMs: params?.requestTimeoutMs ?? 8000,
  };
}

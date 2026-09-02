import { createClient } from "contentful";
import type { EntryCollection, EntrySkeletonType, Entry, CreateClientParams } from "contentful";
import { parseTimelinePreviewToken } from "@contentful/timeline-preview";
import { toJsonSafe } from "./json-safe";
import {
  applySiteScope,
  assertSingleResolverMatch,
  resolverKey,
  SiteScopeError,
} from "./site-scope";

/**
 * The configured Contentful environment. Never hardcode an environment name —
 * import this (or pass an explicit request-scoped override) so the same code
 * can be pointed at any demo environment via `NEXT_PUBLIC_CTF_ENVIRONMENT`.
 */
export const DEFAULT_CTF_ENVIRONMENT =
  process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";

const client = createClient({
  space: process.env.NEXT_PUBLIC_CTF_SPACE_ID!,
  accessToken: process.env.NEXT_PUBLIC_CTF_DELIVERY_TOKEN!,
  environment: DEFAULT_CTF_ENVIRONMENT,
});

const previewClient = createClient({
  space: process.env.NEXT_PUBLIC_CTF_SPACE_ID!,
  accessToken: process.env.NEXT_PUBLIC_CTF_PREVIEW_TOKEN!,
  host: "preview.contentful.com",
  environment: DEFAULT_CTF_ENVIRONMENT,
});

const deliveryClientByEnv = new Map<string, ReturnType<typeof createClient>>();
const previewClientByEnv = new Map<string, ReturnType<typeof createClient>>();

function isEnvironmentNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { sys?: { id?: string }; details?: { type?: string }; name?: string };
  if (err.details?.type === "Environment") return true;
  if (err.name === "NotFound") {
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes('"type":"Environment"') || msg.includes('"type": "Environment"')) return true;
  }
  const msg = (error as { message?: string }).message ?? "";
  return msg.includes("The resource could not be found") && msg.includes("Environment");
}

/**
 * Build a Contentful Preview client with Timeline support.
 * When `environmentId` is provided it overrides the configured default environment.
 * Returns the standard preview client when no token/environment is provided.
 */
function getPreviewClient(
  timelineToken?: string | null,
  environmentId?: string | null
): ReturnType<typeof createClient> {
  const environment = environmentId || DEFAULT_CTF_ENVIRONMENT;

  // If only the environment differs (no timeline), use the per-env cache.
  if (!timelineToken) {
    if (environment === (process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master")) {
      return previewClient;
    }
    return getClientForEnvironment({ environment, preview: true });
  }

  try {
    const { releaseId, timestamp } = parseTimelinePreviewToken(timelineToken);

    if (!releaseId && !timestamp) {
      console.warn("[Contentful] Timeline token parsed but contained no releaseId or timestamp. Falling back to standard preview.");
      return environmentId
        ? getClientForEnvironment({ environment, preview: true })
        : previewClient;
    }

    const timelinePreview: CreateClientParams["timelinePreview"] = releaseId
      ? { release: { lte: releaseId }, ...(timestamp ? { timestamp: { lte: timestamp } } : {}) }
      : { timestamp: { lte: timestamp! } };

    return createClient({
      space: process.env.NEXT_PUBLIC_CTF_SPACE_ID!,
      accessToken: process.env.NEXT_PUBLIC_CTF_PREVIEW_TOKEN!,
      host: "preview.contentful.com",
      environment,
      timelinePreview,
    });
  } catch (error) {
    console.error("[Contentful] Failed to parse timeline token. Falling back to standard preview.", error);
    return environmentId
      ? getClientForEnvironment({ environment, preview: true })
      : previewClient;
  }
}

function getClientForEnvironment(params: {
  environment: string;
  preview: boolean;
}): ReturnType<typeof createClient> {
  const env = params.environment || "master";
  const map = params.preview ? previewClientByEnv : deliveryClientByEnv;
  const cached = map.get(env);
  if (cached) return cached;

  const created = createClient({
    space: process.env.NEXT_PUBLIC_CTF_SPACE_ID!,
    accessToken: params.preview
      ? process.env.NEXT_PUBLIC_CTF_PREVIEW_TOKEN!
      : process.env.NEXT_PUBLIC_CTF_DELIVERY_TOKEN!,
    ...(params.preview ? { host: "preview.contentful.com" } : null),
    environment: env,
  });
  map.set(env, created);
  return created;
}

export const getEntries = async <T extends EntrySkeletonType>(
  options: unknown,
  isPreviewEnabled: boolean = false,
  timelineToken?: string | null,
  environmentId?: string | null
): Promise<Entry<T>[]> => {
  try {
    const isPlainObject =
      !!options &&
      typeof options === "object" &&
      !Array.isArray(options) &&
      Object.prototype.toString.call(options) === "[object Object]";

    if (!isPlainObject) {
      console.error("Invalid Contentful getEntries options", {
        options,
        stack: new Error().stack,
      });
      return [];
    }
    // Single chokepoint for optional site (brand) scoping. A no-op unless
    // SITE_ID is set; throws rather than serving another brand's content when a
    // content type is unclassified. Deliberately outside the try/catch's silent
    // `return []` path — see the rethrow in the catch block below.
    const scopedOptions = applySiteScope(options as Record<string, unknown>);

    const clientInstance = isPreviewEnabled
      ? getPreviewClient(timelineToken, environmentId)
      : environmentId
        ? getClientForEnvironment({ environment: environmentId, preview: false })
        : client;
    const entries: EntryCollection<T> = await clientInstance.getEntries<T>(
      scopedOptions
    );
    // In site mode, a URL that resolves to more than one entry is a modelling
    // error, not something to silently pick a winner for. Inert when scoping is
    // off. `total` counts all matches regardless of `limit`, so this costs no
    // extra request and changes nothing about what the caller receives.
    const key = resolverKey(scopedOptions);
    if (key) assertSingleResolverMatch(key, scopedOptions, entries.total);
    // Defensive: SDK link resolution can produce true circular references
    // (e.g. Ninetailed A/B baseline ↔ experiment). Normalize to a JSON-safe
    // graph so any downstream serialization (RSC props, Live Preview, Ninetailed
    // preview) never throws "Converting circular structure to JSON".
    return toJsonSafe(entries.items);
  } catch (error) {
    // A misconfigured site scope must never degrade into an empty page: an
    // unclassified content type means we don't know whose content it is.
    if (error instanceof SiteScopeError) throw error;

    // When an explicit environment doesn't exist (404 on Environment resource),
    // fall back to the default environment so the page still renders.
    if (environmentId && isEnvironmentNotFound(error)) {
      console.warn(
        `[Contentful] Environment "${environmentId}" not found. Falling back to default environment.`
      );
      try {
        const fallbackClient = isPreviewEnabled
          ? getPreviewClient(timelineToken)
          : client;
        const fallbackOptions = applySiteScope(
          options as Record<string, unknown>
        );
        const fallbackEntries: EntryCollection<T> =
          await fallbackClient.getEntries<T>(fallbackOptions);
        const fallbackKey = resolverKey(fallbackOptions);
        if (fallbackKey) {
          assertSingleResolverMatch(
            fallbackKey,
            fallbackOptions,
            fallbackEntries.total
          );
        }
        return toJsonSafe(fallbackEntries.items);
      } catch (fallbackError) {
        if (fallbackError instanceof SiteScopeError) throw fallbackError;
        console.error(
          "[Contentful] Default environment fallback also failed:",
          fallbackError
        );
        return [];
      }
    }
    // When timeline preview fails (e.g. release not scheduled, 404), fall back
    // to standard preview so the page still renders content instead of a 404.
    if (timelineToken && isPreviewEnabled) {
      console.warn(
        "[Contentful] Timeline preview request failed. Falling back to standard preview.",
        error instanceof Error ? error.message : error
      );
      try {
        const fallbackClient = environmentId
          ? getClientForEnvironment({ environment: environmentId, preview: true })
          : previewClient;
        const fallbackOptions = applySiteScope(
          options as Record<string, unknown>
        );
        const fallbackEntries: EntryCollection<T> =
          await fallbackClient.getEntries<T>(fallbackOptions);
        const fallbackKey = resolverKey(fallbackOptions);
        if (fallbackKey) {
          assertSingleResolverMatch(
            fallbackKey,
            fallbackOptions,
            fallbackEntries.total
          );
        }
        return toJsonSafe(fallbackEntries.items);
      } catch (fallbackError) {
        if (fallbackError instanceof SiteScopeError) throw fallbackError;
        console.error(
          "[Contentful] Standard preview fallback also failed:",
          fallbackError
        );
        return [];
      }
    }
    console.error("Error fetching entries from Contentful:", error);
    return [];
  }
};

export const getEntriesInEnvironment = async <T extends EntrySkeletonType>(
  params: {
    options: unknown;
    isPreviewEnabled?: boolean;
    /** Optional override; defaults to the configured environment. */
    environment?: string;
  }
): Promise<Entry<T>[]> => {
  try {
    const isPlainObject =
      !!params.options &&
      typeof params.options === "object" &&
      !Array.isArray(params.options) &&
      Object.prototype.toString.call(params.options) === "[object Object]";

    if (!isPlainObject) {
      console.error("Invalid Contentful getEntries options", {
        options: params.options,
        stack: new Error().stack,
      });
      return [];
    }

    const scopedOptions = applySiteScope(
      params.options as Record<string, unknown>
    );

    const clientInstance = getClientForEnvironment({
      environment: params.environment || DEFAULT_CTF_ENVIRONMENT,
      preview: Boolean(params.isPreviewEnabled),
    });

    const entries: EntryCollection<T> = await clientInstance.getEntries<T>(
      scopedOptions
    );
    const key = resolverKey(scopedOptions);
    if (key) assertSingleResolverMatch(key, scopedOptions, entries.total);
    return toJsonSafe(entries.items);
  } catch (error) {
    if (error instanceof SiteScopeError) throw error;
    console.error("Error fetching entries from Contentful:", error);
    return [];
  }
};

/**
 * Fetches available locales from Contentful.
 * @returns An array of locales.
 */
export const getLocales = async () => {
  try {
    const response = await client.getLocales();

    return response.items.map((locale) => ({
      code: locale.code,
      name: locale.name,
      default: locale.default,
    }));
  } catch (error) {
    console.error("Error fetching locales:", error);
    return [];
  }
};

export const getAllPageSlugs = async <T extends EntrySkeletonType>(
  options: Record<string, unknown>,
  isPreviewEnabled: boolean = false,
  timelineToken?: string | null,
  environmentId?: string | null
): Promise<string[]> => {
  try {
    const allSlugs: string[] = [];
    const clientInstance = isPreviewEnabled
      ? getPreviewClient(timelineToken, environmentId)
      : environmentId
        ? getClientForEnvironment({ environment: environmentId, preview: false })
        : client;

    const isPlainObject =
      !!options &&
      typeof options === "object" &&
      !Array.isArray(options) &&
      Object.prototype.toString.call(options) === "[object Object]";
    if (!isPlainObject) {
      console.error("Invalid Contentful getAllPageSlugs options", {
        options,
        stack: new Error().stack,
      });
      return [];
    }

    const scopedOptions = applySiteScope(options);

    const entries: EntryCollection<T> = await clientInstance.getEntries<T>(
      scopedOptions
    );
    const totalPages = entries?.total;
    const limit = entries.limit as number;
    const numberOfPages = Math.ceil(totalPages / limit);
    for (let page = 0; page < numberOfPages; page++) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const slugs = await clientInstance.getEntries<T>({
        ...scopedOptions,
        skip: page * entries.limit,
        limit: entries.limit,
        select: "fields.slug",
      });

      const slugValues = slugs.items.map((item) => item.fields.slug as string);

      allSlugs.push(...slugValues);
    }

    return allSlugs;
  } catch (error) {
    if (error instanceof SiteScopeError) throw error;
    console.error("Error fetching entries from Contentful:", error);
    return [];
  }
};

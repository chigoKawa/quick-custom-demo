import { createClient } from "contentful";
import type { EntryCollection, EntrySkeletonType, Entry } from "contentful";

const client = createClient({
  space: process.env.NEXT_PUBLIC_CTF_SPACE_ID!,
  accessToken: process.env.NEXT_PUBLIC_CTF_DELIVERY_TOKEN!,
    environment: process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master",

});

const previewClient = createClient({
  space: process.env.NEXT_PUBLIC_CTF_SPACE_ID!,
  accessToken: process.env.NEXT_PUBLIC_CTF_PREVIEW_TOKEN!,
  host: "preview.contentful.com",
  environment: process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master",
});

const deliveryClientByEnv = new Map<string, ReturnType<typeof createClient>>();
const previewClientByEnv = new Map<string, ReturnType<typeof createClient>>();

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
  isPreviewEnabled: boolean = false
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
    const clientInstance = isPreviewEnabled ? previewClient : client;
    const entries: EntryCollection<T> = await clientInstance.getEntries<T>(
      options as Record<string, unknown>
    );
    return entries.items;
  } catch (error) {
    console.error("Error fetching entries from Contentful:", error);
    return [];
  }
};

export const getEntriesInEnvironment = async <T extends EntrySkeletonType>(
  params: {
    options: unknown;
    isPreviewEnabled?: boolean;
    environment: string;
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

    const clientInstance = getClientForEnvironment({
      environment: params.environment,
      preview: Boolean(params.isPreviewEnabled),
    });

    const entries: EntryCollection<T> = await clientInstance.getEntries<T>(
      params.options as Record<string, unknown>
    );
    return entries.items;
  } catch (error) {
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
  isPreviewEnabled: boolean = false
): Promise<string[]> => {
  try {
    const allSlugs: string[] = [];
    const clientInstance = isPreviewEnabled ? previewClient : client;

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

    const entries: EntryCollection<T> = await clientInstance.getEntries<T>(
      options
    );
    const totalPages = entries?.total;
    const limit = entries.limit as number;
    const numberOfPages = Math.ceil(totalPages / limit);
    for (let page = 0; page < numberOfPages; page++) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const slugs = await clientInstance.getEntries<T>({
        ...options,
        skip: page * entries.limit,
        limit: entries.limit,
        select: "fields.slug",
      });

      const slugValues = slugs.items.map((item) => item.fields.slug as string);

      allSlugs.push(...slugValues);
    }

    return allSlugs;
  } catch (error) {
    console.error("Error fetching entries from Contentful:", error);
    return [];
  }
};

import { NextResponse } from "next/server";

import { getI18nConfig } from "@/i18n-config";
import { getEntries } from "@/lib/contentful";
import type { CategoryPageSkeleton } from "@/features/contentful/type";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale") || undefined;

  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale =
    localeParam && locales.includes(localeParam as any)
      ? localeParam
      : defaultLocale;

  const limitRaw = url.searchParams.get("limit");
  const limit =
    typeof limitRaw === "string" && Number.isFinite(Number(limitRaw))
      ? Math.max(1, Math.min(12, Number(limitRaw)))
      : 6;

  const entries = await getEntries<CategoryPageSkeleton>({
    content_type: "categoryPage",
    select: ["fields.title", "fields.slug"].join(","),
    order: "fields.title",
    limit,
    locale: effectiveLocale,
  });

  const items = entries
    .map((e) => {
      const title = (e as any)?.fields?.title;
      const slug = (e as any)?.fields?.slug;
      return {
        title: typeof title === "string" ? title : null,
        slug: typeof slug === "string" ? slug : null,
      };
    })
    .filter((x): x is { title: string; slug: string } => !!x.title && !!x.slug);

  return NextResponse.json({ items }, { status: 200 });
}

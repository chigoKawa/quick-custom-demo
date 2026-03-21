import { notFound } from "next/navigation";
import { getEntries } from "@/lib/contentful";
import Link from "next/link";
import { isPreviewEnabled, getTimelineToken } from "@/lib/utils";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import KbArticleClient from "@/features/kb/kb-article-client";
import KbArticleFeedback from "@/features/kb/kb-article-feedback";
import { getKbIndex } from "@/lib/kb/loader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INCLUDES_COUNT = 6;

function titleizeSlug(slug: string): string {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function KbArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale = "en-US", slug = "" } = await params;
  const resolvedSearchParams = await searchParams;
  const isPreviewEnabledFlag = isPreviewEnabled(resolvedSearchParams);
  const timelineToken = getTimelineToken(resolvedSearchParams);
  const [entry] = await Promise.all([
    getEntries<any>(
      {
        content_type: "kbArticle",
        "fields.slug": slug,
        locale,
        limit: 1,
        include: INCLUDES_COUNT,
      },
      !!isPreviewEnabledFlag,
      timelineToken
    ).then((items) => items?.[0] ?? null),
  ]);
  if (!entry) return notFound();

  const idx = getKbIndex(locale);
  const currentDoc = idx?.docs?.find((d) => d?.id === entry?.sys?.id || d?.slug === slug) || null;
  const activeGroupSlug = currentDoc?.groups?.[0] || undefined;
  const activeGroupName = activeGroupSlug ? titleizeSlug(activeGroupSlug) : undefined;

  const updatedAt = entry?.sys?.updatedAt;
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={!!isPreviewEnabledFlag}>
      <div className="min-h-screen">
        {/* Breadcrumb */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <nav className="text-sm">
              <Link href={`/${locale}`} className="text-primary hover:underline">
                Home
              </Link>
              <span className="px-2 text-muted-foreground">/</span>
              <Link href={`/${locale}/knowledge-base`} className="text-primary hover:underline">
                Knowledge Base
              </Link>
              <span className="px-2 text-muted-foreground">/</span>
              {activeGroupName && activeGroupSlug ? (
                <>
                  <Link
                    href={`/${locale}/knowledge-base/topic/${encodeURIComponent(activeGroupSlug)}`}
                    className="text-primary hover:underline"
                  >
                    {activeGroupName}
                  </Link>
                  <span className="px-2 text-muted-foreground">/</span>
                </>
              ) : null}
              <span className="text-muted-foreground">Article</span>
            </nav>
          </div>
        </div>

        {/* Article content */}
        <article className="container mx-auto px-4 py-10 md:py-16">
          <div className="max-w-3xl mx-auto">
            {/* Meta info */}
            {formattedDate ? (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
                <span>Last Updated: {formattedDate}</span>
              </div>
            ) : null}

            {/* Article body */}
            <KbArticleClient entry={entry} locale={locale} />

            {/* Feedback section */}
            <KbArticleFeedback articleId={entry?.sys?.id} locale={locale} />
          </div>
        </article>
      </div>
    </LivePreviewProviderWrapper>
  );
}

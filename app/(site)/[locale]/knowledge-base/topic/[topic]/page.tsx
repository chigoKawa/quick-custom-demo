import { notFound } from "next/navigation";
import Link from "next/link";
import { resolvePreviewMode } from "@/lib/preview";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import { getKbIndex } from "@/lib/kb/loader";
import KbFooterCta from "@/features/kb/kb-footer-cta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function titleizeSlug(slug: string): string {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function KbTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; topic: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale = "en-US", topic = "" } = await params;
  const { isPreview: isPreviewEnabledFlag } = await resolvePreviewMode(await searchParams);

  const idx = getKbIndex(locale);
  
  // Find all articles in this topic
  const articles = (idx?.docs || []).filter((doc) =>
    Array.isArray(doc?.groups) && doc.groups.includes(topic)
  );

  // If no articles found for this topic, return 404
  if (articles.length === 0) {
    return notFound();
  }

  const topicName = titleizeSlug(topic);

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
              <span className="text-muted-foreground">{topicName}</span>
            </nav>
          </div>
        </div>

        {/* Topic header */}
        <div className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {topicName}
              </h1>
              <p className="text-primary-foreground/80">
                {articles.length} article{articles.length === 1 ? "" : "s"} in this topic
              </p>
            </div>
          </div>
        </div>

        {/* Articles list */}
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <ul className="space-y-4">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/${locale}/knowledge-base/${article.slug}`}
                    className="group block rounded-lg border bg-background p-5 hover:border-primary hover:shadow-sm transition-all"
                  >
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    {article.summary ? (
                      <p className="text-muted-foreground mt-2 line-clamp-2">
                        {article.summary}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <KbFooterCta locale={locale} />
      </div>
    </LivePreviewProviderWrapper>
  );
}

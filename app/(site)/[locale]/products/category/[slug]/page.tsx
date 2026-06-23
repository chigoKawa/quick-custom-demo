/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import Link from "next/link";

function formatPrice(price: number, currency?: string): string {
  const c = (currency ?? "NOK").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 2 }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}
import type { Metadata, ResolvingMetadata } from "next";

import { getI18nConfig, type Locale } from "@/i18n-config";
import { getEntries } from "@/lib/contentful";
import { resolvePreviewMode } from "@/lib/preview";
import { IntegrationFactory } from "@/lib/integrations/core/integration-factory";
import type { ICommerceIntegration } from "@/lib/integrations/commerce/commerce.interface";
import type { ProductCategorySkeleton, IProductCategory } from "@/features/contentful/type";
import ContentfulLandingPage from "@/features/contentful/components/contentful-landing-page";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProductCategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSp);
  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale = locales.includes(locale) ? locale : defaultLocale;

  const entries = await getEntries<ProductCategorySkeleton>(
    {
      content_type: "productCategory",
      "fields.slug": slug,
      include: 6,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId,
  );

  const entry = entries[0] as unknown as IProductCategory | undefined;
  if (!entry) notFound();

  const commerceCategoryId = entry.fields.commerceCategoryId;
  const title = entry.fields.title;
  const description = entry.fields.description;
  const heroImageUrl =
    (entry.fields.heroImage as any)?.fields?.file?.url ?? null;
  const sections = Array.isArray(entry.fields.sections)
    ? entry.fields.sections
    : [];

  let products: any[] = [];
  try {
    const commerce = (await IntegrationFactory.getIntegration(
      "commerce",
    )) as ICommerceIntegration;
    products = await commerce.getProducts({
      category: commerceCategoryId,
      inStock: true,
      sort: "popular",
    });
  } catch (e) {
    console.error("Error loading products for category:", e);
  }

  const landingLike = {
    ...entry,
    fields: {
      internalName: entry.fields.internalName,
      title: entry.fields.title,
      slug: entry.fields.slug,
      sections,
      seoMetadata: entry.fields.seoMetadata,
    },
  } as any;

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      {/* Category header */}
      <section className="bg-gradient-to-b from-muted/40 to-background">
        {heroImageUrl && (
          <div className="w-full h-48 md:h-64 overflow-hidden">
            <img
              src={heroImageUrl.startsWith("//") ? `https:${heroImageUrl}` : heroImageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href={`/${effectiveLocale}`} className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{title}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-muted-foreground max-w-3xl">{description}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>
      </section>

      {/* Product grid */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product: any) => {
              const imageUrl = product.images?.[0] ?? null;
              return (
                <Link
                  key={product.id}
                  href={`/${effectiveLocale}/products/${product.id}`}
                  className="group block"
                >
                  <article className="h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-border transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted relative">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <svg className="w-12 h-12 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                        {product.title}
                      </h3>
                      {product.price > 0 && (
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(product.price, product.currency)}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Editorial sections from Contentful */}
      {sections.length > 0 && (
        <ContentfulLandingPage entry={landingLike} />
      )}
    </LivePreviewProviderWrapper>
  );
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<ProductCategorySkeleton>(
    {
      content_type: "productCategory",
      "fields.slug": slug,
      include: 2,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId,
  );

  const entry = entries[0] as unknown as IProductCategory | undefined;
  if (!entry) return {};

  const title = entry.fields.title ?? slug;
  const seo = entry.fields.seoMetadata as any;

  return {
    title: seo?.fields?.title ?? `${title} | Products`,
    description: seo?.fields?.description ?? entry.fields.description ?? "",
  };
}

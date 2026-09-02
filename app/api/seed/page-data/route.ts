import { NextRequest, NextResponse } from "next/server";
import { getEntries } from "@/lib/contentful";
import { unscoped } from "@/lib/site-scope";
import type { EntrySkeletonType, Entry } from "contentful";

export const dynamic = "force-dynamic";

const PAGE_SLUG_DEFAULT = process.env.NEXT_PUBLIC_CTF_HOMEPAGE_SLUG || "home";

const PERSONALIZED_CONTENT_TYPES = new Set([
  "heroBanner",
  "heroModule",
  "cta",
  "shelfModule",
  "alert",
  "productCatalog",
  "formEmbed",
  "multiItemModule",
  "propertyListings",
]);

function extractLabel(fields: Record<string, unknown>): string {
  return (
    (fields.internalName as string) ||
    (fields.internalTitle as string) ||
    (fields.title as string) ||
    (fields.headline as string) ||
    ""
  );
}

export type ExperienceRef = {
  experienceId: string;
  /** Number of variants (excluding baseline) in this experience */
  variantCount: number;
};

export type PageSection = {
  entryId: string;
  contentType: string;
  label: string;
  hasExperiences: boolean;
  experienceCount: number;
  experiences: ExperienceRef[];
  metricEventName: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type PageDataResponse = {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  sections: PageSection[];
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || PAGE_SLUG_DEFAULT;
  const locale = searchParams.get("locale") || "en-US";

  try {
    // Dev seeding tool: resolves a page by slug regardless of which site owns
    // it, so a demo can be seeded from any brand's content.
    const entries = await getEntries<EntrySkeletonType>(
      unscoped({
        content_type: "landingPage",
        "fields.slug": slug,
        include: 5,
        locale,
      }),
      false
    );

    const pageEntry = entries[0];
    if (!pageEntry) {
      return NextResponse.json(
        { error: `Page with slug "${slug}" not found` },
        { status: 404 }
      );
    }

    const fields = pageEntry.fields as Record<string, unknown>;
    const rawSections = fields.sections as Entry<EntrySkeletonType>[] | undefined;

    const sections: PageSection[] = (rawSections || [])
      .filter((s) => s?.sys?.id)
      .map((section) => {
        const sf = section.fields as Record<string, unknown>;
        const contentType =
          (section.sys as any).contentType?.sys?.id ||
          (section.sys as any).contentType?.id ||
          "unknown";

        const ntExperiences = sf.nt_experiences as Entry<EntrySkeletonType>[] | undefined;
        const validExperiences = (ntExperiences || []).filter(
          (exp) => exp?.sys?.id && exp?.fields
        );
        const hasExperiences =
          PERSONALIZED_CONTENT_TYPES.has(contentType) && validExperiences.length > 0;

        const experienceRefs: ExperienceRef[] = validExperiences.map((exp) => {
          const ef = exp.fields as Record<string, unknown>;
          const variants = ef.nt_variants as unknown[] | undefined;
          return {
            experienceId: exp.sys.id,
            variantCount: Array.isArray(variants) ? variants.length : 0,
          };
        });

        // Try to extract CTA button info for track event defaults
        let ctaLabel: string | null = null;
        let ctaHref: string | null = null;
        const buttons = (sf.actionButtons || sf.buttons) as Entry<EntrySkeletonType>[] | undefined;
        if (Array.isArray(buttons) && buttons.length > 0) {
          const btn = buttons[0];
          const bf = btn?.fields as Record<string, unknown> | undefined;
          if (bf) {
            ctaLabel = (bf.label as string) || null;
            const target = bf.target as Entry<EntrySkeletonType> | undefined;
            if (target?.fields) {
              const tf = target.fields as Record<string, unknown>;
              ctaHref =
                (tf.url as string) ||
                (tf.slug ? `/${tf.slug}` : null) ||
                null;
            }
          }
        }

        return {
          entryId: section.sys.id,
          contentType,
          label: extractLabel(sf),
          hasExperiences,
          experienceCount: validExperiences.length,
          experiences: experienceRefs,
          metricEventName: (sf.metricEventName as string) || null,
          ctaLabel,
          ctaHref,
        };
      });

    const response: PageDataResponse = {
      pageId: pageEntry.sys.id,
      pageTitle: (fields.title as string) || slug,
      pageSlug: (fields.slug as string) || slug,
      sections,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[seed/page-data] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch page data" },
      { status: 500 }
    );
  }
}

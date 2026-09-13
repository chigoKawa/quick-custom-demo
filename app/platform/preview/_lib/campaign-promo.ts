/**
 * Resolves a campaign's "promo" representation — the compact, channel-agnostic
 * headline/subtitle/image used by the mobile and in-store preview surfaces.
 *
 * Why a fallback chain rather than reading one field: `promoTileComponent` is
 * the field the content model intends for this, but it is unset on every
 * campaign in the space today, and `heroComponent` may be an unresolvable link
 * (a deleted entry) which the CDA returns as a bare `{ sys }` stub. Walking a
 * chain means a thin or partially-broken campaign still renders something
 * honest instead of a blank screen.
 *
 * `source` is surfaced in the UI as a provenance chip so an editor can see
 * which field a given screen was derived from.
 */
import { extractContentfulAssetUrl } from "@/lib/utils";
import { extractImageWithFocalPoint } from "@/lib/focal-point";
import type { ICampaign } from "@/features/contentful/type";

export type CampaignPromoSource = "promoTile" | "hero" | "section" | "campaign";

export type CampaignPromo = {
  /** Campaign name — rendered as the eyebrow above the headline. */
  name: string;
  /** The main promotional line. */
  headline: string;
  subtitle?: string;
  imageUrl?: string;
  objectPosition?: string;
  /** Which field the headline/image came from. */
  source: CampaignPromoSource;
  /** Content type of the entry the promo was derived from, when applicable. */
  sourceContentType?: string;
};

type AnyEntry = {
  sys?: { id?: string; contentType?: { sys?: { id?: string } } };
  fields?: Record<string, unknown>;
};

/** A link Contentful could not resolve comes back as `{ sys }` with no `fields`. */
function isResolved(entry: unknown): entry is Required<Pick<AnyEntry, "fields">> & AnyEntry {
  return Boolean(entry && typeof entry === "object" && (entry as AnyEntry).fields);
}

function contentTypeOf(entry: unknown): string | undefined {
  return (entry as AnyEntry)?.sys?.contentType?.sys?.id;
}

/**
 * Flatten a field that may be a plain string or a Rich Text document.
 * Mirrors the helper in mobile-multi-item-module.tsx.
 */
function toPlainText(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field !== "object") return "";
  const node = field as { value?: string; content?: unknown[] };
  if (node.value) return node.value;
  if (Array.isArray(node.content)) return node.content.map(toPlainText).join("").trim();
  return "";
}

/** Pull an image URL + focal point from the shapes sections actually use. */
function imageFrom(fields: Record<string, unknown>): {
  imageUrl?: string;
  objectPosition?: string;
} {
  // heroModule style: `image` is an `imageWithFocalPoint` ENTRY. Pass that entry
  // to extractImageWithFocalPoint, which reads `fields.image`/`fields.focalPoint`
  // off it — so we get the focal crop, not just the raw asset URL.
  const image = fields.image as AnyEntry | undefined;
  if (isResolved(image)) {
    const focal = extractImageWithFocalPoint(image);
    if (focal.url) {
      return { imageUrl: focal.url, objectPosition: focal.objectPosition };
    }
  }

  // richContentModule style: `image` is a plain asset.
  if (fields.image) {
    const direct = extractContentfulAssetUrl(fields.image as never);
    if (direct) return { imageUrl: direct, objectPosition: "center center" };
  }

  // callout style: single `media` asset
  if (fields.media) {
    const url = extractContentfulAssetUrl(fields.media as never);
    if (url) return { imageUrl: url, objectPosition: "center center" };
  }

  // cta style: `images` array
  if (Array.isArray(fields.images) && fields.images.length > 0) {
    const url = extractContentfulAssetUrl(fields.images[0] as never);
    if (url) return { imageUrl: url, objectPosition: "center center" };
  }

  return {};
}

/**
 * Best section to derive a promo from: prefer the first resolved entry that
 * carries imagery, since these surfaces are image-led, and fall back to the
 * first resolved entry of any kind.
 *
 * This matters in practice — `the-gearbox-collection` has a text-only
 * richContentModule at index 0 and the heroModule with the artwork at index 1,
 * so a naive "first resolved" pick yields an imageless screen.
 */
function bestSection(...lists: unknown[]): AnyEntry | undefined {
  const resolved = lists
    .filter(Array.isArray)
    .flat()
    .filter(isResolved) as AnyEntry[];

  const withImage = resolved.find((s) => Boolean(imageFrom(s.fields as Record<string, unknown>).imageUrl));
  return withImage ?? resolved[0];
}

export function resolveCampaignPromo(entry: ICampaign): CampaignPromo {
  const fields = (entry?.fields ?? {}) as Record<string, unknown>;
  const name = (fields.name as string) || (fields.internalName as string) || "";
  const promoTitle = (fields.promoTitle as string) || "";

  const base = { name, source: "campaign" as CampaignPromoSource };

  // 1. promoTileComponent — the field the content model intends for this.
  const tile = fields.promoTileComponent;
  if (isResolved(tile)) {
    const tf = tile.fields as Record<string, unknown>;
    const headline = promoTitle || toPlainText(tf.title);
    const subtitle = toPlainText(tf.subtitle) || toPlainText(tf.body);
    if (headline || subtitle) {
      return {
        ...base,
        headline,
        subtitle: subtitle || undefined,
        ...imageFrom(tf),
        source: "promoTile",
        sourceContentType: contentTypeOf(tile),
      };
    }
  }

  // 2. heroComponent — the web hero, condensed.
  const hero = fields.heroComponent;
  if (isResolved(hero)) {
    const hf = hero.fields as Record<string, unknown>;
    const headline = promoTitle || toPlainText(hf.headline) || toPlainText(hf.title);
    const subtitle = toPlainText(hf.subCopy) || toPlainText(hf.body);
    if (headline || subtitle) {
      return {
        ...base,
        headline,
        subtitle: subtitle || undefined,
        ...imageFrom(hf),
        source: "hero",
        sourceContentType: contentTypeOf(hero),
      };
    }
  }

  // 3. Best resolved body section — whatever the campaign actually has.
  const section = bestSection(fields.topSections, fields.bottomSections);
  if (section?.fields) {
    const sf = section.fields as Record<string, unknown>;
    const headline = promoTitle || toPlainText(sf.headline) || toPlainText(sf.title);
    const subtitle = toPlainText(sf.subCopy) || toPlainText(sf.body);
    if (headline || subtitle) {
      return {
        ...base,
        headline,
        subtitle: subtitle || undefined,
        ...imageFrom(sf),
        source: "section",
        sourceContentType: contentTypeOf(section),
      };
    }
  }

  // 4. Campaign scalars only — no imagery available.
  return { ...base, headline: promoTitle || name };
}

/**
 * Product reading lives in lib/campaign-products.ts so the public campaign page
 * can share it. Re-exported here to keep the preview components' imports stable.
 */
export {
  resolveCampaignProducts,
  formatProductPrice,
  type CampaignProduct,
  type CampaignProduct as PromoProduct,
} from "@/lib/campaign-products";

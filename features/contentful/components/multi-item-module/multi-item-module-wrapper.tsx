"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { Entry } from "contentful";

import type { IMultiItemModule, IHeroModule, IBlogPostPage, ILandingPage, ILogo, IBaseButton, ICampaign, IAuction, ICallout, ICta } from "../../type";
import { extractUrlFromTarget, localizeInternalPath } from "@/lib/utils";
import { extractImageWithFocalPoint } from "@/lib/focal-point";
import MultiItemModule, { type MultiItemModuleItem, type MultiItemLayout, type BackgroundTheme } from "./multi-item-module";
import HeroModule, { type HeroModuleSlide } from "../hero-module/hero-module";

type SupportedItemEntry = IHeroModule | IBlogPostPage | ILandingPage | ILogo | ICampaign | IAuction | ICallout | ICta;

type LinkLocale = { locale?: string; defaultLocale?: string };

function getContentTypeId(entry: Entry<any>): string | null {
  return (
    entry?.sys?.contentType?.sys?.id ??
    (entry?.sys as any)?.contentTypeId ??
    null
  );
}

function mapButtons(buttons: unknown, linkLocale: LinkLocale): Array<{ label: string; href: string }> {
  if (!Array.isArray(buttons)) return [];
  const { locale, defaultLocale = "en-US" } = linkLocale;
  return (buttons as IBaseButton[])
    .map((b) => {
      const label = b?.fields?.label;
      const href = extractUrlFromTarget(b?.fields?.target, { locale, defaultLocale });
      if (!label || !href) return null;
      return { label, href };
    })
    .filter((v): v is { label: string; href: string } => Boolean(v));
}

function extractHeroModuleSlide(entry: IHeroModule, linkLocale: LinkLocale): HeroModuleSlide | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const title = entry.fields.headline ?? "";
  if (!title) return null;

  const description = entry.fields.subCopy ?? undefined;
  const imageEntry = entry.fields.image;
  const {
    url: imageUrl,
    alt: imageAlt,
    objectPosition,
    entryId: imageEntryId,
  } = extractImageWithFocalPoint(imageEntry);

  const buttons = mapButtons(entry.fields.buttons, linkLocale);

  return {
    title,
    description,
    imageUrl: imageUrl || undefined,
    imageAlt: imageAlt || title,
    imageObjectPosition: objectPosition,
    imageEntryId,
    buttons: buttons.length > 0 ? buttons.slice(0, 2) : undefined,
  };
}

function extractItemFromHeroModule(entry: IHeroModule): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const imageEntry = entry.fields.image as any;
  const imageAsset = imageEntry?.fields?.image;
  const imageUrl = imageAsset?.fields?.file?.url
    ? `https:${imageAsset.fields.file.url}`
    : undefined;

  return {
    id: entry.sys.id,
    contentType: "heroModule",
    title: entry.fields.headline ?? undefined,
    description: entry.fields.subCopy ?? undefined,
    imageUrl,
    imageAlt: imageEntry?.fields?.title ?? entry.fields.headline ?? undefined,
  };
}

function extractItemFromBlogPost(entry: IBlogPostPage, linkLocale: LinkLocale): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const featuredImage = entry.fields.featuredImage as any;
  const imageUrl = featuredImage?.fields?.file?.url
    ? `https:${featuredImage.fields.file.url}`
    : undefined;
  const { locale, defaultLocale = "en-US" } = linkLocale;

  return {
    id: entry.sys.id,
    contentType: "blogPost",
    title: entry.fields.title ?? undefined,
    imageUrl,
    imageAlt: featuredImage?.fields?.title ?? entry.fields.title ?? undefined,
    href: localizeInternalPath(`/blog/${entry.fields.slug}`, locale, defaultLocale),
  };
}

function extractItemFromLandingPage(entry: ILandingPage, linkLocale: LinkLocale): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;
  const { locale, defaultLocale = "en-US" } = linkLocale;
  const slug = entry.fields.slug;
  const path =
    slug === "homepage" || slug === "home" ? "/" : `/${slug}`;

  return {
    id: entry.sys.id,
    contentType: "landingPage",
    title: entry.fields.title ?? undefined,
    href: localizeInternalPath(path, locale, defaultLocale),
  };
}

function extractItemFromLogo(entry: ILogo, linkLocale: LinkLocale): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const imageAsset = entry.fields.image as any;
  const imageUrl = imageAsset?.fields?.file?.url
    ? `https:${imageAsset.fields.file.url}`
    : undefined;

  const linkTarget = entry.fields.link;
  const { locale, defaultLocale = "en-US" } = linkLocale;
  const href = linkTarget ? extractUrlFromTarget(linkTarget, { locale, defaultLocale }) : undefined;

  return {
    id: entry.sys.id,
    contentType: "logo",
    title: entry.fields.name ?? entry.fields.internalName ?? undefined,
    imageUrl,
    imageAlt: entry.fields.name ?? entry.fields.internalName ?? "Logo",
    href: href ?? undefined,
  };
}

function extractItemFromCampaign(entry: ICampaign, linkLocale: LinkLocale): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  let imageUrl: string | undefined;
  const hero = entry.fields.heroComponent as any;
  if (hero?.fields) {
    const heroImage = hero.fields?.image ?? hero.fields?.heroImage;
    const asset = heroImage?.fields?.image ?? heroImage;
    const url = asset?.fields?.file?.url;
    if (url) imageUrl = url.startsWith("//") ? `https:${url}` : url;
  }
  const { locale, defaultLocale = "en-US" } = linkLocale;

  return {
    id: entry.sys.id,
    contentType: "campaign",
    title: entry.fields.name ?? undefined,
    imageUrl,
    imageAlt: entry.fields.name ?? "Campaign",
    href: localizeInternalPath(`/campaigns/${entry.fields.slug}`, locale, defaultLocale),
  };
}

const AUCTION_PLACEHOLDER_IMAGE = "https://images.ctfassets.net/ace0ba6p9v98/2I5435KOFgkzr6W9eFhWqq/a1922532112ce04e62d6a0b8830e65a2/auction.png";

function extractItemFromAuction(entry: IAuction, linkLocale: LinkLocale): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  // externalAuctionId is an Object field storing the full snapshot from the picker
  const snap = entry.fields.externalAuctionId as Record<string, any> | undefined;
  const externalId = snap?.externalAuctionId as string | undefined;
  const title = entry.fields.overrideTitle ?? snap?.title ?? entry.fields.internalName ?? undefined;
  const saleType = entry.fields.overrideSaleType ?? snap?.saleType;
  const location = snap?.location;
  const startDate = snap?.startDate;
  const endDate = snap?.endDate;
  const lotCount = snap?.lotCount;

  // Image: use first Contentful image if present, else fall back to placeholder
  const firstImage = Array.isArray(entry.fields.images) ? (entry.fields.images as any[])[0] : undefined;
  const ctfImageUrl = firstImage?.fields?.file?.url
    ? `https:${firstImage.fields.file.url}`
    : undefined;
  const imageUrl = ctfImageUrl ?? AUCTION_PLACEHOLDER_IMAGE;

  const saleTypeLabel = saleType ? `${saleType} Sale` : undefined;
  const locationLabel = location ? `📍 ${location}` : undefined;
  const subtitle = [saleTypeLabel, locationLabel].filter(Boolean).join("  ·  ") || undefined;

  const dateLabel =
    startDate && endDate
      ? `${new Date(startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : startDate
        ? new Date(startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : undefined;
  const lotLabel = lotCount != null ? `${lotCount} lots` : undefined;
  const description = [dateLabel, lotLabel].filter(Boolean).join("  ·  ") || undefined;

  const { locale, defaultLocale = "en-US" } = linkLocale;
  const href = externalId
    ? localizeInternalPath(`/auctions/${externalId}`, locale, defaultLocale)
    : undefined;

  return {
    id: entry.sys.id,
    contentType: "auction",
    title,
    subtitle,
    description,
    imageUrl,
    imageAlt: title ?? "Auction",
    href,
  };
}

function extractItemFromCallout(entry: ICallout, linkLocale: LinkLocale): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const titleField = entry.fields.title;
  const subtitleField = entry.fields.subtitle;

  // Rich text: extract plain text from the first paragraph node
  function richTextToPlain(rt: unknown): string | undefined {
    if (!rt || typeof rt !== "object") return undefined;
    const content = (rt as { content?: Array<{ content?: Array<{ value?: string }> }> }).content;
    if (!Array.isArray(content)) return undefined;
    return content
      .flatMap((block) => block.content ?? [])
      .map((n) => n.value ?? "")
      .join("")
      .trim() || undefined;
  }

  const title = richTextToPlain(titleField);
  const description = richTextToPlain(subtitleField);

  const mediaAsset = entry.fields.media as any;
  const imageUrl = mediaAsset?.fields?.file?.url
    ? `https:${mediaAsset.fields.file.url}`
    : undefined;

  const button = entry.fields.button;
  const { locale, defaultLocale = "en-US" } = linkLocale;
  const ctaLabel = button?.fields?.label;
  const ctaHref = button?.fields?.target
    ? extractUrlFromTarget(button.fields.target, { locale, defaultLocale })
    : undefined;

  return {
    id: entry.sys.id,
    contentType: "callout",
    title,
    description,
    imageUrl,
    imageAlt: title ?? undefined,
    ctaLabel: ctaLabel ?? undefined,
    ctaHref: ctaHref ?? undefined,
  };
}

function extractItemFromCta(entry: ICta, linkLocale: LinkLocale): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const { locale, defaultLocale = "en-US" } = linkLocale;
  const images = entry.fields.images as any[];
  const firstImage = Array.isArray(images) ? images[0] : undefined;
  const imageUrl = firstImage?.fields?.file?.url
    ? `https:${firstImage.fields.file.url}`
    : undefined;

  const buttons = Array.isArray(entry.fields.actionButtons) ? entry.fields.actionButtons : [];
  const firstButton = buttons[0] as IBaseButton | undefined;
  const ctaLabel = firstButton?.fields?.label;
  const ctaHref = firstButton?.fields?.target
    ? extractUrlFromTarget(firstButton.fields.target, { locale, defaultLocale })
    : undefined;

  return {
    id: entry.sys.id,
    contentType: "cta",
    title: entry.fields.title ?? undefined,
    description: entry.fields.body ?? undefined,
    imageUrl,
    imageAlt: entry.fields.title ?? undefined,
    ctaLabel: ctaLabel ?? undefined,
    ctaHref: ctaHref ?? undefined,
  };
}

function extractItem(entry: SupportedItemEntry, linkLocale: LinkLocale): MultiItemModuleItem | null {
  const contentType = getContentTypeId(entry);

  switch (contentType) {
    case "heroModule":
      return extractItemFromHeroModule(entry as IHeroModule);
    case "blogPost":
      return extractItemFromBlogPost(entry as IBlogPostPage, linkLocale);
    case "landingPage":
      return extractItemFromLandingPage(entry as ILandingPage, linkLocale);
    case "logo":
      return extractItemFromLogo(entry as ILogo, linkLocale);
    case "campaign":
      return extractItemFromCampaign(entry as ICampaign, linkLocale);
    case "auction":
      return extractItemFromAuction(entry as IAuction, linkLocale);
    case "callout":
      return extractItemFromCallout(entry as ICallout, linkLocale);
    case "cta":
      return extractItemFromCta(entry as ICta, linkLocale);
    default:
      if (process.env.NODE_ENV === "development") {
        console.warn(`[MultiItemModule] Unknown item content type: ${contentType}`);
      }
      return null;
  }
}

export default function MultiItemModuleWrapper(
  props: IMultiItemModule & { locale?: string; defaultLocale?: string }
) {
  const { locale, defaultLocale: defaultLocaleProp, ...rawEntry } = props;
  const defaultLocale = defaultLocaleProp ?? "en-US";
  const linkLocale: LinkLocale = { locale, defaultLocale };

  // Pass only sys+fields to avoid circular-reference stack overflow in
  // useContentfulLiveUpdates' isEqual diffing (e.g. deeply nested JSON fields).
  const liveEntry = useContentfulLiveUpdates({ sys: rawEntry.sys, fields: rawEntry.fields } as typeof rawEntry);
  const entry = liveEntry ?? rawEntry;

  if (!entry?.sys?.id || !entry?.fields) {
    return null;
  }

  const rawItems = entry.fields.items as unknown as SupportedItemEntry[] | undefined;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return null;
  }

  // Determine the content type of the first item
  const firstItemContentType = getContentTypeId(rawItems[0]);
  if (!firstItemContentType) {
    return null;
  }

  const layout = (entry.fields.layout ?? "carousel") as MultiItemLayout;

  // For value-prop layout, allow mixed callout/cta types; otherwise keep same-type filter
  const VALUE_PROP_TYPES = new Set(["callout", "cta"]);
  const filteredItems =
    layout === "value-prop" && VALUE_PROP_TYPES.has(firstItemContentType)
      ? rawItems.filter((item) => item?.sys?.id && VALUE_PROP_TYPES.has(getContentTypeId(item) ?? ""))
      : rawItems.filter((item) => {
          if (!item?.sys?.id) return false;
          return getContentTypeId(item) === firstItemContentType;
        });

  if (filteredItems.length === 0) {
    return null;
  }

  // Special handling for heroModule: render using existing HeroModule component
  // Always render as 1-column carousel with autoplay, ignoring column settings
  if (firstItemContentType === "heroModule") {
    const slides: HeroModuleSlide[] = filteredItems
      .map((item) => extractHeroModuleSlide(item as IHeroModule, linkLocale))
      .filter((slide): slide is HeroModuleSlide => slide !== null);

    if (slides.length === 0) {
      return null;
    }

    return (
      <HeroModule
        slides={slides}
        entryId={entry.sys.id}
      />
    );
  }

  // Extract item data for other content types
  const items: MultiItemModuleItem[] = filteredItems
    .map((item) => extractItem(item, linkLocale))
    .filter((item): item is MultiItemModuleItem => item !== null);

  if (items.length === 0) {
    return null;
  }

  const isLogoContent = firstItemContentType === "logo";
  const backgroundTheme = (entry.fields.backgroundTheme ?? "default") as BackgroundTheme;

  const rawActionButton = entry.fields.actionButton as IBaseButton | undefined;
  let actionButton: { label: string; href: string; metricEventName?: string; entryId?: string } | undefined;
  if (rawActionButton?.fields?.label) {
    const href = extractUrlFromTarget(rawActionButton.fields.target, linkLocale);
    if (href) {
      actionButton = {
        label: rawActionButton.fields.label,
        href,
        entryId: rawActionButton.sys?.id,
        metricEventName: entry.fields.metricEventName ?? undefined,
      };
    }
  }

  return (
    <MultiItemModule
      entryId={entry.sys.id}
      title={entry.fields.title ?? undefined}
      subtitle={entry.fields.subtitle ?? undefined}
      items={items}
      layout={layout}
      columns={entry.fields.columns ?? 3}
      autoplay={entry.fields.autoplay ?? false}
      autoplayDelayMs={entry.fields.autoplayDelayMs ?? 5000}
      showArrows={entry.fields.showArrows ?? true}
      showDots={entry.fields.showDots ?? true}
      backgroundTheme={backgroundTheme}
      isLogoContent={isLogoContent}
      actionButton={actionButton}
    />
  );
}

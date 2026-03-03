import React from "react";
import { Entry } from "contentful";

import type { IMultiItemModule, IHeroModule, IBlogPostPage, ILandingPage, ILogo, IBaseButton } from "../../type";
import { extractUrlFromTarget } from "@/lib/utils";
import { extractImageWithFocalPoint } from "@/lib/focal-point";
import MultiItemModule, { type MultiItemModuleItem, type MultiItemLayout, type BackgroundTheme } from "./multi-item-module";
import HeroModule, { type HeroModuleSlide } from "../hero-module/hero-module";

type SupportedItemEntry = IHeroModule | IBlogPostPage | ILandingPage | ILogo;

function getContentTypeId(entry: Entry<any>): string | null {
  return (
    entry?.sys?.contentType?.sys?.id ??
    (entry?.sys as any)?.contentTypeId ??
    null
  );
}

function mapButtons(buttons: unknown): Array<{ label: string; href: string }> {
  if (!Array.isArray(buttons)) return [];
  return (buttons as IBaseButton[])
    .map((b) => {
      const label = b?.fields?.label;
      const href = extractUrlFromTarget(b?.fields?.target);
      if (!label || !href) return null;
      return { label, href };
    })
    .filter((v): v is { label: string; href: string } => Boolean(v));
}

function extractHeroModuleSlide(entry: IHeroModule): HeroModuleSlide | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const title = entry.fields.headline ?? "";
  if (!title) return null;

  const description = entry.fields.subCopy ?? undefined;
  const imagePlacement = entry.fields.imagePlacement;

  const imageEntry = entry.fields.image;
  const {
    url: imageUrl,
    alt: imageAlt,
    objectPosition,
    entryId: imageEntryId,
  } = extractImageWithFocalPoint(imageEntry);

  const buttons = mapButtons(entry.fields.buttons);

  return {
    title,
    description,
    imageUrl: imageUrl || undefined,
    imageAlt: imageAlt || title,
    imageObjectPosition: objectPosition,
    imageEntryId,
    imagePlacement: imagePlacement === "Left" ? "Left" : "Right",
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

function extractItemFromBlogPost(entry: IBlogPostPage): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const featuredImage = entry.fields.featuredImage as any;
  const imageUrl = featuredImage?.fields?.file?.url
    ? `https:${featuredImage.fields.file.url}`
    : undefined;

  return {
    id: entry.sys.id,
    contentType: "blogPost",
    title: entry.fields.title ?? undefined,
    imageUrl,
    imageAlt: featuredImage?.fields?.title ?? entry.fields.title ?? undefined,
    href: `/blog/${entry.fields.slug}`,
  };
}

function extractItemFromLandingPage(entry: ILandingPage): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  return {
    id: entry.sys.id,
    contentType: "landingPage",
    title: entry.fields.title ?? undefined,
    href: `/${entry.fields.slug}`,
  };
}

function extractItemFromLogo(entry: ILogo): MultiItemModuleItem | null {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const imageAsset = entry.fields.image as any;
  const imageUrl = imageAsset?.fields?.file?.url
    ? `https:${imageAsset.fields.file.url}`
    : undefined;

  const linkTarget = entry.fields.link;
  const href = linkTarget ? extractUrlFromTarget(linkTarget) : undefined;

  return {
    id: entry.sys.id,
    contentType: "logo",
    title: entry.fields.name ?? entry.fields.internalName ?? undefined,
    imageUrl,
    imageAlt: entry.fields.name ?? entry.fields.internalName ?? "Logo",
    href: href ?? undefined,
  };
}

function extractItem(entry: SupportedItemEntry): MultiItemModuleItem | null {
  const contentType = getContentTypeId(entry);

  switch (contentType) {
    case "heroModule":
      return extractItemFromHeroModule(entry as IHeroModule);
    case "blogPost":
      return extractItemFromBlogPost(entry as IBlogPostPage);
    case "landingPage":
      return extractItemFromLandingPage(entry as ILandingPage);
    case "logo":
      return extractItemFromLogo(entry as ILogo);
    default:
      if (process.env.NODE_ENV === "development") {
        console.warn(`[MultiItemModule] Unknown item content type: ${contentType}`);
      }
      return null;
  }
}

export default function MultiItemModuleWrapper(entry: IMultiItemModule) {
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

  // Filter items to only include those matching the first item's content type
  const filteredItems = rawItems.filter((item) => {
    if (!item?.sys?.id) return false;
    const itemContentType = getContentTypeId(item);
    return itemContentType === firstItemContentType;
  });

  if (filteredItems.length === 0) {
    return null;
  }

  // Special handling for heroModule: render using existing HeroModule component
  // Always render as 1-column carousel with autoplay, ignoring column settings
  if (firstItemContentType === "heroModule") {
    const slides: HeroModuleSlide[] = filteredItems
      .map((item) => extractHeroModuleSlide(item as IHeroModule))
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
    .map(extractItem)
    .filter((item): item is MultiItemModuleItem => item !== null);

  if (items.length === 0) {
    return null;
  }

  const isLogoContent = firstItemContentType === "logo";
  const layout = (entry.fields.layout ?? "carousel") as MultiItemLayout;
  const backgroundTheme = (entry.fields.backgroundTheme ?? "default") as BackgroundTheme;

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
    />
  );
}

import React from "react";
import { Entry } from "contentful";

import type { IMultiItemModule, IHeroModule, IBlogPostPage, ILandingPage, ILogo, IBaseButton, ICampaign } from "../../type";
import { extractUrlFromTarget, localizeInternalPath } from "@/lib/utils";
import { extractImageWithFocalPoint } from "@/lib/focal-point";
import MultiItemModule, { type MultiItemModuleItem, type MultiItemLayout, type BackgroundTheme } from "./multi-item-module";
import HeroModule, { type HeroModuleSlide } from "../hero-module/hero-module";

type SupportedItemEntry = IHeroModule | IBlogPostPage | ILandingPage | ILogo | ICampaign;

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
  const imagePlacement = entry.fields.imagePlacement;

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
  const { locale, defaultLocale: defaultLocaleProp, ...entry } = props;
  const defaultLocale = defaultLocaleProp ?? "en-US";
  const linkLocale: LinkLocale = { locale, defaultLocale };

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

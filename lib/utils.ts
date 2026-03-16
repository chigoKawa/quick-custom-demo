import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Asset } from "contentful";
import {
  ILandingPage,
  IExternalUrl,
  IBlogPostPage,
  ICategoryPage,
  IProductStory,
} from "@/features/contentful/type";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractContentfulAssetUrl = (image: Asset | null | undefined): string => {
  const raw: string = image?.fields?.file?.url?.toString() || "";
  if (!raw) return "";
  // Contentful returns protocol-relative URLs (//images.ctfassets.net/…)
  return raw.startsWith("//") ? `https:${raw}` : raw;
};

export function isPreviewEnabled(
  searchParams: unknown
): searchParams is { [key: string]: string | string[] | undefined } {
  if (!searchParams || typeof searchParams !== "object") return false;
  return "preview" in (searchParams as Record<string, unknown>);
}

export const extractUrlFromTarget = (
  target: IExternalUrl | ILandingPage | IBlogPostPage | ICategoryPage | IProductStory
) => {
  const contentType = target?.sys?.contentType?.sys?.id;
  if (contentType === "landingPage") {
    const entry = target as ILandingPage;
    if (entry?.fields?.slug === "homepage" || entry?.fields?.slug === "home") {
      return "/";
    }

    return `/${entry?.fields?.slug}`;
  }

  if (contentType === "blogPost") {
    const entry = target as IBlogPostPage;

    return `/blog/${entry?.fields?.slug}`;
  }

  if (contentType === "categoryPage") {
    const entry = target as ICategoryPage;
    const slug = entry?.fields?.slug;
    return slug ? `/category/${slug}` : "";
  }

  if (contentType === "productStory") {
    const entry = target as IProductStory;
    const slug = entry?.fields?.slug;
    return slug ? `/stories/${slug}` : "";
  }

  if (contentType === "externalLink") {
    const entry = target as IExternalUrl;

    return `${entry?.fields?.url}`;
  }

  return "";
};

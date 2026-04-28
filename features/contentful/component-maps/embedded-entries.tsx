import React from "react";
import CtaWrapper from "../components/cta/cta-wrapper";
import CodeSnippet from "../components/code-snippet/code-snippet";
import PersonWrapper from "../components/person/person-wrapper";
import PaymentMethodsBlock from "../components/payment-methods/payment-methods-block";
import MarketContentBlock from "../components/market-content-block/market-content-block";
import ProductCatalogSection from "../components/product-catalog/product-catalog-section";
import ProductCategoryShelf from "../components/product-catalog/product-category-shelf";

function PexelsImageBlock({ entry }: { entry: any }) {
  const pexels = entry?.fields?.pexelsImage;
  if (!pexels) return null;

  const src =
    pexels.src?.landscape ||
    pexels.src?.large2x ||
    pexels.src?.large ||
    pexels.src?.original;
  const alt = pexels.alt || "Image";
  const attribution = pexels.attribution?.text;
  const radius = entry?.fields?.radius;

  const radiusClass =
    radius === "Small"
      ? "rounded"
      : radius === "Medium"
        ? "rounded-lg"
        : radius === "Large"
          ? "rounded-2xl"
          : radius === "Full"
            ? "rounded-full"
            : "";

  return (
    <figure className="my-8">
      <img
        src={src}
        alt={alt}
        className={`w-full object-cover ${radiusClass}`}
        loading="lazy"
      />
      {attribution && (
        <figcaption className="text-xs text-center text-muted-foreground mt-2">
          {attribution}
        </figcaption>
      )}
    </figure>
  );
}

export const embeddedEntryComponentMap = {
  cta: CtaWrapper,
  codeSnippet: CodeSnippet,
  person: PersonWrapper,
} as const;

const LOCALE_AWARE_BLOCK_TYPES: Record<
  string,
  React.ComponentType<{ entry: any; locale: string }>
> = {
  paymentMethodsSnippet: PaymentMethodsBlock,
  marketContentBlock: MarketContentBlock,
  productCatalog: ProductCatalogSection as unknown as React.ComponentType<{ entry: any; locale: string }>,
  productCategory: ProductCategoryShelf as unknown as React.ComponentType<{ entry: any; locale: string }>,
  pexelsImageWrapper: PexelsImageBlock as unknown as React.ComponentType<{ entry: any; locale: string }>,
};

function inferContentTypeId(entry: any): string | undefined {
  const explicit = entry?.sys?.contentType?.sys?.id;
  if (explicit) return explicit;

  const fields = entry?.fields;
  if (!fields) return undefined;

  if ("commerceCategoryId" in fields) return "productCategory";
  if ("pexelsImage" in fields) return "pexelsImageWrapper";
  if ("products" in fields && "cta" in fields) return "productCatalog";
  return undefined;
}

export function renderEmbeddedEntry(
  entry: unknown,
  options?: { isInline?: boolean; locale?: string }
): React.ReactNode {
  const contentTypeId = inferContentTypeId(entry);

  if (!contentTypeId) return null;

  const LocaleBlock = LOCALE_AWARE_BLOCK_TYPES[contentTypeId];
  if (LocaleBlock && !options?.isInline) {
    return (
      <div className="not-prose w-full">
        <LocaleBlock entry={entry as any} locale={options?.locale ?? "en-US"} />
      </div>
    );
  }

  const Component =
    embeddedEntryComponentMap[
      contentTypeId as keyof typeof embeddedEntryComponentMap
    ];
  if (!Component) return null;

  return options?.isInline ? (
    <Component isInline={true} {...(entry as any)} />
  ) : (
    <Component {...(entry as any)} />
  );
}

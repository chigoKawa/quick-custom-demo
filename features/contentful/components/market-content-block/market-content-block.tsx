"use client";

import React from "react";
import {
  documentToReactComponents,
  type Options,
} from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES, type Document } from "@contentful/rich-text-types";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { renderEmbeddedEntry } from "@/features/contentful/component-maps/embedded-entries";

const LOCALE_TO_MARKET: Record<string, string> = {
  "en-US": "US",
  de: "DE",
  ar: "DE",
  sv: "SE",
  da: "DK",
  fi: "FI",
  es: "ES",
  "es-MX": "MX",
  "it-IT": "IT",
};

function resolveMarketCode(locale: string): string {
  if (LOCALE_TO_MARKET[locale]) return LOCALE_TO_MARKET[locale];
  const upper = locale.split("-").pop()?.toUpperCase();
  return upper || locale.toUpperCase();
}

type MarketRef = {
  sys?: { id?: string };
  fields?: { code?: string; locales?: string[] };
};

type MarketContentBlockEntry = {
  sys?: { id?: string; contentType?: { sys?: { id?: string } } };
  fields?: {
    displayMode?: string;
    targetMarkets?: MarketRef[];
    content?: Document;
  };
};

function isMarketMatch(markets: MarketRef[], locale: string): boolean {
  const targetCode = resolveMarketCode(locale);

  for (const m of markets) {
    if (!m?.fields) continue;

    const locales = m.fields.locales;
    if (Array.isArray(locales) && locales.includes(locale)) return true;

    const code = (m.fields.code ?? "").toUpperCase();
    if (code === targetCode) return true;
  }

  return false;
}

function createBlockRichTextOptions(locale: string): Options {
  return {
    renderNode: {
      [BLOCKS.PARAGRAPH]: (_node, children) => (
        <p className="mb-4 break-words">{children}</p>
      ),
      [BLOCKS.HEADING_2]: (_node, children) => (
        <h2 className="text-3xl font-semibold mb-5">{children}</h2>
      ),
      [BLOCKS.HEADING_3]: (_node, children) => (
        <h3 className="text-2xl font-medium mb-4">{children}</h3>
      ),
      [BLOCKS.UL_LIST]: (_node, children) => (
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2 [&>li]:ml-4">
          {children}
        </ul>
      ),
      [BLOCKS.OL_LIST]: (_node, children) => (
        <ol className="list-outside px-4 ml-4">{children}</ol>
      ),
      [BLOCKS.LIST_ITEM]: (_node, children) => (
        <li className="mb-2">{children}</li>
      ),
      [BLOCKS.QUOTE]: (_node, children) => (
        <blockquote className="border-l-4 border-gray-300 pl-4 mb-4 italic">
          {children}
        </blockquote>
      ),
      [BLOCKS.EMBEDDED_ENTRY]: (node) =>
        renderEmbeddedEntry(node?.data?.target, { locale }),
      [INLINES.EMBEDDED_ENTRY]: (node) =>
        renderEmbeddedEntry(node?.data?.target, { isInline: true, locale }),
      [INLINES.HYPERLINK]: (node, children) => (
        <a
          href={node.data.uri as string}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-4 hover:underline break-words"
        >
          {children}
        </a>
      ),
    },
    renderText: (text) => text,
  };
}

interface MarketContentBlockProps {
  entry: MarketContentBlockEntry;
  locale: string;
}

export default function MarketContentBlock({
  entry,
  locale,
}: MarketContentBlockProps) {
  const inspectorProps = useContentfulInspectorMode({
    entryId: entry?.sys?.id,
  });

  const fields = entry?.fields;
  if (!fields) return null;

  const displayMode = fields.displayMode ?? "showForMarkets";
  const markets = fields.targetMarkets ?? [];
  const content = fields.content;

  const matched = isMarketMatch(markets, locale);
  const shouldShow =
    displayMode === "showForMarkets" ? matched : !matched;

  if (!shouldShow || !content) return null;

  const options = createBlockRichTextOptions(locale);

  return (
    <div
      className="market-content-block"
      {...inspectorProps({ fieldId: "content" })}
    >
      {documentToReactComponents(content, options)}
    </div>
  );
}

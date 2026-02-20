"use client";

import React from "react";
import {
  documentToReactComponents,
  type Options,
} from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES, type Document } from "@contentful/rich-text-types";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { renderEmbeddedEntry } from "@/features/contentful/component-maps/embedded-entries";

type KbArticleEntry = {
  sys?: { id?: string };
  fields?: Record<string, unknown>;
};

function getLocalizedStringField(value: unknown, locale: string): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const rec = value as Record<string, unknown>;
  const direct = rec[locale];
  if (typeof direct === "string") return direct;
  for (const k of Object.keys(rec)) {
    const v = rec[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function extractAssetUrlFromRichTextNode(node: any, locale: string): string | null {
  const fileField = node?.data?.target?.fields?.file;
  if (!fileField) return null;

  // CDA often resolves to { url: string }, but Live Preview / other responses
  // may surface per-locale objects.
  if (typeof fileField === "object") {
    const directUrl = (fileField as any)?.url;
    if (typeof directUrl === "string") {
      return directUrl.startsWith("//") ? `https:${directUrl}` : `https:${directUrl}`;
    }

    const perLocale = fileField as Record<string, { url?: string } | undefined>;
    const preferred = perLocale[locale]?.url;
    if (typeof preferred === "string") {
      return preferred.startsWith("//") ? `https:${preferred}` : `https:${preferred}`;
    }

    for (const v of Object.values(perLocale)) {
      const url = v?.url;
      if (typeof url === "string") {
        return url.startsWith("//") ? `https:${url}` : `https:${url}`;
      }
    }
  }

  return null;
}

function createKbRichTextOptions(locale: string): Options {
  return {
    renderNode: {
      [BLOCKS.PARAGRAPH]: (_node, children) => <p className="mb-4 break-words">{children}</p>,
      [BLOCKS.HEADING_1]: (_node, children) => <h1 className="text-4xl font-bold mb-6">{children}</h1>,
      [BLOCKS.HEADING_2]: (_node, children) => <h2 className="text-3xl font-semibold mb-5">{children}</h2>,
      [BLOCKS.HEADING_3]: (_node, children) => <h3 className="text-2xl font-medium mb-4">{children}</h3>,
      [BLOCKS.UL_LIST]: (_node, children) => (
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2 [&>li]:ml-4">{children}</ul>
      ),
      [BLOCKS.OL_LIST]: (_node, children) => <ol className="list-outside px-4 ml-4">{children}</ol>,
      [BLOCKS.LIST_ITEM]: (_node, children) => <li className="mb-2">{children}</li>,
      [BLOCKS.QUOTE]: (_node, children) => (
        <blockquote className="border-l-4 border-gray-300 pl-4 mb-4 italic">{children}</blockquote>
      ),
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const url = extractAssetUrlFromRichTextNode(node, locale);
        const title = getLocalizedStringField(node?.data?.target?.fields?.title, locale) || "Embedded Image";
        if (!url) return null;
        // eslint-disable-next-line @next/next/no-img-element
        return (
          <div className="my-6 overflow-hidden">
            <img src={url} alt={title} className="rounded-md w-full max-w-full object-cover" />
            <p className="text-sm mt-2 text-center text-muted-foreground">{title}</p>
          </div>
        );
      },
      [BLOCKS.EMBEDDED_ENTRY]: (node) => renderEmbeddedEntry(node?.data?.target),
      [INLINES.EMBEDDED_ENTRY]: (node) => renderEmbeddedEntry(node?.data?.target, { isInline: true }),
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

export default function KbArticleClient({ entry: publishedEntry, locale }: { entry: KbArticleEntry; locale: string }) {
  const entry = (useContentfulLiveUpdates(publishedEntry) || publishedEntry) as KbArticleEntry;
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id });

  const fields = (entry?.fields || {}) as Record<string, unknown>;
  const title = getLocalizedStringField(fields.title, locale) || "";
  const summary = getLocalizedStringField(fields.summary, locale) || "";
  const body = (fields.body as Document | undefined) || undefined;

  const richTextOptions = React.useMemo(() => createKbRichTextOptions(locale), [locale]);

  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert">
      <h1 {...inspectorProps({ fieldId: "title" })} className="mb-2">
        {title}
      </h1>
      {summary ? (
        <p {...inspectorProps({ fieldId: "summary" })} className="text-muted-foreground text-lg">
          {summary}
        </p>
      ) : null}
      <div {...inspectorProps({ fieldId: "body" })} className="mt-6">
        {body ? documentToReactComponents(body, richTextOptions) : null}
      </div>
    </article>
  );
}

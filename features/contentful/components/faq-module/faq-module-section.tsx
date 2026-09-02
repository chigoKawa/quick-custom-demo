"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { Document } from "@contentful/rich-text-types";
import type { IBaseButton } from "../../type";
import BaseButtonWrapper from "../base-button/base-button-wrapper";
import { baseRichTextOptions } from "../../richtext";

type Layout = "accordion" | "two-column" | "list";

/**
 * Local presentational shapes. The generated `IFaqModule` / `IFaqItem` types in
 * `../../type` describe the Contentful field definitions; here we only care
 * about the resolved runtime values, and linked entries may still arrive as
 * bare `{ sys }` stubs when the query's include depth is too shallow.
 */
export interface FaqItemEntry {
  sys: { id: string };
  fields?: {
    internalName?: string;
    question?: string;
    answer?: Document;
    category?: string;
    actionButton?: IBaseButton;
  };
}

export interface FaqModuleEntry {
  sys: { id: string };
  fields: {
    internalName?: string;
    title?: string;
    subtitle?: string;
    items?: FaqItemEntry[];
    layout?: Layout;
    allowMultipleOpen?: boolean;
    enableStructuredData?: boolean;
    actionButton?: IBaseButton;
  };
}

interface Props {
  entry: FaqModuleEntry;
}

const answerProseClass =
  "prose dark:prose-invert max-w-none prose-headings:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg";

/** Only items with resolved fields and a question are renderable. */
function isRenderable(item: FaqItemEntry | undefined | null): item is FaqItemEntry {
  return Boolean(item?.sys?.id && item?.fields?.question);
}

/**
 * Flattens a rich text document to plain text for the JSON-LD answer body.
 * Block-level children are joined with a space so sentences don't run together.
 */
function richTextToPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { nodeType?: string; value?: string; content?: unknown[] };
  if (n.nodeType === "text") return n.value ?? "";
  if (!Array.isArray(n.content)) return "";

  const nodeType = n.nodeType ?? "";
  const isBlockContainer =
    nodeType === "document" ||
    nodeType === "unordered-list" ||
    nodeType === "ordered-list" ||
    nodeType === "list-item" ||
    nodeType === "blockquote" ||
    nodeType === "table" ||
    nodeType === "table-row" ||
    nodeType.startsWith("heading");

  return n.content
    .map(richTextToPlainText)
    .filter(Boolean)
    .join(isBlockContainer ? " " : "")
    .trim();
}

/** Splits items into `count` roughly equal columns, preserving reading order. */
function chunkIntoColumns<T>(items: T[], count: number): T[][] {
  const perColumn = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, i) =>
    items.slice(i * perColumn, (i + 1) * perColumn)
  ).filter((column) => column.length > 0);
}

/** One collapsible question. Owns its own inspector props so the item entry is editable in place. */
function FaqAccordionRow({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItemEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const inspectorProps = useContentfulInspectorMode({ entryId: item.sys.id });
  const { question, answer, actionButton } = item.fields ?? {};

  const buttonId = `faq-trigger-${item.sys.id}`;
  const panelId = `faq-panel-${item.sys.id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 py-5 text-left text-base md:text-lg font-medium transition-colors hover:text-primary"
        >
          <span {...inspectorProps({ fieldId: "question" })}>{question}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>

      {/* grid-rows trick: animates height without measuring the content */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!isOpen}
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div {...inspectorProps({ fieldId: "answer" })} className={`${answerProseClass} pb-5`}>
            {answer ? documentToReactComponents(answer, baseRichTextOptions) : null}
          </div>
          {actionButton?.sys?.id && (
            <div className="pb-6">
              <BaseButtonWrapper {...actionButton} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One always-expanded question, used by the `list` layout. */
function FaqListRow({ item }: { item: FaqItemEntry }) {
  const inspectorProps = useContentfulInspectorMode({ entryId: item.sys.id });
  const { question, answer, actionButton } = item.fields ?? {};

  return (
    <div>
      <h3
        {...inspectorProps({ fieldId: "question" })}
        className="text-lg md:text-xl font-semibold mb-3"
      >
        {question}
      </h3>
      <div {...inspectorProps({ fieldId: "answer" })} className={answerProseClass}>
        {answer ? documentToReactComponents(answer, baseRichTextOptions) : null}
      </div>
      {actionButton?.sys?.id && (
        <div className="mt-4">
          <BaseButtonWrapper {...actionButton} />
        </div>
      )}
    </div>
  );
}

export default function FaqModuleSection({ entry }: Props) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });

  const {
    title,
    subtitle,
    layout = "accordion",
    allowMultipleOpen = false,
    enableStructuredData = true,
    actionButton,
  } = entry.fields;

  const isList = layout === "list";
  const isTwoColumn = layout === "two-column";

  const items = useMemo(
    () => (Array.isArray(entry.fields.items) ? entry.fields.items.filter(isRenderable) : []),
    [entry.fields.items]
  );

  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggle = useCallback(
    (id: string) => {
      setOpenIds((prev) => {
        if (prev.includes(id)) return prev.filter((openId) => openId !== id);
        return allowMultipleOpen ? [...prev, id] : [id];
      });
    },
    [allowMultipleOpen]
  );

  // JSON-LD FAQPage — helps the questions surface as rich results.
  const structuredData = useMemo(() => {
    if (!enableStructuredData || items.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.fields?.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: richTextToPlainText(item.fields?.answer),
        },
      })),
    };
  }, [enableStructuredData, items]);

  // In list layout, group by category when editors have used it.
  const listGroups = useMemo(() => {
    if (!isList) return [];
    const groups = new Map<string, FaqItemEntry[]>();
    for (const item of items) {
      const key = item.fields?.category?.trim() || "";
      const bucket = groups.get(key);
      if (bucket) bucket.push(item);
      else groups.set(key, [item]);
    }
    return Array.from(groups.entries());
  }, [isList, items]);

  if (items.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <div className={`container mx-auto px-4 ${isTwoColumn ? "max-w-6xl" : "max-w-3xl"}`}>
        {(title || subtitle) && (
          <div className="text-center mb-10 md:mb-14">
            {title && (
              <h2
                {...inspectorProps({ fieldId: "title" })}
                className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                {...inspectorProps({ fieldId: "subtitle" })}
                className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {isList ? (
          <div {...inspectorProps({ fieldId: "items" })} className="space-y-12">
            {listGroups.map(([category, groupItems]) => (
              <div key={category || "ungrouped"} className="space-y-8">
                {category && (
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {category}
                  </h3>
                )}
                {groupItems.map((item) => (
                  <FaqListRow key={item.sys.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        ) : isTwoColumn ? (
          <div {...inspectorProps({ fieldId: "items" })} className="grid md:grid-cols-2 gap-x-12">
            {chunkIntoColumns(items, 2).map((columnItems, columnIndex) => (
              <div key={`faq-column-${columnIndex}`} className="border-t border-border">
                {columnItems.map((item) => (
                  <FaqAccordionRow
                    key={item.sys.id}
                    item={item}
                    isOpen={openIds.includes(item.sys.id)}
                    onToggle={() => toggle(item.sys.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div {...inspectorProps({ fieldId: "items" })} className="border-t border-border">
            {items.map((item) => (
              <FaqAccordionRow
                key={item.sys.id}
                item={item}
                isOpen={openIds.includes(item.sys.id)}
                onToggle={() => toggle(item.sys.id)}
              />
            ))}
          </div>
        )}

        {actionButton?.sys?.id && (
          <div className="mt-12 flex justify-center">
            <BaseButtonWrapper {...actionButton} />
          </div>
        )}
      </div>
    </section>
  );
}

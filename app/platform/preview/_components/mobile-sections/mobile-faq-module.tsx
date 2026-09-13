"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { Document } from "@contentful/rich-text-types";
import { baseRichTextOptions } from "@/features/contentful/richtext";
import { cn } from "@/lib/utils";
import type { IBaseButton } from "@/features/contentful/type";
import MobileButton from "./mobile-button";

/**
 * Mobile FAQ module.
 *
 * Always an accordion, whatever the authored `layout` is: "two-column" has no
 * meaning at ~390px, and "list" (every answer expanded) would push the rest of
 * the page far below the fold. The web renderer honours all three — this is a
 * deliberate mobile adaptation, not a gap.
 *
 * Interaction mirrors faq-module-section.tsx, including `allowMultipleOpen`.
 */

type FaqItemEntry = {
  sys: { id: string };
  fields?: {
    question?: string;
    answer?: Document;
    category?: string;
    actionButton?: IBaseButton;
  };
};

type Props = {
  sys: { id: string };
  fields: {
    title?: string;
    subtitle?: string;
    items?: FaqItemEntry[];
    layout?: string;
    allowMultipleOpen?: boolean;
    actionButton?: IBaseButton;
  };
};

/** Only items Contentful resolved, and that actually have a question. */
function isRenderable(item: FaqItemEntry | undefined | null): item is FaqItemEntry {
  return Boolean(item?.sys?.id && item?.fields?.question);
}

export default function MobileFaqModule(entry: Props) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  const allowMultipleOpen = Boolean(entry?.fields?.allowMultipleOpen);
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

  const items = useMemo(
    () => (Array.isArray(entry?.fields?.items) ? entry.fields.items.filter(isRenderable) : []),
    [entry?.fields?.items]
  );

  if (!entry?.sys?.id || !entry?.fields) return null;

  const title = entry.fields.title;
  const subtitle = entry.fields.subtitle;
  const actionButton = entry.fields.actionButton;

  // No structured data here: JSON-LD belongs on the real page, and emitting a
  // second FAQPage block from a preview surface would be misleading.
  if (items.length === 0) return null;

  return (
    <section className="w-full py-5">
      <div className="px-4">
        {title && (
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-lg font-bold text-foreground"
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p
            {...inspectorProps({ fieldId: "subtitle" })}
            className="mt-1 text-sm leading-relaxed text-muted-foreground"
          >
            {subtitle}
          </p>
        )}

        <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {items.map((item) => {
            const isOpen = openIds.includes(item.sys.id);
            const question = item.fields?.question ?? "";
            const answer = item.fields?.answer;
            const itemButton = item.fields?.actionButton;

            return (
              <div key={item.sys.id} className="bg-card">
                <button
                  type="button"
                  onClick={() => toggle(item.sys.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-3 px-3.5 py-3 text-left"
                >
                  <span className="text-sm font-medium leading-snug text-card-foreground">
                    {question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5">
                    {answer && (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary">
                        {documentToReactComponents(answer, baseRichTextOptions)}
                      </div>
                    )}
                    {itemButton && (
                      <div className="mt-3">
                        <MobileButton button={itemButton} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {actionButton && (
          <div className="mt-4">
            <MobileButton button={actionButton} fullWidth />
          </div>
        )}
      </div>
    </section>
  );
}

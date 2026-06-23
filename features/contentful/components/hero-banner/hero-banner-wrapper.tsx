"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { IHeroBanner } from "../../type";
import VariantPrimary from "./variant-primary";
import VariantCentered from "./variant-centered";
import VariantWithBgImage from "./variant-with-bgimage";

import ActionButtonRender from "./action-button-render";
import { extractContentfulAssetUrl } from "@/lib/utils";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { baseRichTextOptions } from "@/features/contentful/richtext";
import type { Document } from "@contentful/rich-text-types";

function richTextToPlain(doc: Document | null | undefined): string {
  if (!doc || typeof doc !== "object") return "";
  function extractText(node: unknown): string {
    if (!node || typeof node !== "object") return "";
    const n = node as { value?: string; content?: unknown[] };
    if (n.value) return n.value;
    if (Array.isArray(n.content)) return n.content.map(extractText).join("");
    return "";
  }
  return extractText(doc).trim();
}

const HerobannerWrapper = (props: IHeroBanner) => {
  // Strip nt_experiences/nt_variants before live updates — they contain circular
  // back-references that blow the stack in isEqual diffing.
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...safeFields } = (props?.fields ?? {}) as Record<string, unknown>;
  const safeEntry = props?.sys ? { sys: props.sys, fields: safeFields } as unknown as IHeroBanner : props;
  const entry = useContentfulLiveUpdates(safeEntry) || props;

  // Guard against undefined entry or missing sys
  if (!entry?.sys?.id || !entry?.fields) {
    return null;
  }

  const headlineDoc = entry.fields.headline as Document | null | undefined;
  const headline = headlineDoc ? documentToReactComponents(headlineDoc, baseRichTextOptions) : null;
  const headlinePlain = richTextToPlain(headlineDoc);
  const body = entry.fields.body;
  const heroImage = entry.fields.heroImage ?? null;
  const imageUrl = extractContentfulAssetUrl(heroImage);
  const buttons = entry.fields.actionButtons;
  const variant = entry.fields.variant;



  if (variant === "Centered") {
    return (
      <VariantCentered
        entryId={entry.sys.id}
        title={headline}
        titlePlain={headlinePlain}
        body={body}
        image={{ url: imageUrl, alt: "" }}
        buttons={buttons ? <ActionButtonRender buttons={buttons} /> : <></>}
      />
    );
  }

  if (variant === "With Background Image") {
    return (
      <VariantWithBgImage
        entryId={entry.sys.id}
        title={headline}
        titlePlain={headlinePlain}
        body={body}
        image={{ url: imageUrl, alt: "" }}
        buttons={buttons ? <ActionButtonRender buttons={buttons} /> : <></>}
      />
    );
  }
  return (
    <div className="relative">
      <VariantPrimary
        alignRight={variant === "Right Aligned"}
        entryId={entry.sys.id}
        title={headline}
        titlePlain={headlinePlain}
        body={body}
        image={{ url: imageUrl, alt: "" }}
        buttons={buttons ? <ActionButtonRender buttons={buttons} /> : <></>}
      />
    </div>
  );
};

export default HerobannerWrapper;

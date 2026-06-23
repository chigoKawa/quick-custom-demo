"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import SimpleCta from "./simple-cta";
import SmoothCta from "./smooth-cta";

import ActionButtonRender from "@/features/contentful/components/hero-banner/action-button-render";

import { extractContentfulAssetUrl } from "@/lib/utils";
import { ICta } from "../../type";

const CtaWrapper = (props: ICta) => {
  // Strip nt_experiences/nt_variants before live updates — they contain circular
  // back-references that blow the stack in isEqual diffing.
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...safeFields } = (props?.fields ?? {}) as Record<string, unknown>;
  const safeEntry = props?.sys ? { sys: props.sys, fields: safeFields } as unknown as ICta : props;
  const entry = useContentfulLiveUpdates(safeEntry) || props;

  // Guard against undefined entry or missing sys
  if (!entry?.sys?.id || !entry?.fields) {
    return null;
  }

  const title = entry.fields.title as string;
  const body = entry.fields.body;
  const images = entry.fields.images;
  //   const imageUrl = extractContentfulAssetUrl(heroImage);
  const extractedImageUrls = images?.map((image) =>
    extractContentfulAssetUrl(image)
  );
  const buttons = entry?.fields?.actionButtons;
  const variant = entry?.fields?.variant;
  const imagePlacement = entry?.fields?.imagePlacement;
  const backgroundColor = entry?.fields?.backgroundColor ?? "Default";

  const metricEventName = (entry?.fields as any)?.metricEventName as string | undefined;

  if (variant === "Smooth") {
    return (
      <SmoothCta
        entryId={entry.sys.id}
        title={title}
        body={body}
        images={Array.isArray(extractedImageUrls) ? extractedImageUrls : []}
        imagePlacement={imagePlacement === "Left" ? "Left" : "Right"}
        backgroundColor={backgroundColor}
        buttons={buttons ? <ActionButtonRender buttons={buttons} metricEventName={metricEventName as any} /> : <></>}
      />
    );
  }

  return (
    <SimpleCta
      entryId={entry.sys.id}
      title={title}
      body={body}
      images={Array.isArray(extractedImageUrls) ? extractedImageUrls : []}
      imagePlacement={imagePlacement === "Left" ? "Left" : "Right"}
      backgroundColor={backgroundColor}
      buttons={buttons ? <ActionButtonRender buttons={buttons} metricEventName={metricEventName as any} /> : <></>}
    />
  );
};

export default CtaWrapper;

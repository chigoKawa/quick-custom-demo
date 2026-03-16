"use client";

import React from "react";
import { useContentfulLiveUpdates, useContentfulInspectorMode } from "@contentful/live-preview/react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { baseRichTextOptions } from "@/features/contentful/richtext";
import { extractContentfulAssetUrl } from "@/lib/utils";

interface IRichContentModuleEntry {
  sys: { id: string; contentType?: { sys?: { id?: string } } };
  fields: {
    internalTitle: string;
    title?: string;
    body: unknown;
    image?: unknown;
    imageAlignment?: string;
    layout: string;
  };
}

export default function MobileRichContent(props: IRichContentModuleEntry) {
  const entry = useContentfulLiveUpdates(props) || props;
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  if (!entry?.sys?.id) return null;
  const title = entry.fields.title;
  const body = entry.fields.body;
  const imageAsset = entry.fields.image as any;
  const imageUrl = extractContentfulAssetUrl(imageAsset);

  return (
    <section className="w-full py-4">
      {imageUrl && (
        <div className="w-full aspect-[16/10] bg-secondary">
          <img src={imageUrl} alt={title || ""} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="px-4 py-3">
        {title && (
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-lg font-bold text-foreground mb-2"
          >
            {title}
          </h2>
        )}
        {body != null ? (
          <div
            {...inspectorProps({ fieldId: "body" })}
            className="text-sm text-foreground leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mb-1.5 [&>ul]:pl-4 [&>ul]:mb-3 [&>ol]:pl-4 [&>ol]:mb-3 [&>li]:mb-1"
          >
            {documentToReactComponents(body as Parameters<typeof documentToReactComponents>[0], baseRichTextOptions)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

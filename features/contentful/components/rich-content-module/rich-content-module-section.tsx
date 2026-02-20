"use client";

import React from "react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { Document } from "@contentful/rich-text-types";
import type { Asset } from "contentful";
import { baseRichTextOptions } from "../../richtext";

type Layout = "full-width" | "two-column-left" | "two-column-right";
type ImageAlignment = "left" | "right" | "center";

interface IRichContentModuleFields {
  internalTitle: string;
  title?: string;
  body: Document;
  image?: Asset;
  imageAlignment?: ImageAlignment;
  layout: Layout;
}

interface IRichContentModule {
  sys: { id: string; contentType?: { sys?: { id?: string } } };
  fields: IRichContentModuleFields;
}

interface Props {
  entry: IRichContentModule;
}

export default function RichContentModuleSection({ entry }: Props) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });

  const { title, body, image, imageAlignment = "center", layout } = entry.fields;

  // Extract image URL safely
  const imageUrl = image?.fields?.file?.url
    ? `https:${image.fields.file.url}`
    : null;
  const imageAlt = (image?.fields?.title as string) || title || "Content image";

  // Render rich text body
  const renderedBody = body ? documentToReactComponents(body, baseRichTextOptions) : null;

  // Full-width layout with image alignment options
  if (layout === "full-width") {
    // Determine image container classes based on alignment
    const imageContainerClass = 
      imageAlignment === "left" ? "float-left mr-8 mb-4 w-full md:w-1/2" :
      imageAlignment === "right" ? "float-right ml-8 mb-4 w-full md:w-1/2" :
      "mb-10 w-full"; // center (default)

    return (
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/10">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Title */}
          {title && (
            <h2
              {...inspectorProps({ fieldId: "title" })}
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-center mb-8"
            >
              {title}
            </h2>
          )}

          {/* Content wrapper for float clearing */}
          <div className="clearfix">
            {/* Image with alignment */}
            {imageUrl && (
              <div
                {...inspectorProps({ fieldId: "image" })}
                className={`${imageContainerClass} rounded-2xl overflow-hidden shadow-xl`}
              >
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Body */}
            <div
              {...inspectorProps({ fieldId: "body" })}
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-p:text-muted-foreground prose-a:text-primary prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
            >
              {renderedBody}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Two-column layouts
  const isImageLeft = layout === "two-column-left";
  const isImageRight = layout === "two-column-right";

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/10">
      <div className="container mx-auto px-4">
        <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${isImageRight ? "lg:flex-row-reverse" : ""}`}>
          {/* Image Column */}
          {imageUrl && (
            <div
              {...inspectorProps({ fieldId: "image" })}
              className={`${isImageRight ? "lg:order-2" : "lg:order-1"}`}
            >
              <div className="relative group">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted shadow-2xl ring-1 ring-black/5">
                  <img
                    src={imageUrl}
                    alt={imageAlt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                {/* Decorative element */}
                <div className={`absolute -z-10 w-full h-full rounded-3xl bg-primary/10 top-4 ${isImageLeft ? "-left-4" : "-right-4"}`} />
              </div>
            </div>
          )}

          {/* Content Column */}
          <div className={`${isImageRight ? "lg:order-1" : "lg:order-2"} ${!imageUrl ? "lg:col-span-2 max-w-3xl mx-auto" : ""}`}>
            {/* Title */}
            {title && (
              <h2
                {...inspectorProps({ fieldId: "title" })}
                className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
              >
                {title}
              </h2>
            )}

            {/* Body */}
            <div
              {...inspectorProps({ fieldId: "body" })}
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-p:text-muted-foreground prose-a:text-primary prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
            >
              {renderedBody}
            </div>
          </div>

          {/* Placeholder for no image in two-column layout */}
          {!imageUrl && (
            <div className="hidden lg:block" />
          )}
        </div>
      </div>
    </section>
  );
}

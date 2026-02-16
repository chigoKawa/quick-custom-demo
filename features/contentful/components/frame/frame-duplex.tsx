"use client";

import React from "react";
import type { IFrame } from "@/features/contentful/type";
import {
  useContentfulLiveUpdates,
  useContentfulInspectorMode,
} from "@contentful/live-preview/react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { baseRichTextOptions } from "@/features/contentful/richtext";
import { FadeIn } from "@/features/animations/in-view";
import { extractContentfulAssetUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import BaseButtonWrapper from "../base-button/base-button-wrapper";
import type {
  ICallout,
  IImageWrapper,
  IPexelsImageWrapper,
  IBlogPostPage,
  IBaseButton,
} from "@/features/contentful/type";

interface FrameDuplexProps {
  frame: IFrame;
}

function FrameDuplexRender({ frame }: FrameDuplexProps) {
  const liveFrame = useContentfulLiveUpdates(frame) || frame;
  const inspectorProps = useContentfulInspectorMode({
    entryId: liveFrame.sys.id,
  });

  // Extract all possible data from the frame
  const f = (liveFrame as unknown as { fields?: Partial<IFrame["fields"]> }).fields || {};
  const {
    frameHeader,
    things,
    backgroundMedia,
    alignment = "left",
  } = f as Partial<IFrame["fields"]>;

  const thingsArr = (things as IFrame["fields"]["things"]) || [];

  // Extract header data
  const headerData = frameHeader as any;
  const eyebrow = headerData?.fields?.eyebrow as string | undefined;
  const headline = headerData?.fields?.headline;
  const subline = headerData?.fields?.subline;

  // Extract first two things for duplex layout
  const firstThing = thingsArr?.[0];
  const secondThing = thingsArr?.[1];

  // Extract content from things
  const extractContent = (thing: any) => {
    if (!thing) return null;

    const ctid = thing?.sys?.contentType?.sys?.id;
    const fields = thing?.fields || {};

    switch (ctid) {
      case "callout":
        // Debug: Log the raw fields
        if (process.env.NODE_ENV === "development") {
          console.log("Callout fields:", fields);
          console.log("Callout button field:", fields.button);
        }
        return {
          type: "callout",
          title: fields.title,
          description: fields.subtitle,
          button: fields.button as IBaseButton | undefined, // Keep as single button like original Callout
          imageUrl: fields.media ? extractContentfulAssetUrl(fields.media) : null,
          imageAlt: fields.media?.fields?.title || "Callout image",
        };

      case "imageWrapper":
      case "pexelsImageWrapper":
        return {
          type: "image",
          url: extractContentfulAssetUrl(fields.image) || fields.imageUrl,
          alt: fields.image?.fields?.title || fields.alt || "",
        };

      case "blogPostPage":
        return {
          type: "blog",
          title: fields.title,
          excerpt: fields.excerpt,
          image: fields.heroImage,
        };

      default:
        return {
          type: "unknown",
          data: fields,
        };
    }
  };

  const firstContent = extractContent(firstThing);
  const secondContent = extractContent(secondThing);

  // Determine what goes on left/right sides
  const getLeftRightContent = () => {
    const hasHeader = !!frameHeader;
    const hasCallout = firstContent?.type === "callout";
    const hasCalloutWithImage = hasCallout && firstContent?.imageUrl;
    
    if (hasHeader && hasCallout) {
      // Combine header + callout - header provides title/description, callout provides button/image
      const combinedTextContent = {
        type: "combinedHeaderCallout",
        eyebrow,
        headline,
        subline,
        calloutButton: firstContent.button, // Only keep the callout's button
      };
      
      const visualContent = hasCalloutWithImage ? {
        type: "image",
        url: firstContent.imageUrl,
        alt: firstContent.imageAlt,
      } : null;
      
      if (alignment === "right") {
        return {
          left: visualContent || combinedTextContent,
          right: visualContent ? combinedTextContent : null,
        };
      } else {
        return {
          left: combinedTextContent,
          right: visualContent,
        };
      }
    }
    
    if (hasHeader) {
      // Header + first thing
      const firstThingIsCalloutWithImage = firstContent?.type === "callout" && firstContent?.imageUrl;
      const visualContent = firstThingIsCalloutWithImage ? {
        type: "image",
        url: firstContent!.imageUrl,
        alt: firstContent!.imageAlt,
      } : firstContent;
      
      if (alignment === "right") {
        return {
          left: visualContent,
          right: {
            type: "header",
            eyebrow,
            headline,
            subline,
          },
        };
      } else {
        return {
          left: {
            type: "header",
            eyebrow,
            headline,
            subline,
          },
          right: visualContent,
        };
      }
    } else {
      // Two things - prioritize callout images for visual side
      let left = firstContent;
      let right = secondContent;
      
      if (alignment === "right") {
        left = secondContent;
        right = firstContent;
      }
      
      // If right side is not an image but left side has callout with image, swap them
      if (right?.type !== "image" && left?.type === "callout" && left?.imageUrl) {
        return {
          left: {
            type: "image",
            url: left.imageUrl,
            alt: left.imageAlt,
          },
          right: right,
        };
      }
      
      // If right side has callout with image, convert it to image type
      if (right?.type === "callout" && right?.imageUrl) {
        return {
          left,
          right: {
            type: "image",
            url: right.imageUrl,
            alt: right.imageAlt,
          },
        };
      }
      
      return { left, right };
    }
  };

  const { left, right } = getLeftRightContent();

  // Render content based on type
  const renderContent = (content: any, side: "left" | "right") => {
    if (!content) return null;

    switch (content.type) {
      case "combinedHeaderCallout":
        return (
          <div className="order-2 lg:order-1">
            {content.eyebrow && (
              <p className="text-accent font-medium mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {content.eyebrow}
              </p>
            )}
            {content.headline && (
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
                {documentToReactComponents(content.headline, baseRichTextOptions)}
              </h2>
            )}
            {content.subline && (
              <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                {documentToReactComponents(content.subline, baseRichTextOptions)}
              </p>
            )}
            {content.calloutButton && (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
                <BaseButtonWrapper {...content.calloutButton} />
              </div>
            )}
          </div>
        );

      case "header":
        return (
          <div className="order-2 lg:order-1">
            {content.eyebrow && (
              <p className="text-accent font-medium mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {content.eyebrow}
              </p>
            )}
            {content.headline && (
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
                {documentToReactComponents(content.headline, baseRichTextOptions)}
              </h2>
            )}
            {content.subline && (
              <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                {documentToReactComponents(content.subline, baseRichTextOptions)}
              </p>
            )}
          
            {/* Buttons could be added here if needed */}
          </div>
        );

      case "image":
        return (
          <div className={cn(
            "order-1 lg:order-2 relative animate-in fade-in zoom-in-95 duration-700",
            side === "left" ? "lg:order-1" : "lg:order-2"
          )}>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-secondary">
              {content.url && (
                <img
                  src={content.url}
                  alt={content.alt}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
          </div>
        );

      case "callout":
        return (
          <div className={cn(
            "order-2 lg:order-1",
            side === "left" ? "lg:order-1" : "lg:order-2"
          )}>
            {content.title && (
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance">
                {documentToReactComponents(content.title, baseRichTextOptions)}
              </h2>
            )}
            {content.description && (
              <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed">
                {documentToReactComponents(content.description, baseRichTextOptions)}
              </p>
            )}
            
            {/* Debug: Check button data */}
            {process.env.NODE_ENV === "development" && (
              <div className="text-xs text-muted-foreground mb-4">
                Button data: {JSON.stringify(content.button, null, 2)}
              </div>
            )}
            {content.button && (
              <div className="flex items-center gap-4">
                <BaseButtonWrapper {...content.button} />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className={cn(
            "order-2 lg:order-1",
            side === "left" ? "lg:order-1" : "lg:order-2"
          )}>
            <div className="text-muted-foreground">
              Unknown content type
            </div>
          </div>
        );
    }
  };

  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {renderContent(left, "left")}
          {renderContent(right, "right")}
        </div>
      </div>
    </section>
  );
}

export default function FrameDuplex({ frame }: FrameDuplexProps) {
  const experiences = ((frame as any).fields?.nt_experiences ?? []) as unknown[];
  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;
  const mappedUnknown = Array.isArray(experiences)
    ? experiences.filter(isExp).map(mapExp)
    : [];
  
  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedUnknown as unknown as ExperiencesProp;

  if (mappedUnknown.length > 0) {
    return (
      <Experience
        id={frame.sys.id}
        component={FrameDuplexRender}
        experiences={experiencesForProp}
        {...frame}
      />
    );
  }

  return <FrameDuplexRender frame={frame} />;
}

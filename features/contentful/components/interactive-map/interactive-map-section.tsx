"use client";

import dynamic from "next/dynamic";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { motion } from "framer-motion";
import type { Document } from "@contentful/rich-text-types";
import type { IInteractiveMap, IMapPoint } from "../../type";
import { baseRichTextOptions } from "../../richtext";
import MapSkeleton from "./map-skeleton";

const InteractiveMap = dynamic(() => import("./interactive-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const animationVariants: Record<string, object> = {
  none: {},
  fadeIn: { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true } },
  slideUp: {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
  },
};

export default function InteractiveMapSection(entry: IInteractiveMap) {
  if (!entry?.fields || entry.fields.isActive === false) {
    return null;
  }

  const { title, description, mapStyle, animation, defaultZoom, defaultCenter, enableClustering, showRouteLines, points } =
    entry.fields;

  const resolvedPoints = ((points ?? []) as unknown as IMapPoint[]).filter(
    (p) => p?.fields?.location
  );

  if (resolvedPoints.length === 0) {
    return null;
  }

  const animKey = (animation as string) || "none";
  const variants = animationVariants[animKey] ?? {};
  const useAnimation = animKey !== "none";

  const Wrapper = useAnimation ? motion.section : "section";
  const wrapperProps = useAnimation ? { ...variants, transition: { duration: 0.6, ease: "easeOut" } } : {};

  return (
    <Wrapper className="w-full py-10 md:py-16 px-4 md:px-8" {...(wrapperProps as Record<string, unknown>)}>
      {title && (
        <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-foreground">{title as string}</h2>
      )}
      {description && (
        <div className="prose prose-sm max-w-none mb-6 text-muted-foreground">
          {documentToReactComponents(description as Document, baseRichTextOptions)}
        </div>
      )}
      <InteractiveMap
        points={resolvedPoints}
        mapStyle={mapStyle as string}
        defaultZoom={defaultZoom as number | undefined}
        defaultCenter={defaultCenter as { lat: number; lon: number } | undefined}
        enableClustering={!!enableClustering}
        showRouteLines={!!showRouteLines}
      />
    </Wrapper>
  );
}

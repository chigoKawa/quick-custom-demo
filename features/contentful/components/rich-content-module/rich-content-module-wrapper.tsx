"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import RichContentModuleSection from "./rich-content-module-section";

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

interface Props extends IRichContentModuleEntry {}

export default function RichContentModuleWrapper(props: Props) {
  const liveEntry = useContentfulLiveUpdates(props);

  // Guard against missing sys.id
  if (!liveEntry?.sys?.id) {
    return null;
  }

  return <RichContentModuleSection entry={liveEntry as any} />;
}

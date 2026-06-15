"use client";

import React, { ReactNode, useEffect, useMemo } from "react";
import { ContentfulLivePreview } from "@contentful/live-preview";
import { ContentfulLivePreviewProvider } from "@contentful/live-preview/react";

export default function AppLivePreviewWrapper({
  children,
  isPreview,
}: {
  children: ReactNode;
  isPreview: boolean;
}) {
  useEffect(() => {
    if (!isPreview) return;
    try {
      ContentfulLivePreview.init({
        locale: "en-US",
        enableInspectorMode: true,
        enableLiveUpdates: false,
        space: process.env.NEXT_PUBLIC_CTF_SPACE_ID,
        environment: "rebel",
      });
    } catch {
      // non-fatal — already initialised
    }
  }, [isPreview]);

  const key = useMemo(() => (isPreview ? "preview" : "no-preview"), [isPreview]);

  return (
    <ContentfulLivePreviewProvider
      key={key}
      locale="en-US"
      enableInspectorMode={isPreview}
      enableLiveUpdates={false}
      space={process.env.NEXT_PUBLIC_CTF_SPACE_ID}
      environment="rebel"
    >
      {children}
    </ContentfulLivePreviewProvider>
  );
}

"use client";

import React, { ReactNode, useEffect, useMemo } from "react";
import { ContentfulLivePreview } from "@contentful/live-preview";
import { ContentfulLivePreviewProvider } from "@contentful/live-preview/react";

const DEFAULT_ENVIRONMENT =
  process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";

export default function AppLivePreviewWrapper({
  children,
  isPreview,
  environment,
  locale,
}: {
  children: ReactNode;
  isPreview: boolean;
  environment?: string | null;
  locale?: string;
}) {
  const env = environment || DEFAULT_ENVIRONMENT;
  const activeLocale = locale || "en-US";

  useEffect(() => {
    if (!isPreview) return;
    try {
      ContentfulLivePreview.init({
        locale: activeLocale,
        enableInspectorMode: true,
        enableLiveUpdates: true,
        space: process.env.NEXT_PUBLIC_CTF_SPACE_ID,
        environment: env,
      });
    } catch {
      // non-fatal — already initialised
    }
  }, [isPreview, env, activeLocale]);

  // Re-mount the provider when locale or environment changes so the SDK
  // re-subscribes to the right channel and inspector tags resolve correctly.
  const key = useMemo(
    () => `${isPreview ? "preview" : "no-preview"}-${env}-${activeLocale}`,
    [isPreview, env, activeLocale]
  );

  return (
    <ContentfulLivePreviewProvider
      key={key}
      locale={activeLocale}
      enableInspectorMode={isPreview}
      enableLiveUpdates={isPreview}
      space={process.env.NEXT_PUBLIC_CTF_SPACE_ID}
      environment={env}
    >
      {children}
    </ContentfulLivePreviewProvider>
  );
}

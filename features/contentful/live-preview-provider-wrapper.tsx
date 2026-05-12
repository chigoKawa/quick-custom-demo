"use client";
import React, { ReactNode, useEffect, useMemo } from "react";
import { ContentfulLivePreview } from "@contentful/live-preview";
import { ContentfulLivePreviewProvider } from "@contentful/live-preview/react";

const LivePreviewProviderWrapper = ({
  children,
  locale,
  isPreviewEnabled,
}: {
  children: ReactNode;
  locale: string;
  isPreviewEnabled: boolean;
}) => {
  useEffect(() => {
    if (!isPreviewEnabled) return;
    try {
      ContentfulLivePreview.init({
        locale,
        enableInspectorMode: true,
        enableLiveUpdates: true,
        space: process.env.NEXT_PUBLIC_CTF_SPACE_ID,
        environment: process.env.NEXT_PUBLIC_CTF_ENVIRONMENT,
      });
    } catch {
      // non-fatal
    }
  }, [isPreviewEnabled, locale]);

  const providerKey = useMemo(() => `${locale}:${isPreviewEnabled ? "preview" : "no-preview"}`,
    [locale, isPreviewEnabled]
  );

  return (
    <ContentfulLivePreviewProvider
      key={providerKey}
      locale={locale}
      enableInspectorMode={isPreviewEnabled}
      enableLiveUpdates={isPreviewEnabled}
      space={process.env.NEXT_PUBLIC_CTF_SPACE_ID}
      environment={process.env.NEXT_PUBLIC_CTF_ENVIRONMENT}
    >
      {children}
    </ContentfulLivePreviewProvider>
  );
};

export default LivePreviewProviderWrapper;

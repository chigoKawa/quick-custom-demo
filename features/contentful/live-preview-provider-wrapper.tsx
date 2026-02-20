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
    >
      {children}
    </ContentfulLivePreviewProvider>
  );
};

export default LivePreviewProviderWrapper;

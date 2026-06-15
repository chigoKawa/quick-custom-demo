"use client";
import React, { ReactNode, useMemo } from "react";
import { ContentfulLivePreviewProvider } from "@contentful/live-preview/react";

const CONTENTFUL_ORIGINS = [
  "https://app.contentful.com",
  "https://app.eu.contentful.com",
];

const LivePreviewProviderWrapper = ({
  children,
  locale,
  isPreviewEnabled,
}: {
  children: ReactNode;
  locale: string;
  isPreviewEnabled: boolean;
}) => {
  const providerKey = useMemo(
    () => `${locale}:${isPreviewEnabled ? "preview" : "no-preview"}`,
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
      targetOrigin={CONTENTFUL_ORIGINS}
    >
      {children}
    </ContentfulLivePreviewProvider>
  );
};

export default LivePreviewProviderWrapper;

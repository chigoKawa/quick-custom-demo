"use client";

import React, { createContext, useContext } from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import type { Entry } from "contentful";
import type { SiteSettingsSkeleton } from "@/lib/site-settings";
import { Header } from "@/components/header";
import Footer from "@/features/layout/footer";

interface PersonalizedSiteSettingsProps {
  siteSettings: Entry<SiteSettingsSkeleton> | null;
  children: React.ReactNode;
}

// Context to pass page children through <Experience> without relying on
// entry props (which get replaced when a variant is selected).
const PageChildrenContext = createContext<React.ReactNode>(null);

// Stable module-level component — must NOT be defined inline inside
// PersonalizedSiteSettings or <Experience> will unmount/remount the
// tree on every profile change, causing flicker.
const SiteSettingsRenderer = (props: Entry<SiteSettingsSkeleton>) => {
  const pageChildren = useContext(PageChildrenContext);
  // <Experience> spreads the resolved entry (baseline or variant) as props.
  const entry = props?.sys ? (props as Entry<SiteSettingsSkeleton>) : null;
  return (
    <>
      <Header siteSettings={entry} />
      {pageChildren}
      <Footer siteSettings={entry} />
    </>
  );
};

export default function PersonalizedSiteSettings({
  siteSettings,
  children,
}: PersonalizedSiteSettingsProps) {
  // If siteSettings is null/missing, render baseline chrome with null
  if (!siteSettings?.sys?.id || !siteSettings?.fields) {
    return (
      <>
        <Header siteSettings={null} />
        {children}
        <Footer siteSettings={null} />
      </>
    );
  }

  const experiencesUnknown = (siteSettings.fields.nt_experiences ?? []) as unknown[];

  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;

  let mappedExperiencesUnknown: unknown[] = [];
  try {
    mappedExperiencesUnknown = experiencesUnknown.filter(isExp).map(mapExp);
  } catch {
    // If mapping fails, render baseline to avoid breaking the site chrome
    return (
      <>
        <Header siteSettings={siteSettings} />
        {children}
        <Footer siteSettings={siteSettings} />
      </>
    );
  }

  // No experiences configured — render baseline
  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return (
      <>
        <Header siteSettings={siteSettings} />
        {children}
        <Footer siteSettings={siteSettings} />
      </>
    );
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedExperiencesUnknown as unknown as ExperiencesProp;

  return (
    <PageChildrenContext.Provider value={children}>
      <Experience
        key={siteSettings.sys.id}
        id={siteSettings.sys.id}
        component={SiteSettingsRenderer}
        experiences={experiencesForProp}
        {...siteSettings}
      />
    </PageChildrenContext.Provider>
  );
}

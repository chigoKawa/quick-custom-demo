"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import type { IMultiItemModule } from "../../type";
import MultiItemModuleWrapper from "./multi-item-module-wrapper";
import { useSiteChromeLocale } from "@/features/site-chrome-locale";

/** Ninetailed `Experience` only forwards entry-shaped props; locale comes from context here. */
function MultiItemModuleWithLocale(entry: IMultiItemModule) {
  const { locale, defaultLocale } = useSiteChromeLocale();
  return (
    <MultiItemModuleWrapper
      {...entry}
      locale={locale}
      defaultLocale={defaultLocale}
    />
  );
}

export default function PersonalizedMultiItemModule(entry: IMultiItemModule) {
  // Guard against undefined entry or missing sys/fields
  if (!entry?.sys?.id || !entry?.fields) {
    return null;
  }

  const experiencesUnknown = (entry.fields.nt_experiences ?? []) as unknown[];

  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;

  let mappedExperiencesUnknown: unknown[] = [];
  try {
    mappedExperiencesUnknown = experiencesUnknown.filter(isExp).map(mapExp);
  } catch {
    return <MultiItemModuleWithLocale {...entry} />;
  }

  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <MultiItemModuleWithLocale {...entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedExperiencesUnknown as unknown as ExperiencesProp;

  return (
    <Experience
      key={entry.sys.id}
      id={entry.sys.id}
      component={MultiItemModuleWithLocale}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

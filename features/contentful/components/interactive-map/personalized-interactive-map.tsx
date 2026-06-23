"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { stripNtFromMappedExperiences } from "@/lib/contentful-live-preview-shallow";
import type { IInteractiveMap } from "../../type";
import InteractiveMapSection from "./interactive-map-section";

function InteractiveMapWithLiveUpdates(props: IInteractiveMap) {
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...safeFields } = (props?.fields ?? {}) as Record<string, unknown>;
  const safeEntry = props?.sys ? { sys: props.sys, fields: safeFields } as unknown as IInteractiveMap : props;
  const entry = useContentfulLiveUpdates(safeEntry) || props;
  return <InteractiveMapSection {...entry} />;
}

export default function PersonalizedInteractiveMap(entry: IInteractiveMap) {
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
    return <InteractiveMapSection {...entry} />;
  }

  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <InteractiveMapWithLiveUpdates {...entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = stripNtFromMappedExperiences(mappedExperiencesUnknown) as unknown as ExperiencesProp;

  return (
    <Experience
      key={entry.sys.id}
      id={entry.sys.id}
      component={InteractiveMapWithLiveUpdates}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

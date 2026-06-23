"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { stripNtFromMappedExperiences } from "@/lib/contentful-live-preview-shallow";
import type { IPropertyListings } from "../../type";
import PropertyListingsWrapper from "./property-listings-wrapper";

function PropertyListingsWithLiveUpdates(props: IPropertyListings) {
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...safeFields } = (props?.fields ?? {}) as Record<string, unknown>;
  const safeEntry = props?.sys ? { sys: props.sys, fields: safeFields } as unknown as IPropertyListings : props;
  const entry = useContentfulLiveUpdates(safeEntry) || props;
  return <PropertyListingsWrapper {...entry} />;
}

export default function PersonalizedPropertyListings(entry: IPropertyListings) {
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
    return <PropertyListingsWrapper {...entry} />;
  }

  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <PropertyListingsWithLiveUpdates {...entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = stripNtFromMappedExperiences(mappedExperiencesUnknown) as unknown as ExperiencesProp;

  return (
    <Experience
      key={entry.sys.id}
      id={entry.sys.id}
      component={PropertyListingsWithLiveUpdates}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

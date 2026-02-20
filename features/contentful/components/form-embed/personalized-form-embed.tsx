"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import type { IFormEmbed } from "../../type";
import FormEmbedSection from "./form-embed-section";

export default function PersonalizedFormEmbed(entry: IFormEmbed) {
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
    return <FormEmbedSection entry={entry} />;
  }

  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <FormEmbedSection entry={entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedExperiencesUnknown as unknown as ExperiencesProp;

  const WrappedComponent = (props: IFormEmbed) => (
    <FormEmbedSection entry={props} />
  );

  return (
    <Experience
      key={entry.sys.id}
      id={entry.sys.id}
      component={WrappedComponent}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

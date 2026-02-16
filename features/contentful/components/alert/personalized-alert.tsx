"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import AlertWrapper from "./alert-wrapper";
import { IAlert } from "../../type";

export default function PersonalizedAlert(entry: IAlert) {
  const experiencesUnknown = (entry.fields.nt_experiences ?? []) as unknown[];

  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;

  let mappedExperiencesUnknown: unknown[] = [];
  try {
    mappedExperiencesUnknown = experiencesUnknown.filter(isExp).map(mapExp);
  } catch {
    // If mapping fails for any reason, render baseline to avoid 500s in production
    return <AlertWrapper {...entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedExperiencesUnknown as unknown as ExperiencesProp;

  // If there are no experiences configured, render baseline as-is
  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <AlertWrapper {...entry} />;
  }

  // Experience will choose the active variant client-side and pass it
  // to the provided component (AlertWrapper).
  return (
    <Experience
      id={entry.sys.id}
      component={AlertWrapper}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

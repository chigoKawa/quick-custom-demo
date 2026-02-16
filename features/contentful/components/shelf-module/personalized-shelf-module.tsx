"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import type { IShelfModule } from "../../type";
import ShelfModuleWrapper from "./shelf-module-wrapper";

export default function PersonalizedShelfModule(entry: IShelfModule) {
  const experiencesUnknown = (entry.fields.nt_experiences ?? []) as unknown[];

  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;

  let mappedExperiencesUnknown: unknown[] = [];
  try {
    mappedExperiencesUnknown = experiencesUnknown.filter(isExp).map(mapExp);
  } catch {
    return <ShelfModuleWrapper {...entry} />;
  }

  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <ShelfModuleWrapper {...entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedExperiencesUnknown as unknown as ExperiencesProp;

  return (
    <Experience
      id={entry.sys.id}
      component={ShelfModuleWrapper}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

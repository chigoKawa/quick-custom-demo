"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import type { IHeroModule } from "../../type";
import HeroModuleWrapper from "./hero-module-wrapper";

export default function PersonalizedHeroModule(entry: IHeroModule) {
  const experiencesUnknown = (entry.fields.nt_experiences ?? []) as unknown[];

  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;

  let mappedExperiencesUnknown: unknown[] = [];
  try {
    mappedExperiencesUnknown = experiencesUnknown.filter(isExp).map(mapExp);
  } catch {
    return <HeroModuleWrapper {...entry} />;
  }

  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <HeroModuleWrapper {...entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedExperiencesUnknown as unknown as ExperiencesProp;

  return (
    <Experience
      id={entry.sys.id}
      component={HeroModuleWrapper}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

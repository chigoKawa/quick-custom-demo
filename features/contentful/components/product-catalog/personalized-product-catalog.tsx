"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import type { IProductCatalog } from "../../type";
import ProductCatalogSection from "./product-catalog-section";

// Stable wrapper — must be defined outside the render function so
// <Experience> receives the same component reference across renders.
const ProductCatalogExperienceComponent = (props: IProductCatalog) => (
  <ProductCatalogSection entry={props} />
);

export default function PersonalizedProductCatalog(entry: IProductCatalog) {
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
    return <ProductCatalogSection entry={entry} />;
  }

  if (!mappedExperiencesUnknown || mappedExperiencesUnknown.length === 0) {
    return <ProductCatalogSection entry={entry} />;
  }

  type ExperiencesProp = NonNullable<
    React.ComponentProps<typeof Experience>["experiences"]
  >;
  const experiencesForProp = mappedExperiencesUnknown as unknown as ExperiencesProp;

  return (
    <Experience
      key={entry.sys.id}
      id={entry.sys.id}
      component={ProductCatalogExperienceComponent}
      experiences={experiencesForProp}
      {...entry}
    />
  );
}

"use client";
import React, { FC } from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import { IPersonalizedSection } from "../../type";
import { sectionsComponentMap } from "../../component-maps/sections";

/**
 * VariantDispatcher — renders any section entry by looking up its contentTypeId
 * in sectionsComponentMap. Used as the <Experience> component so that cross-type
 * variants (e.g. heroBanner baseline → multiItemModule variant) render correctly.
 */
function VariantDispatcher(props: any) {
  const contentTypeId: string | undefined =
    props?.sys?.contentType?.sys?.id ??
    props?.sys?.contentType?.id ??
    props?.sys?.contentTypeId ??
    undefined;

  if (!contentTypeId) return null;

  const Component = (sectionsComponentMap as Record<string, FC<any>>)[contentTypeId];
  if (!Component) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PersonalizedSection] No component mapped for", contentTypeId);
    }
    return null;
  }

  return <Component {...props} />;
}

/**
 * PersonalizedSection — the landing page section component for the
 * "Personalized Multi Variant Section" content type (id: personalizedSection).
 *
 * The `baseline` field holds the default section (any content type).
 * `nt_experiences` wires it into Ninetailed; variants can be any other
 * section type — the VariantDispatcher routes to the right component.
 */
export default function PersonalizedSection(entry: IPersonalizedSection) {
  if (!entry?.sys?.id || !entry?.fields) return null;

  const baseline = entry.fields.baseline;
  if (!baseline?.sys?.id) return null;

  const experiencesUnknown = (entry.fields.nt_experiences ?? []) as unknown[];
  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;

  let mappedExperiences: unknown[] = [];
  try {
    mappedExperiences = experiencesUnknown.filter(isExp).map(mapExp);
  } catch {
    return <VariantDispatcher {...baseline} />;
  }

  if (mappedExperiences.length === 0) {
    return <VariantDispatcher {...baseline} />;
  }

  type ExperiencesProp = NonNullable<React.ComponentProps<typeof Experience>["experiences"]>;

  return (
    <Experience
      key={entry.sys.id}
      id={entry.sys.id}
      component={VariantDispatcher}
      experiences={mappedExperiences as unknown as ExperiencesProp}
      {...baseline}
    />
  );
}

"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import type { IFaqModule } from "../../type";
import FaqModuleSection, { type FaqModuleEntry } from "./faq-module-section";

/**
 * Per CLAUDE.md: never hand a fully-resolved entry to `useContentfulLiveUpdates`.
 * Passing only `{ sys, fields }` keeps the lodash `isEqual` diff shallow enough
 * to survive the `include: 6` fetch depth.
 */
export default function FaqModuleWrapper(props: IFaqModule) {
  const liveEntry = useContentfulLiveUpdates({
    sys: props.sys,
    fields: props.fields,
  } as IFaqModule);

  const entry = liveEntry ?? props;

  if (!entry?.sys?.id || !entry?.fields) return null;

  return <FaqModuleSection entry={entry as unknown as FaqModuleEntry} />;
}

"use client";

import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { MicrocopyDataMap } from "@/lib/microcopy";

type UseMicrocopyResult = {
  value: string;
  inspectorProps: Record<string, unknown>;
};

/**
 * Hook to get microcopy value with Live Preview inspector support.
 * Returns the value and inspector props to spread onto any element.
 *
 * @example
 * const { value, inspectorProps } = useMicrocopy("kb.hero.title", microcopyData, "Default Title");
 * return <h1 {...inspectorProps}>{value}</h1>;
 */
export function useMicrocopy(
  key: string,
  data: MicrocopyDataMap | null | undefined,
  fallback: string = ""
): UseMicrocopyResult {
  const entry = data?.[key];
  const entryId = entry?.entryId;
  const value = entry?.value ?? fallback;

  const inspectorMode = useContentfulInspectorMode({
    entryId: entryId || undefined,
  });

  const inspectorProps = entryId
    ? (inspectorMode({ fieldId: "value" }) ?? {})
    : {};

  return { value, inspectorProps: inspectorProps as Record<string, unknown> };
}

/**
 * Create a reusable microcopy getter with inspector support.
 * Useful when you need to get multiple microcopy values in a component.
 *
 * @example
 * const t = createMicrocopyHelper(microcopyData);
 * const title = t("kb.hero.title", "Default Title");
 * return <h1 {...title.inspectorProps}>{title.value}</h1>;
 */
export function createMicrocopyHelper(data: MicrocopyDataMap | null | undefined) {
  return (key: string, fallback: string = ""): UseMicrocopyResult => {
    const entry = data?.[key];
    const value = entry?.value ?? fallback;
    
    // Note: This helper cannot use hooks directly, so inspector props
    // need to be constructed manually for non-hook usage.
    // For full inspector support, use the useMicrocopy hook instead.
    return {
      value,
      inspectorProps: entry?.entryId
        ? {
            "data-contentful-entry-id": entry.entryId,
            "data-contentful-field-id": "value",
          }
        : {},
    };
  };
}

/**
 * Hook version that returns a helper function for multiple microcopy values.
 * Each call returns { value, inspectorProps } that can be spread onto elements.
 *
 * @example
 * const t = useMicrocopyHelper(microcopyData);
 * return (
 *   <>
 *     <h1 {...t("kb.hero.title").inspectorProps}>{t("kb.hero.title").value}</h1>
 *     <p {...t("kb.hero.subtitle").inspectorProps}>{t("kb.hero.subtitle").value}</p>
 *   </>
 * );
 */
export function useMicrocopyHelper(data: MicrocopyDataMap | null | undefined) {
  const inspectorMode = useContentfulInspectorMode();

  return (key: string, fallback: string = ""): UseMicrocopyResult => {
    const entry = data?.[key];
    const value = entry?.value ?? fallback;
    const entryId = entry?.entryId;

    const inspectorProps = entryId
      ? (inspectorMode({ entryId, fieldId: "value" }) ?? {})
      : {};

    return { value, inspectorProps: inspectorProps as Record<string, unknown> };
  };
}

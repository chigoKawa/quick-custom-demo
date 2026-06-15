"use client";

import React from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";

/**
 * Wraps any rendered value with Contentful inspector-mode data attributes.
 * Must be a separate component (not an inline call) because useContentfulInspectorMode
 * can't be called inside a loop or map — each instance needs its own hook call.
 */
export function Inspectable({
  entryId,
  fieldId,
  as: Tag = "span",
  className,
  style,
  children,
}: {
  entryId: string;
  fieldId: string;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  return (
    <Tag {...(inspectorProps({ fieldId }) as object)} className={className} style={style}>
      {children}
    </Tag>
  );
}

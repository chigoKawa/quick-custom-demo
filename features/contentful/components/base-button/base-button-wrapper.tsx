import React from "react";
import { IBaseButton } from "../../type";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { extractUrlFromTarget } from "@/lib/utils";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { useTracking, type MetricEventName } from "@/features/tracking/use-tracking";
import { useSiteChromeLocale } from "@/features/site-chrome-locale";

// Mapping size options from Contentful-defined values to Shadcn button size variants
const sizeMap: Record<string, "sm" | "default" | "lg"> = {
  Small: "sm",
  Medium: "default",
  Large: "lg",
};

// Mapping Contentful variant values to Shadcn button variant keys
const variantMap: Record<string, "default" | "secondary" | "destructive" | "ghost" | "outline" | "link"> = {
  Primary: "default",
  Secondary: "secondary",
  Destructive: "destructive",
  Ghost: "ghost",
  Outline: "outline",
};

// BaseButtonWrapper: A wrapper for rendering buttons dynamically based on Contentful-entry-provided data
// Accepts optional metricEventName from the parent section for tracking clicks
const BaseButtonWrapper: React.FC<IBaseButton & { metricEventName?: MetricEventName }> = (entry) => {
  const { locale, defaultLocale } = useSiteChromeLocale();
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });
  const { trackMetric } = useTracking();

  // Guard against undefined entry or missing sys
  if (!entry?.sys?.id) {
    return null;
  }

  // When Contentful's include depth is too shallow, linked entries arrive
  // as { sys: { type: "Link", … } } without a `fields` property.
  // Warn in dev so it's easy to diagnose, and render nothing rather than crash.
  if (!entry.fields) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[BaseButton] Entry ${entry.sys.id} has no fields — likely an unresolved link. Increase the "include" depth in your Contentful query.`
      );
    }
    return null;
  }

  // Extract fields from the button entry
  const variant = entry.fields.variant;
  const size = entry.fields.size;
  const target = entry.fields.target;
  const openInNewTab = entry.fields.openInNewTab;
  const label = entry.fields.label;

  // If label is missing the button is not renderable
  if (!label) return null;

  const targetUrl = extractUrlFromTarget(target, { locale, defaultLocale });

  const shadcnVariant = variantMap[variant] ?? "default";
  const shadcnSize = sizeMap[size] ?? "default";

  return (
    <Button
      asChild
      variant={shadcnVariant}
      size={shadcnSize}
      className={cn("whitespace-normal break-words overflow-hidden")}
    >
      <Link
        {...inspectorProps({ fieldId: "label" })}
        href={targetUrl}
        target={openInNewTab ? "_blank" : "_self"}
        onClick={() => {
          const evt = entry.metricEventName;
          if (evt) {
            trackMetric(evt, {
              location: "cta-section",
              entryId: entry?.sys?.id,
              label,
              href: targetUrl,
            });
          }
        }}
      >
        {label}
      </Link>
    </Button>
  );
};

export default BaseButtonWrapper;

import React from "react";
import { IBaseButton } from "../../type";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { extractUrlFromTarget } from "@/lib/utils";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { useTracking, type MetricEventName } from "@/features/tracking/use-tracking";

import _ from "lodash";

// Mapping size options from Contentful-defined values to Shadcn button size variants
const sizeMap = {
  Small: "sm",
  Medium: "default",
  Large: "lg",
};

// BaseButtonWrapper: A wrapper for rendering buttons dynamically based on Contentful-entry-provided data
// Accepts optional metricEventName from the parent section for tracking clicks
const BaseButtonWrapper: React.FC<IBaseButton & { metricEventName?: MetricEventName }> = (entry) => {
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
  const variant = entry.fields.variant; // Defines button style (e.g., primary, secondary)
  const size = entry.fields.size; // Defines button size (Small, Medium, Large)
  const target = entry.fields.target; // Defines the target link
  const openInNewTab = entry.fields.openInNewTab; // Boolean to open in new tab or same tab
  const label = entry.fields.label; // Button label text

  // If label is missing the button is not renderable
  if (!label) return null;

  const targetUrl = extractUrlFromTarget(target); // Extract the actual URL from the target field

  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });
  const { trackMetric } = useTracking();

  // Base button styling (additional utility classes for spacing and focus styles)
  const btnClasses =
    "px-12 py-3 text-sm font-medium text-white focus:ring-2 focus:outline-hidden sm:w-auto";

  return (
    <Button
      asChild
      className={cn(
        btnClasses,
        variant === "Outline" ? "text-black" : "",
        buttonVariants({
          // variant: _.lowerCase(variant) as "default", 
          size: sizeMap[size] as "default", // Map Contentful Entry size to Tailwind button size
        }),
        " whitespace-normal  break-words overflow-hidden "
      )}
    >

      
      {/* Render as a Next.js Link with proper target attribute */}
      <Link
        {...inspectorProps({ fieldId: "label" })}
        href={targetUrl}
        target={openInNewTab ? "_blank" : "_self"}
        className=" w-full h-full "
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

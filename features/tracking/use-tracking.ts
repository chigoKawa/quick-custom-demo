"use client";

import { useCallback } from "react";
import { useNinetailed } from "@ninetailed/experience.js-react";

export type MetricEventName =
  | "newsletter_signup"
  | "customer_conversion"
  | "add_to_cart"
  | "hero_cta_clicked"
  | "demo_request_submitted"
  | "application_submitted"
  | "form_completed"
  | "paid_campaign_converted"
  | "kb_search"
  | "module_cta_clicked";

export function useTracking() {
  const { track } = useNinetailed();

  const trackMetric = useCallback(
    (eventName: MetricEventName, props?: Record<string, unknown>) => {
      try {
        // Guard for SSR / provider not ready
        if (typeof window === "undefined") return;
        
        // Ninetailed requires properties to be a valid JSON object with primitive values
        // Filter out undefined values and ensure all values are JSON-serializable
        const sanitizedProps: Record<string, string | number | boolean> = {};
        if (props) {
          for (const [key, value] of Object.entries(props)) {
            if (value !== undefined && value !== null) {
              // Convert to primitive types only
              if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                sanitizedProps[key] = value;
              } else {
                // Convert objects/arrays to JSON string
                sanitizedProps[key] = JSON.stringify(value);
              }
            }
          }
        }
        
        track?.(eventName as unknown as string, sanitizedProps as never);
      } catch {
        // tracking must be non-fatal
      }
    },
    [track]
  );

  return { trackMetric } as const;
}

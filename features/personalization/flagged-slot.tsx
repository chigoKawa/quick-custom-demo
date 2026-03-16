"use client";

import React from "react";
import { useFlag } from "@ninetailed/experience.js-react";

/**
 * Generic render-prop component that resolves a Ninetailed variable flag
 * and only renders children when the resolved value is non-empty.
 *
 * Usage:
 *   <FlaggedSlot flagKey="checkout-coupon">
 *     {(value) => <MyCouponBanner {...value} />}
 *   </FlaggedSlot>
 *
 * - Renders nothing while the flag is loading or on error.
 * - Renders nothing if the resolved value is null, undefined, empty string,
 *   or an empty object — so both baseline and variant can opt-out by being empty.
 * - The `defaultValue` is returned when no matching flag is found.
 */

interface FlaggedSlotProps<T = unknown> {
  flagKey: string;
  defaultValue?: T;
  children: (value: T) => React.ReactNode;
  loading?: React.ReactNode;
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as Record<string, unknown>).length === 0) return true;
  return false;
}

export function FlaggedSlot<T = unknown>({
  flagKey,
  defaultValue,
  children,
  loading: loadingFallback = null,
}: FlaggedSlotProps<T>) {
  let result: { value: unknown; status: string; error: unknown };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result = useFlag(flagKey, (defaultValue ?? null) as any);
  } catch (err) {
    console.warn(`[FlaggedSlot] useFlag("${flagKey}") threw:`, err);
    return null;
  }

  const { value, status } = result;

  if (status === "loading") return <>{loadingFallback}</>;
  if (status === "error" || isEmpty(value)) return null;

  return <>{children(value as T)}</>;
}

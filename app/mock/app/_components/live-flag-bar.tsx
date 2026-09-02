"use client";

import React, { useState } from "react";
import { useFlag } from "@ninetailed/experience.js-react";
import { Info, AlertCircle, CheckCircle2, AlertTriangle, Sparkles, X } from "lucide-react";
import {
  useLiveEntry,
  useLiveLinkedIds,
  useLiveLinkedId,
  useLiveFieldValue,
} from "./entries-context";
import { useAppTheme } from "./theme-context";

type Severity = "info" | "success" | "warning" | "error" | "promo";

const SEVERITY_STYLES: Record<
  Severity,
  { background: string; foreground: string; icon: React.ReactNode }
> = {
  info: {
    background: "#E0F2FE",
    foreground: "#075985",
    icon: <Info className="h-4 w-4" />,
  },
  success: {
    background: "#DCFCE7",
    foreground: "#166534",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  warning: {
    background: "#FEF3C7",
    foreground: "#78350F",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  error: {
    background: "#FEE2E2",
    foreground: "#7F1D1D",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  promo: {
    background: "#FCE7F3",
    foreground: "#831843",
    icon: <Sparkles className="h-4 w-4" />,
  },
};

// Renders the screen's active flags as a stack of bars at the top of the
// device viewport. Each flag is live-subscribed: enabling/disabling, severity,
// title, body, and validity window changes all reflect without a reload.
export default function LiveFlagBar({ screenId }: { screenId: string }) {
  const flagIds = useLiveLinkedIds(screenId, "flags");
  if (flagIds.length === 0) return null;
  return (
    <div className="flex flex-col">
      {flagIds.map((id) => (
        <LiveFlagItem key={id} flagId={id} />
      ))}
    </div>
  );
}

function LiveFlagItem({ flagId }: { flagId: string }) {
  const theme = useAppTheme();
  const flag = useLiveEntry(flagId);
  const severity = (useLiveFieldValue<Severity>(flagId, "severity") ?? "info") as Severity;
  const title = useLiveFieldValue<string>(flagId, "title");
  const body = useLiveFieldValue<string>(flagId, "body");
  const dismissable = useLiveFieldValue<boolean>(flagId, "dismissable") ?? true;
  const validFrom = useLiveFieldValue<string>(flagId, "validFrom");
  const validTo = useLiveFieldValue<string>(flagId, "validTo");
  const buttonId = useLiveLinkedId(flagId, "button");
  const buttonLabel = useLiveFieldValue<string>(buttonId, "label");
  const code = useLiveFieldValue<string>(flagId, "code");
  const flagKey = useLiveFieldValue<string>(flagId, "flagKey");
  const defaultValue = useLiveFieldValue<boolean>(flagId, "defaultValue") ?? false;

  const [dismissed, setDismissed] = useState(false);

  // Visibility is driven by the Ninetailed Custom Variable Flag.
  //   - editors create an Experience in Ninetailed (Custom Flag, Boolean type)
  //   - they set baseline = false and add variants with value = true for the
  //     audiences that should see the bar
  //   - useFlag returns the resolved value for the current visitor
  //
  // While Ninetailed is still loading on the client, we render whatever
  // `defaultValue` says — typically false (hide), but editors can flip it to
  // true to optimistically show the bar pre-decision.
  //
  // We always call useFlag (React hooks rule) with a stable key. When the
  // appFlag entry has no flagKey set yet (draft state), we send a sentinel
  // key the SDK won't know — the result returns the supplied default.
  const liveFlagKey = flagKey?.trim() || "__appFlag.undefined__";
  const flagResult = useFlagSafely(liveFlagKey, defaultValue);

  const resolvedVisible = (() => {
    if (flagResult.status === "loading") return defaultValue;
    if (flagResult.status === "error") return defaultValue;
    return isTruthy(flagResult.value);
  })();

  if (!flag || dismissed || !title) return null;
  if (!withinWindow(validFrom, validTo)) return null;
  if (!resolvedVisible) return null;

  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;

  return (
    <div
      className="flex items-start gap-2 px-4 py-2.5"
      style={{
        background: style.background,
        color: style.foreground,
        borderBottom: `1px solid ${theme.borderSubtle}`,
      }}
      data-flag-code={code ?? undefined}
    >
      <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight">{title}</p>
        {body && <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{body}</p>}
        {buttonId && buttonLabel && (
          <button
            className="mt-1.5 text-[11px] font-semibold underline underline-offset-2"
            style={{ color: style.foreground }}
          >
            {buttonLabel}
          </button>
        )}
      </div>
      {dismissable && (
        <button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 opacity-70 hover:opacity-100"
          style={{ color: style.foreground }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Safe wrapper around Ninetailed's useFlag. If the provider isn't mounted
// (e.g. SSR or the SDK errored) we return a neutral error status instead of
// throwing — the caller falls back to the supplied default.
type FlagResult = { value: unknown; status: "loading" | "success" | "error" };
function useFlagSafely(key: string, defaultValue: unknown): FlagResult {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = useFlag(key, defaultValue as any) as { value: unknown; status: string };
    return {
      value: r.value,
      status:
        r.status === "success" || r.status === "loading" || r.status === "error"
          ? (r.status as FlagResult["status"])
          : "error",
    };
  } catch {
    return { value: defaultValue, status: "error" };
  }
}

function isTruthy(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "" || s === "false" || s === "0" || s === "off" || s === "no") return false;
    return true;
  }
  if (typeof v === "number") return v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
  return Boolean(v);
}

// Inclusive validity window check. Either bound may be absent — when both are
// absent the flag is always within the window (gated only by `enabled`).
function withinWindow(validFrom?: string, validTo?: string): boolean {
  // Use a stable timestamp from `Date.now()` would change every render and break
  // SSR — but for a preview demo where time is part of the experience, recompute
  // is fine. The page is `force-dynamic` so the server returns fresh markup.
  const nowMs = Date.now();
  if (validFrom) {
    const fromMs = Date.parse(validFrom);
    if (!isNaN(fromMs) && nowMs < fromMs) return false;
  }
  if (validTo) {
    const toMs = Date.parse(validTo);
    if (!isNaN(toMs) && nowMs > toMs) return false;
  }
  return true;
}

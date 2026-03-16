"use client";

import React, { useState } from "react";
import { Tag, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlaggedSlot } from "./flagged-slot";

const FLAG_KEY = "checkout-coupon";

interface CouponFlagValue {
  code?: string;
  message?: string;
  backgroundColor?: string;
  textColor?: string;
}

function CouponAlertInner({ value }: { value: CouponFlagValue }) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = typeof value === "string" ? value : value?.code;
  const message = typeof value === "string" ? undefined : value?.message;

  if (!code && !message) return null;
  if (dismissed) return null;

  const bgColor = (typeof value === "object" && value?.backgroundColor) || undefined;
  const txtColor = (typeof value === "object" && value?.textColor) || undefined;

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts — non-fatal
    }
  };

  return (
    <div
      className={cn(
        "relative w-full border-b px-4 py-2.5 text-sm",
        "bg-amber-50 border-amber-200 text-amber-900",
        "flex items-center justify-center gap-3"
      )}
      style={{
        ...(bgColor ? { backgroundColor: bgColor } : {}),
        ...(txtColor ? { color: txtColor } : {}),
      }}
      role="alert"
    >
      <Tag className="h-4 w-4 flex-shrink-0" />

      <span className="text-center">
        {message && <span>{message}</span>}
        {code && (
          <>
            {message ? " " : ""}
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center gap-1 font-mono font-semibold",
                "px-1.5 py-0.5 rounded bg-black/5 hover:bg-black/10",
                "transition-colors cursor-pointer"
              )}
              title="Click to copy"
            >
              {code}
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3 opacity-60" />
              )}
            </button>
          </>
        )}
      </span>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function CouponAlert() {
  return (
    <FlaggedSlot<CouponFlagValue> flagKey={FLAG_KEY}>
      {(value) => <CouponAlertInner value={value} />}
    </FlaggedSlot>
  );
}

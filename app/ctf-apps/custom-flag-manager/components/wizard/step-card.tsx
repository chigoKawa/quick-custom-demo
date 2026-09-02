"use client";

/**
 * The white card a wizard step sits on.
 *
 * Forma 36 v5 has no card primitive (`Card` is the entry-card pattern, with its own hover and
 * selection affordances), so this is a plain div carrying the mock's frame: 6px radius, the
 * default box shadow, 24px padding, capped at 720px.
 *
 * Deliberately per-step rather than applied by the wizard frame: step 3 lays its value editors out
 * as a full-width grid of their own cards and must not be boxed a second time.
 */

import React from "react";
import tokens from "@contentful/f36-tokens";

/** `tokens.boxShadowDefault` ships with a trailing `;`, which is invalid in a style object. */
export const CARD_SHADOW = tokens.boxShadowDefault.replace(/;$/, "");

export function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: tokens.colorWhite,
        borderRadius: tokens.borderRadiusMedium,
        boxShadow: CARD_SHADOW,
        padding: tokens.spacingL,
        maxWidth: 720,
      }}
    >
      {children}
    </div>
  );
}

/** The vertical rhythm inside a card. 20px matches the mock and has no token. */
export const CARD_STACK: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

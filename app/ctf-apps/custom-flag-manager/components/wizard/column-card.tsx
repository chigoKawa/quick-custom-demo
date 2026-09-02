"use client";

/**
 * The step-3 value card: one per column (baseline + each variant).
 *
 * Shared by the scalar editors and the JSON builder so the two never drift apart — a variant of a
 * `Boolean` flag and a variant of a `JSON` flag are the same object wearing a different body, and
 * the header (role pill, editable label, remove) is identical in both.
 *
 * Forma 36's `Card` is the entry-card pattern — it carries hover, selection and drag affordances
 * this is not — so the shell is native markup on f36 tokens, per the design.
 */

import React from "react";
import { IconButton, TextInput, Tooltip } from "@contentful/f36-components";
import { TrashSimpleIcon } from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import { CARD_SHADOW } from "./step-card";

export function ColumnCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: tokens.colorWhite,
        borderRadius: tokens.borderRadiusMedium,
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

interface ColumnCardHeaderProps {
  label: string;
  isBaseline: boolean;
  /** Absent on the baseline, whose label is fixed. */
  onRename?: (label: string) => void;
  /** Absent when removing would leave nothing to compare against. */
  onRemove?: () => void;
  /** Format-specific controls — the JSON card's validity pill and Builder/Code toggle. */
  children?: React.ReactNode;
}

export function ColumnCardHeader({
  label,
  isBaseline,
  onRename,
  onRemove,
  children,
}: ColumnCardHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: `${tokens.spacingS} ${tokens.spacingM}`,
        borderBottom: `1px solid ${tokens.colorElementLight}`,
      }}
    >
      <RolePill isBaseline={isBaseline} />

      {onRename ? (
        <TextInput
          aria-label="Variant label"
          size="small"
          value={label}
          onChange={(event) => onRename(event.target.value)}
          style={{ width: 160 }}
        />
      ) : (
        <span
          style={{
            fontSize: tokens.fontSizeM,
            fontWeight: tokens.fontWeightMedium,
            color: tokens.gray900,
          }}
        >
          {label}
        </span>
      )}

      <span style={{ flex: 1 }} />

      {children}

      {onRemove && (
        <Tooltip content="Remove variant" placement="top">
          <IconButton
            variant="transparent"
            size="small"
            aria-label="Remove variant"
            icon={<TrashSimpleIcon color={tokens.gray600} />}
            onClick={onRemove}
          />
        </Tooltip>
      )}
    </div>
  );
}

/**
 * "Baseline" and "Variant" are roles, not statuses, so this is not a Forma 36 `Badge` — its
 * variants all carry status meaning (`positive`, `negative`, `warning`).
 */
function RolePill({ isBaseline }: { isBaseline: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        flex: "0 0 auto",
        backgroundColor: isBaseline ? tokens.gray200 : tokens.blue200,
        color: isBaseline ? tokens.gray700 : tokens.blue600,
        borderRadius: tokens.borderRadiusSmall,
        padding: `0 ${tokens.spacingXs}`,
        fontSize: tokens.fontSizeS,
        lineHeight: "20px",
        fontWeight: tokens.fontWeightDemiBold,
      }}
    >
      {isBaseline ? "Baseline" : "Variant"}
    </span>
  );
}

/** The green/red pill the JSON card shows in its header. */
export function ValidityPill({ isValid, label }: { isValid: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        flex: "0 0 auto",
        backgroundColor: isValid ? tokens.green200 : tokens.red200,
        color: isValid ? tokens.green600 : tokens.red600,
        borderRadius: tokens.borderRadiusSmall,
        padding: `0 ${tokens.spacingXs}`,
        fontSize: tokens.fontSizeS,
        lineHeight: "20px",
        fontWeight: tokens.fontWeightMedium,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/** The card body's padding, so scalar and JSON bodies sit on the same grid. */
export const CARD_BODY_PADDING = `${tokens.spacingS} ${tokens.spacingM} ${tokens.spacingM}`;

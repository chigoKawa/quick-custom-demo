"use client";

import React from "react";
import { Flex, Text } from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";

import type { FlagFormat } from "../lib/nt-config";
import type { EntryStatus } from "../lib/types";

/**
 * The format→colour map is fixed by the design (PLAN.md §1.4). Forma 36's `Badge` has no
 * purple variant, so these are composed from tokens rather than approximated with the
 * wrong variant.
 */
const FORMAT_COLOURS: Record<FlagFormat, { bg: string; fg: string }> = {
  String: { bg: tokens.gray200, fg: tokens.gray700 },
  JSON: { bg: tokens.purple200, fg: tokens.purple600 },
  Number: { bg: tokens.blue200, fg: tokens.blue600 },
  Boolean: { bg: tokens.green200, fg: tokens.green600 },
};

export function FormatBadge({ format }: { format: FlagFormat }) {
  const { bg, fg } = FORMAT_COLOURS[format] ?? FORMAT_COLOURS.String;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: bg,
        color: fg,
        borderRadius: tokens.borderRadiusSmall,
        padding: `0 ${tokens.spacing2Xs}`,
        fontSize: tokens.fontSizeS,
        lineHeight: "20px",
        fontWeight: tokens.fontWeightDemiBold,
        whiteSpace: "nowrap",
      }}
    >
      {format}
    </span>
  );
}

const STATUS_LABEL: Record<EntryStatus, string> = {
  published: "Published",
  draft: "Draft",
  changed: "Changed",
};

const STATUS_COLOUR: Record<EntryStatus, string> = {
  published: tokens.green500,
  draft: tokens.orange400,
  changed: tokens.blue500,
};

/** Dot + label, matching the entry-status language used across the Contentful web app. */
export function FlagStatusBadge({ status }: { status: EntryStatus }) {
  return (
    <Flex alignItems="center" gap="spacing2Xs">
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flex: "0 0 auto",
          backgroundColor: STATUS_COLOUR[status],
        }}
      />
      <Text fontColor="gray700" fontSize="fontSizeS">
        {STATUS_LABEL[status]}
      </Text>
    </Flex>
  );
}

/** Monospace flag key. */
export function FlagKey({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: tokens.fontStackMonospace,
        fontSize: tokens.fontSizeM,
        color: tokens.gray900,
      }}
    >
      {children}
    </span>
  );
}

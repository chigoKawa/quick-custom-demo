"use client";

/**
 * Step 5 — review and developer handoff (PLAN.md §1.11).
 *
 * Two columns: what is about to be written on the left, what a developer needs in order to read
 * it on the right. The left column is the last chance to catch a mistake, so every row links back
 * to the step that owns it; the right column exists because a custom flag is inert until somebody
 * reads it in the frontend, and the author is usually not that somebody.
 *
 * Native markup on f36 tokens rather than `Note`/`Card`: the mock's notice boxes are compact
 * (13px/19px, no leading icon slot) and Forma 36's `Note` is a 14px body with a fixed icon
 * gutter, which reads as a different component sitting next to the summary rows.
 */

import React from "react";
import { Checkbox } from "@contentful/f36-components";
import { CopySimpleIcon, WarningIcon } from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import { FormatBadge } from "../badges";
import { buildFlagSnippet } from "../../lib/snippet";
import {
  BASELINE_ID,
  distributionOf,
  isKeyClaimed,
  keyOwnersOf,
  parityNotes,
  resolvedColumnValue,
  type FlagDraft,
  type WizardContext,
} from "../../lib/wizard";
import { pctToFraction } from "../../lib/nt-config";
import { CARD_SHADOW } from "./step-card";

interface StepReviewProps {
  draft: FlagDraft;
  context: WizardContext;
  onChange: (changes: Partial<FlagDraft>) => void;
  /** Jump back to the step that owns a summary row. */
  onEditStep: (step: number) => void;
  /**
   * Set by the submit handler when the Management API rejects the write (phase 9). Shown here,
   * next to the values it would have written, so nothing looks lost.
   */
  writeError?: string | null;
}

export default function StepReview({
  draft,
  context,
  onChange,
  onEditStep,
  writeError,
}: StepReviewProps) {
  const baseline = draft.columns.find((column) => column.id === BASELINE_ID);
  const baselineValue = baseline
    ? resolvedColumnValue(baseline, draft.format)
    : undefined;

  const snippet = React.useMemo(
    () =>
      buildFlagSnippet({
        key: draft.key || "flag_key",
        format: draft.format,
        baselineValue,
      }),
    [draft.key, draft.format, baselineValue],
  );

  const atParity = parityNotes(draft).filter((note) => note.same);
  const claimed = isKeyClaimed(draft, context);
  const owners = keyOwnersOf(draft, context);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: tokens.spacingM,
        alignItems: "start",
      }}
    >
      <ReviewCard title="Summary">
        {summaryRows(draft).map((row) => (
          <SummaryRow
            key={row.label}
            label={row.label}
            value={row.value}
            mono={row.mono}
            onEdit={() => onEditStep(row.step)}
          />
        ))}

        {claimed && (
          <NoticeBox tone="warning" icon>
            <p style={NOTICE_TEXT}>
              <strong style={{ fontWeight: tokens.fontWeightMedium }}>Key collision</strong>
              {" — "}
              {owners.join(", ")} already{" "}
              {owners.length === 1 ? "uses" : "use"} this key. Resolution is non-deterministic.
            </p>
            <div style={{ marginTop: 10 }}>
              <Checkbox
                isChecked={draft.collisionAck}
                onChange={(event) =>
                  onChange({ collisionAck: event.target.checked })
                }
              >
                I understand only one of these optimizations will apply and the winner is not
                configurable.
              </Checkbox>
            </div>
          </NoticeBox>
        )}

        {atParity.length > 0 && (
          <NoticeBox tone="warning" icon>
            <p style={NOTICE_TEXT}>
              {atParity.map((note) => note.label).join(", ")} matches the baseline and will produce
              no observable change.
            </p>
          </NoticeBox>
        )}

        {writeError && (
          <NoticeBox tone="negative" icon>
            <p style={NOTICE_TEXT}>{writeError}</p>
          </NoticeBox>
        )}
      </ReviewCard>

      <ReviewCard
        title="Developer handoff"
        titleAdornment={<FormatBadge format={draft.format} />}
      >
        <CodeBlock code={snippet} />
        <CopyButton code={snippet} />

        {/*
          The mock also carries a "Frontend validation schema" disclosure and a "Create Jira
          ticket" button. Both belong to features this build does not have yet (schema-guided
          mode, issue-tracker integration), so neither is stubbed here.
        */}

        <NoticeBox tone="primary">
          <p style={NOTICE_TEXT}>
            This flag has no effect until a developer reads it in the frontend.
          </p>
        </NoticeBox>
      </ReviewCard>
    </div>
  );
}

/* ------------------------------------------------------------------ summary */

interface SummaryRowSpec {
  label: string;
  value: string;
  /** The step that owns this value — where `Edit` goes. */
  step: number;
  mono?: boolean;
}

function summaryRows(draft: FlagDraft): SummaryRowSpec[] {
  const traffic = Math.round(draft.trafficPct);

  return [
    { label: "Name", value: draft.name || "—", step: 1 },
    // Experiments only, by scope — the mock branched on a type the wizard never offers.
    { label: "Type", value: "Experiment", step: 1 },
    { label: "Flag key", value: draft.key || "—", step: 2, mono: true },
    { label: "Format", value: draft.format, step: 2 },
    {
      label: "Variants",
      value: draft.columns.map((column) => column.label).join(", ") || "None",
      step: 3,
    },
    {
      // `primaryMetric` and `audienceId` hold ids until step 4 exists to resolve their names.
      label: "Primary metric",
      value: draft.primaryMetric ?? "No primary metric",
      step: 4,
    },
    {
      label: "Distribution",
      value: draft.distributionPcts
        ? `Manual — ${distributionOf(draft)
            .map((pct) => `${pct}%`)
            .join(" / ")}`
        : "Even split",
      step: 4,
    },
    {
      // Surfaced as both because the entry stores the fraction and the author entered the percent.
      label: "Traffic allocation",
      value: `${traffic}% (stored as ${pctToFraction(traffic)})`,
      step: 4,
    },
    { label: "Audience", value: draft.audienceId ?? "All visitors", step: 4 },
  ];
}

function SummaryRow({
  label,
  value,
  mono,
  onEdit,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onEdit: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: tokens.spacingS,
        padding: "7px 0",
        borderBottom: `1px solid ${tokens.colorElementLight}`,
      }}
    >
      <span
        style={{
          width: 150,
          flexShrink: 0,
          fontSize: 13,
          color: tokens.colorTextLight,
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: tokens.fontSizeM,
          color: tokens.gray800,
          fontFamily: mono ? tokens.fontStackMonospace : "inherit",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
      <button type="button" onClick={onEdit} style={EDIT_LINK}>
        Edit
      </button>
    </div>
  );
}

const EDIT_LINK: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 13,
  fontFamily: "inherit",
  color: tokens.blue600,
  cursor: "pointer",
  textDecoration: "underline",
  flexShrink: 0,
};

/* -------------------------------------------------------------------- shell */

function ReviewCard({
  title,
  titleAdornment,
  children,
}: {
  title: string;
  titleAdornment?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: tokens.colorWhite,
        borderRadius: tokens.borderRadiusMedium,
        boxShadow: CARD_SHADOW,
        padding: `20px ${tokens.spacingL}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: tokens.spacingXs }}>
        <h4
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: "24px",
            fontWeight: tokens.fontWeightDemiBold,
            color: tokens.gray900,
          }}
        >
          {title}
        </h4>
        {titleAdornment}
      </div>
      {children}
    </div>
  );
}

const NOTICE_TONES = {
  warning: { bg: tokens.orange100, border: tokens.orange200, icon: tokens.orange500 },
  negative: { bg: tokens.red100, border: tokens.red200, icon: tokens.red600 },
  primary: { bg: tokens.blue100, border: tokens.blue200, icon: tokens.blue500 },
} as const;

const NOTICE_TEXT: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: "19px",
  color: tokens.gray800,
};

function NoticeBox({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  icon?: boolean;
  children: React.ReactNode;
}) {
  const { bg, border, icon: iconColor } = NOTICE_TONES[tone];

  return (
    <div
      style={{
        display: "flex",
        gap: tokens.spacingS,
        padding: "12px 14px",
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        alignItems: "flex-start",
      }}
    >
      {icon && (
        <span style={{ flexShrink: 0, display: "flex", marginTop: 1 }}>
          <WarningIcon size="small" color={iconColor} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------- the handoff */

function CodeBlock({ code }: { code: string }) {
  return (
    <div
      style={{
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.gray900,
        padding: "14px 16px",
        overflow: "auto",
      }}
    >
      {/* Unhighlighted on purpose: token-colouring one snippet needs a tokenizer, and a
          hand-rolled one mis-colours the JSON default the moment it nests. */}
      <pre
        style={{
          margin: 0,
          fontFamily: tokens.fontStackMonospace,
          fontSize: tokens.fontSizeS,
          lineHeight: "19px",
          color: tokens.gray200,
          whiteSpace: "pre",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

/** Copy state reverts after 2s so the button never lies about a stale success. */
function CopyButton({ code }: { code: string }) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = (next: "copied" | "failed") => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };

  const copy = async () => {
    // The app runs in an iframe, where the clipboard permission can be denied outright.
    try {
      await navigator.clipboard.writeText(code);
      flash("copied");
    } catch {
      flash("failed");
    }
  };

  const label =
    state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy snippet";
  const background =
    state === "copied"
      ? tokens.green100
      : state === "failed"
        ? tokens.red100
        : tokens.colorWhite;
  const color =
    state === "copied"
      ? tokens.green600
      : state === "failed"
        ? tokens.red600
        : tokens.gray900;

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: tokens.spacingXs,
        height: 36,
        padding: `0 14px`,
        border: `1px solid ${tokens.gray300}`,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: background,
        fontSize: 13,
        fontWeight: tokens.fontWeightMedium,
        fontFamily: "inherit",
        color,
        cursor: "pointer",
      }}
    >
      <CopySimpleIcon size="small" color={color} />
      {label}
    </button>
  );
}

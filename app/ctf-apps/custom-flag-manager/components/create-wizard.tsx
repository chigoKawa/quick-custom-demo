"use client";

/**
 * The create-flag wizard frame (PLAN.md §1.7).
 *
 * Owns the step nav, the step-to-step rules and the footer. The steps themselves are dumb: they
 * render the draft and hand back a patch. Everything that decides *whether* the author may move
 * lives in `lib/wizard.ts`, so this file stays a frame.
 *
 * It renders as a sibling of the Workbench header rather than inside `Workbench.Content`, because
 * the step bar has to sit flush under the header and the footer has to stay put while the body
 * scrolls — neither works inside a padded, scrolling content box.
 */

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  ModalConfirm,
  Note,
  Paragraph,
  Text,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";

import type { FlagFormat } from "../lib/nt-config";
import {
  FIRST_STEP,
  LAST_STEP,
  WIZARD_STEPS,
  blockedReason,
  clearValues,
  emptyDraft,
  hasEnteredValues,
  maxReachableStep,
  submitBlockedReason,
  type FlagDraft,
  type WizardContext,
} from "../lib/wizard";
import { StepCard } from "./wizard/step-card";
import StepBasics from "./wizard/step-basics";
import StepFlagDefinition from "./wizard/step-flag-definition";
import StepReview from "./wizard/step-review";
import StepValues from "./wizard/step-values";

interface CreateWizardProps {
  context: WizardContext;
  /** Reports the current step so the header can show `step n of 5`. */
  onStepChange?: (step: number) => void;
  onCancel: () => void;
}

export default function CreateWizard({
  context,
  onStepChange,
  onCancel,
}: CreateWizardProps) {
  const [step, setStep] = useState(FIRST_STEP);
  const [draft, setDraft] = useState<FlagDraft>(emptyDraft);
  const [pendingFormat, setPendingFormat] = useState<FlagFormat | null>(null);

  const goTo = (next: number) => {
    setStep(next);
    onStepChange?.(next);
  };

  const patch = (changes: Partial<FlagDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const maxReachable = useMemo(
    () => maxReachableStep(draft, context),
    [draft, context],
  );
  const blocked = blockedReason(step, draft, context);
  const submitBlocked = submitBlockedReason(draft, context);

  /** Step 3 has to be re-entered after a format change, so ask before discarding its values. */
  const requestFormat = (format: FlagFormat) => {
    if (format === draft.format) return;
    if (hasEnteredValues(draft)) {
      setPendingFormat(format);
      return;
    }
    patch({ format });
  };

  const confirmFormat = () => {
    if (pendingFormat) {
      setDraft((current) => ({
        ...clearValues(current),
        format: pendingFormat,
      }));
    }
    setPendingFormat(null);
  };

  return (
    <Flex flexDirection="column" style={{ flex: "1 1 auto", minHeight: 0 }}>
      <WizardStepBar
        step={step}
        maxReachable={maxReachable}
        onSelect={goTo}
      />

      <Box
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          // The generous bottom padding keeps the last field clear of the sticky footer.
          padding: "24px 32px 96px",
        }}
      >
        <Box style={{ maxWidth: 1280 }}>
          <StepBody
            step={step}
            draft={draft}
            context={context}
            onChange={patch}
            onRequestFormat={requestFormat}
            onEditStep={goTo}
          />
        </Box>
      </Box>

      <Flex
        alignItems="center"
        style={{
          flex: "0 0 auto",
          gap: tokens.spacingS,
          padding: `${tokens.spacingS} 32px`,
          backgroundColor: tokens.colorWhite,
          borderTop: `1px solid ${tokens.colorElementLight}`,
        }}
      >
        <Button variant="transparent" onClick={onCancel}>
          Cancel
        </Button>
        <Flex
          alignItems="center"
          style={{ marginLeft: "auto", gap: tokens.spacingS }}
        >
          {(step === LAST_STEP ? submitBlocked : blocked) && (
            <Text fontColor="gray600" fontSize="fontSizeS">
              {step === LAST_STEP ? submitBlocked : blocked}
            </Text>
          )}
          {step > FIRST_STEP && (
            <Button variant="secondary" onClick={() => goTo(step - 1)}>
              Back
            </Button>
          )}
          {step < LAST_STEP ? (
            <Button
              variant="primary"
              isDisabled={Boolean(blocked)}
              onClick={() => goTo(step + 1)}
            >
              Continue
            </Button>
          ) : (
            // The write lands in a later phase; the frame stops here rather than pretending.
            <Button variant="primary" isDisabled>
              Create flag
            </Button>
          )}
        </Flex>
      </Flex>

      <ModalConfirm
        isShown={pendingFormat !== null}
        intent="negative"
        title="Change value format?"
        confirmLabel="Clear values and change"
        cancelLabel="Keep current format"
        onConfirm={confirmFormat}
        onCancel={() => setPendingFormat(null)}
      >
        <Paragraph marginBottom="none">
          Values already entered for the baseline and every variant will be
          cleared. This cannot be undone.
        </Paragraph>
      </ModalConfirm>
    </Flex>
  );
}

function StepBody({
  step,
  draft,
  context,
  onChange,
  onRequestFormat,
  onEditStep,
}: {
  step: number;
  draft: FlagDraft;
  context: WizardContext;
  onChange: (patch: Partial<FlagDraft>) => void;
  onRequestFormat: (format: FlagFormat) => void;
  onEditStep: (step: number) => void;
}) {
  switch (step) {
    case 1:
      return <StepBasics draft={draft} context={context} onChange={onChange} />;
    case 2:
      return (
        <StepFlagDefinition
          draft={draft}
          context={context}
          onChange={onChange}
          onRequestFormat={onRequestFormat}
        />
      );
    case 3:
      return <StepValues draft={draft} onChange={onChange} />;
    case 5:
      return (
        <StepReview
          draft={draft}
          context={context}
          onChange={onChange}
          onEditStep={onEditStep}
        />
      );
    default:
      return <StepPlaceholder step={step} />;
  }
}

/** Step 4 arrives with the delivery settings (audience, metric, distribution, traffic). */
function StepPlaceholder({ step }: { step: number }) {
  const label =
    WIZARD_STEPS.find((wizardStep) => wizardStep.n === step)?.label ??
    "This step";
  return (
    <StepCard>
      <Note variant="neutral" title={`${label} is not built yet`}>
        The wizard frame, step navigation and validation are in place. This step
        lands with the next slice of work.
      </Note>
    </StepCard>
  );
}

/**
 * The step nav, as a row of tabs.
 *
 * Forma 36's `ProgressStepper` was the first attempt and is the wrong component here: it stretches
 * to fill its container, so five steps produce long connector rules across a wide viewport, and it
 * paints every reachable step in blue — which loses the distinction the design draws between
 * *done* (green) and *current* (blue). This is the mock's tab bar instead: numbered dot, label, a
 * 2px underline under the active step, and no connectors.
 */
function WizardStepBar({
  step,
  maxReachable,
  onSelect,
}: {
  step: number;
  maxReachable: number;
  onSelect: (step: number) => void;
}) {
  return (
    <nav
      aria-label="Create custom flag"
      style={{
        flex: "0 0 auto",
        display: "flex",
        gap: 0,
        padding: "0 32px",
        backgroundColor: tokens.colorWhite,
        borderBottom: `1px solid ${tokens.colorElementLight}`,
      }}
    >
      {WIZARD_STEPS.map((wizardStep) => {
        const isActive = wizardStep.n === step;
        const isDone = wizardStep.n < step;
        // Forward steps stay locked until the draft satisfies everything before them.
        const isLocked = wizardStep.n > maxReachable;

        return (
          <button
            key={wizardStep.n}
            type="button"
            aria-current={isActive ? "step" : undefined}
            disabled={isLocked}
            onClick={() => onSelect(wizardStep.n)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: tokens.spacingXs,
              padding: "12px 18px 11px",
              border: "none",
              borderBottom: `2px solid ${isActive ? tokens.blue600 : "transparent"}`,
              background: "none",
              fontFamily: "inherit",
              fontSize: tokens.fontSizeM,
              fontWeight: tokens.fontWeightMedium,
              color: isActive ? tokens.blue600 : tokens.colorTextLight,
              cursor: isLocked ? "default" : "pointer",
              opacity: isLocked ? 0.55 : 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                flex: "0 0 auto",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: tokens.fontWeightDemiBold,
                backgroundColor: isActive
                  ? tokens.blue600
                  : isDone
                    ? tokens.green200
                    : tokens.gray200,
                color: isActive
                  ? tokens.colorWhite
                  : isDone
                    ? tokens.green600
                    : tokens.gray600,
              }}
            >
              {wizardStep.n}
            </span>
            {wizardStep.label}
          </button>
        );
      })}
    </nav>
  );
}

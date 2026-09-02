"use client";

/**
 * A segmented control: a grey track holding one white, shadowed active pill.
 *
 * Forma 36 v5 has no `SegmentedControl`. The nearest primitives — `ButtonGroup variant="merged"`
 * with `ToggleButton` — render four equal bordered buttons, which reads as four separate actions
 * rather than one choice among four. This is native markup styled with f36 tokens instead.
 *
 * `role="radiogroup"` + `role="radio"` rather than a `<fieldset>` of inputs: the pills are buttons
 * visually, and this is the pattern screen readers already meet in the Contentful web app.
 */

import tokens from "@contentful/f36-tokens";

/** `boxShadowPositive` — a 1px lift, the same one the web app uses for active segments. */
const PILL_SHADOW = tokens.boxShadowPositive;

interface SegmentedControlProps<T extends string> {
  /** Labels the group for assistive tech; the visible label lives in the `FormControl`. */
  ariaLabel: string;
  options: readonly T[];
  value: T;
  onSelect: (option: T) => void;
  isDisabled?: boolean;
  /**
   * Locks individual options, with the reason shown on hover. Used by the step-3 Builder/Code
   * toggle, where Code stays reachable while unparseable text is on screen but Builder does not.
   */
  disabledOptions?: Partial<Record<T, string>>;
  /** `small` is the 28px in-card variant from the design; the default is the 32px form one. */
  size?: "default" | "small";
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onSelect,
  isDisabled = false,
  disabledOptions,
  size = "default",
}: SegmentedControlProps<T>) {
  const small = size === "small";

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        padding: 2,
        gap: 2,
        backgroundColor: tokens.gray200,
        borderRadius: tokens.borderRadiusMedium,
      }}
    >
      {options.map((option) => {
        const isActive = option === value;
        const lockReason = disabledOptions?.[option];
        const locked = isDisabled || Boolean(lockReason);
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={locked}
            title={lockReason}
            // The caller may need to confirm before the change lands, so a re-pick of the active
            // option is swallowed here rather than in every caller.
            onClick={() => {
              if (!isActive) onSelect(option);
            }}
            style={{
              height: small ? 28 : 32,
              padding: small ? "0 12px" : "0 14px",
              border: "none",
              borderRadius: tokens.borderRadiusSmall,
              backgroundColor: isActive ? tokens.colorWhite : "transparent",
              color: isActive ? tokens.gray900 : tokens.gray600,
              fontFamily: "inherit",
              fontSize: small ? 12 : 13,
              fontWeight: tokens.fontWeightMedium,
              boxShadow: isActive ? PILL_SHADOW : "none",
              cursor: locked ? "not-allowed" : "pointer",
              opacity: locked ? 0.5 : 1,
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

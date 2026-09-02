"use client";

/**
 * Step 2 — Flag definition (PLAN.md §1.9). The flag key and its value format.
 *
 * The optional JSON Schema block belongs to the schema-guided phase and is not here yet.
 */

import {
  Box,
  Checkbox,
  Flex,
  Form,
  FormControl,
  Note,
  Text,
  TextInput,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";

import { FLAG_FORMATS, type FlagFormat } from "../../lib/nt-config";
import {
  KEY_TAKEN_WARNING,
  isKeyClaimed,
  keyError,
  keyOwnersOf,
  type FlagDraft,
  type WizardContext,
} from "../../lib/wizard";
import { SegmentedControl } from "./segmented-control";
import { CARD_STACK, StepCard } from "./step-card";

interface StepFlagDefinitionProps {
  draft: FlagDraft;
  context: WizardContext;
  onChange: (patch: Partial<FlagDraft>) => void;
  /**
   * Asks the frame for a format change. The frame owns the confirm modal, because changing format
   * clears values entered on the next step.
   */
  onRequestFormat: (format: FlagFormat) => void;
}

const FORMAT_HELP =
  "Determines the value editor in the next step and the typed default in the developer snippet.";

export default function StepFlagDefinition({
  draft,
  context,
  onChange,
  onRequestFormat,
}: StepFlagDefinitionProps) {
  const error = keyError(draft);
  const claimed = isKeyClaimed(draft, context);
  const owners = keyOwnersOf(draft, context);

  return (
    <StepCard>
      <Form style={CARD_STACK}>
        <FormControl
          isRequired
          isInvalid={Boolean(error) || claimed}
          marginBottom="none"
        >
          <FormControl.Label>Flag key</FormControl.Label>
          <TextInput
            value={draft.key}
            placeholder="checkout_layout"
            maxLength={120}
            // The key is read verbatim in code, so it is shown in code type.
            style={{ fontFamily: tokens.fontStackMonospace, fontSize: 13 }}
            // Keys are lowercase by definition, so normalise rather than scolding the author for
            // typing a capital letter.
            onChange={(event) =>
              onChange({
                key: event.target.value.trim().toLowerCase(),
                keyTouched: true,
                collisionAck: false,
              })
            }
            onBlur={() => onChange({ keyTouched: true })}
          />
          {error ? (
            <FormControl.ValidationMessage>
              {error}
            </FormControl.ValidationMessage>
          ) : claimed ? (
            <FormControl.ValidationMessage>
              {KEY_TAKEN_WARNING}
            </FormControl.ValidationMessage>
          ) : (
            <FormControl.HelpText>
              Lowercase letters, numbers, underscores and hyphens. No spaces.
            </FormControl.HelpText>
          )}
        </FormControl>

        {claimed && (
          <Note variant="warning" title="This key is already in use">
            <Flex
              flexDirection="column"
              gap="spacingXs"
              alignItems="flex-start"
            >
              <Text>
                {owners.length === 1
                  ? `${owners[0]} already defines `
                  : `${owners.length} experiences already define `}
                <Text
                  fontColor="gray900"
                  style={{ fontFamily: tokens.fontStackMonospace }}
                >
                  {draft.key}
                </Text>
                . If a visitor qualifies for more than one, the value that wins
                is the one from the entry with the alphabetically lowest ID —
                there is no priority setting.
              </Text>
              <Checkbox
                isChecked={draft.collisionAck}
                onChange={(event) =>
                  onChange({ collisionAck: event.target.checked })
                }
              >
                I understand, create it anyway
              </Checkbox>
            </Flex>
          </Note>
        )}

        <FormControl marginBottom="none">
          <FormControl.Label>Format</FormControl.Label>
          <Box>
            <SegmentedControl
              ariaLabel="Format"
              options={FLAG_FORMATS}
              value={draft.format}
              onSelect={onRequestFormat}
            />
          </Box>
          <Box marginTop="spacingXs">
            <Text fontColor="gray600" fontSize="fontSizeS">
              {FORMAT_HELP}
            </Text>
          </Box>
        </FormControl>

        <Text
          fontColor="gray600"
          fontSize="fontSizeS"
          style={{ marginTop: tokens.spacing2Xs }}
        >
          A flag has no effect until a developer reads it. Step 5 generates the
          code for that.
        </Text>
      </Form>
    </StepCard>
  );
}

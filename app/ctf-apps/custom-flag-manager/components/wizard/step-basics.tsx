"use client";

/** Step 1 — Basics (PLAN.md §1.8). Name, description, and nothing else. */

import {
  Form,
  FormControl,
  TextInput,
  Textarea,
} from "@contentful/f36-components";

import {
  nameError,
  type FlagDraft,
  type WizardContext,
} from "../../lib/wizard";
import { CARD_STACK, StepCard } from "./step-card";

interface StepBasicsProps {
  draft: FlagDraft;
  context: WizardContext;
  onChange: (patch: Partial<FlagDraft>) => void;
}

export default function StepBasics({
  draft,
  context,
  onChange,
}: StepBasicsProps) {
  const error = nameError(draft, context);

  return (
    <StepCard>
      <Form style={CARD_STACK}>
        <FormControl isRequired isInvalid={Boolean(error)} marginBottom="none">
          <FormControl.Label>Name</FormControl.Label>
          <TextInput
            value={draft.name}
            placeholder="Checkout layout test"
            maxLength={120}
            onChange={(event) =>
              onChange({ name: event.target.value, nameTouched: true })
            }
            onBlur={() => onChange({ nameTouched: true })}
          />
          {error ? (
            <FormControl.ValidationMessage>
              {error}
            </FormControl.ValidationMessage>
          ) : (
            <FormControl.HelpText>
              Shown in the Contentful entry list and in the Personalization app.
            </FormControl.HelpText>
          )}
        </FormControl>

        <FormControl marginBottom="none">
          <FormControl.Label>Description</FormControl.Label>
          <Textarea
            value={draft.description}
            rows={3}
            maxLength={500}
            placeholder="What are you testing, and what do you expect to happen?"
            onChange={(event) => onChange({ description: event.target.value })}
          />
          <FormControl.HelpText>
            Optional. Useful for explaining the hypothesis to teammates.
          </FormControl.HelpText>
        </FormControl>
      </Form>
    </StepCard>
  );
}

"use client";

/**
 * Step 3 — the values (PLAN.md §1.10).
 *
 * One card per column: the baseline plus every variant, all editing the same flag key in the same
 * format. The parity notes above the cards are the point of the step — a variant holding the
 * baseline's value is a live experiment that cannot produce a result, and the mock surfaces that
 * before the author reaches review rather than after the entry is written.
 *
 * The two formats lay out differently because they need different room: scalars sit side by side,
 * while a JSON tree needs the full width for key, type, value and row actions.
 */

import {
  Button,
  Flex,
  Form,
  Text,
} from "@contentful/f36-components";
import { InfoIcon, PlusIcon } from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import {
  addVariantColumn,
  BASELINE_ID,
  parityNotes,
  removeVariantColumn,
  renameColumn,
  setColumnValue,
  type FlagDraft,
  type ValueColumn,
} from "../../lib/wizard";
import { FormatBadge } from "../badges";
import { CARD_BODY_PADDING, ColumnCard, ColumnCardHeader } from "./column-card";
import { JsonColumnCard } from "./json-value-editor";
import ScalarValueEditor from "./scalar-value-editor";

export interface StepValuesProps {
  draft: FlagDraft;
  onChange: (patch: Partial<FlagDraft>) => void;
}

export default function StepValues({ draft, onChange }: StepValuesProps) {
  const isJson = draft.format === "JSON";
  const canRemove = draft.columns.length > 2;

  return (
    <Form>
      <Flex flexDirection="column" gap="spacingM">
        <Flex alignItems="center" gap="spacingS">
          <Text fontColor="gray600" fontSize="fontSizeS">
            Format
          </Text>
          <FormatBadge format={draft.format} />
          <Text
            fontColor="gray700"
            fontSize="fontSizeS"
            style={{ fontFamily: tokens.fontStackMonospace }}
          >
            {draft.key || "—"}
          </Text>
          <Flex flexGrow={1} />
          <Button
            size="small"
            variant="secondary"
            startIcon={<PlusIcon />}
            onClick={() => onChange(addVariantColumn(draft))}
          >
            Add variant
          </Button>
        </Flex>

        <ParityNotes draft={draft} />

        {isJson ? (
          <Flex flexDirection="column" gap="spacingM">
            {draft.columns.map((column) => (
              <JsonColumnCard
                key={column.id}
                column={column}
                draft={draft}
                canRemove={canRemove}
                onChange={onChange}
              />
            ))}
          </Flex>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: tokens.spacingM,
              alignItems: "start",
            }}
          >
            {draft.columns.map((column) => (
              <ScalarColumnCard
                key={column.id}
                column={column}
                draft={draft}
                canRemove={canRemove}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </Flex>
    </Form>
  );
}

/**
 * Amber for a variant that matches the baseline, plain grey for one that differs. Both are stated
 * rather than only the problem case: silence would read as "not checked".
 */
function ParityNotes({ draft }: { draft: FlagDraft }) {
  const notes = parityNotes(draft);
  if (notes.length === 0) return null;

  return (
    <Flex flexDirection="column" gap="spacing2Xs">
      {notes.map((note) => (
        <Flex
          key={note.id}
          alignItems="center"
          gap="spacingXs"
          style={{
            padding: `${tokens.spacingXs} ${tokens.spacingS}`,
            borderRadius: tokens.borderRadiusMedium,
            backgroundColor: note.same ? tokens.orange100 : tokens.gray100,
            border: `1px solid ${note.same ? tokens.orange200 : tokens.gray200}`,
          }}
        >
          <InfoIcon
            size="tiny"
            color={note.same ? tokens.orange600 : tokens.gray600}
            style={{ flex: "0 0 auto" }}
          />
          <Text
            fontSize="fontSizeS"
            style={{ color: note.same ? tokens.orange600 : tokens.gray600 }}
          >
            {note.same
              ? `${note.label} is identical to the baseline — this variant will produce no change.`
              : `${note.label} differs from the baseline.`}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

/** String, Number and Boolean: one input, so the card is only a frame around it. */
function ScalarColumnCard({
  column,
  draft,
  canRemove,
  onChange,
}: {
  column: ValueColumn;
  draft: FlagDraft;
  canRemove: boolean;
  onChange: (patch: Partial<FlagDraft>) => void;
}) {
  const isBaseline = column.id === BASELINE_ID;

  return (
    <ColumnCard>
      <ColumnCardHeader
        label={column.label}
        isBaseline={isBaseline}
        onRename={
          isBaseline ? undefined : (label) => onChange(renameColumn(draft, column.id, label))
        }
        /*
          The mock offers remove on every variant. Here it disappears at the last one: an
          experiment with nothing but a baseline has nothing to measure, and a wizard that lets
          you build one only to be blocked later is worse than one that does not.
        */
        onRemove={
          isBaseline || !canRemove
            ? undefined
            : () => onChange(removeVariantColumn(draft, column.id))
        }
      />
      <div style={{ padding: CARD_BODY_PADDING }}>
        <ScalarValueEditor
          column={column}
          format={draft.format}
          onChange={(value, text) => onChange(setColumnValue(draft, column.id, value, text))}
        />
      </div>
    </ColumnCard>
  );
}

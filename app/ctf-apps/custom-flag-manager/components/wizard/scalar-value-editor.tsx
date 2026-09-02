"use client";

/**
 * The value editor for the three scalar formats (PLAN.md §1.10).
 *
 * The mock stores every scalar as a string and coerces on read. That cannot be copied here,
 * because what this app writes ends up in `nt_config` under a declared `valueType` — a `"1"` in a
 * `Number` flag is a broken entry, and canonical-JSON parity would read `"1"` and `1` as
 * different values. So each format owns its own type: `Boolean` is a boolean, `String` is a
 * string, and `Number` keeps the raw text in `column.text` while `column.value` holds the parsed
 * number (see `ValueColumn.text`).
 *
 * JSON is not handled here — it gets the tree builder instead.
 */

import {
  Button,
  Flex,
  Switch,
  Text,
  TextInput,
  Textarea,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";

import type { FlagFormat } from "../../lib/nt-config";
import { numberError, type ValueColumn } from "../../lib/wizard";

/** Past this many characters a single line stops being readable (§1.10). */
const TEXTAREA_THRESHOLD = 46;

const MONO_STYLE = {
  fontFamily: tokens.fontStackMonospace,
  fontSize: tokens.fontSizeM,
} as const;

export interface ScalarValueEditorProps {
  column: ValueColumn;
  format: FlagFormat;
  /** `text` is the raw input, only meaningful for `Number`. */
  onChange: (value: unknown, text?: string) => void;
}

export default function ScalarValueEditor({
  column,
  format,
  onChange,
}: ScalarValueEditorProps) {
  if (format === "Boolean") {
    return <BooleanEditor column={column} onChange={onChange} />;
  }
  if (format === "Number") {
    return <NumberEditor column={column} onChange={onChange} />;
  }
  return <StringEditor column={column} onChange={onChange} />;
}

/**
 * An untouched boolean reads as `false` — the switch is off, so that is what the author sees, and
 * `resolvedColumnValue` writes the same thing. The literal beside it is there because "off" and
 * "false" are not obviously the same claim.
 */
function BooleanEditor({
  column,
  onChange,
}: Omit<ScalarValueEditorProps, "format">) {
  const isOn = column.value === true;

  return (
    <Flex alignItems="center" gap="spacingS">
      <Switch
        id={`value-${column.id}`}
        aria-label="Value"
        isChecked={isOn}
        onChange={() => onChange(!isOn)}
      />
      <Text fontColor="gray700" style={MONO_STYLE}>
        {isOn ? "true" : "false"}
      </Text>
    </Flex>
  );
}

/**
 * `""`, `"-"` and `"1."` are all states you pass through while typing a number and none of them
 * is one, so the input is text and the parse result is kept separately. The steppers work off the
 * parsed value, treating an unparseable box as 0 so `+` always produces something valid.
 */
function NumberEditor({
  column,
  onChange,
}: Omit<ScalarValueEditorProps, "format">) {
  const text =
    column.text ?? (typeof column.value === "number" ? String(column.value) : "");
  const error = numberError(column, "Number");

  const write = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed.length === 0 ? Number.NaN : Number(trimmed);
    onChange(Number.isFinite(parsed) ? parsed : undefined, raw);
  };

  const step = (delta: number) => {
    const next = (typeof column.value === "number" ? column.value : 0) + delta;
    onChange(next, String(next));
  };

  return (
    <Flex flexDirection="column" gap="spacing2Xs">
      <TextInput.Group spacing="none">
        <TextInput
          aria-label="Value"
          value={text}
          isInvalid={Boolean(error)}
          placeholder="0"
          onChange={(event) => write(event.target.value)}
          style={MONO_STYLE}
        />
        <Button aria-label="Decrease" onClick={() => step(-1)}>
          &ndash;
        </Button>
        <Button aria-label="Increase" onClick={() => step(1)}>
          +
        </Button>
      </TextInput.Group>
      {error && (
        <Text fontColor="red600" fontSize="fontSizeS">
          {error}
        </Text>
      )}
    </Flex>
  );
}

/**
 * Always a textarea, growing from one row to three past `TEXTAREA_THRESHOLD`. Swapping a
 * `TextInput` for a `Textarea` at that boundary would remount the element and drop focus
 * mid-word; changing `rows` on one element does not.
 */
function StringEditor({
  column,
  onChange,
}: Omit<ScalarValueEditorProps, "format">) {
  const value = typeof column.value === "string" ? column.value : "";

  return (
    <Textarea
      aria-label="Value"
      rows={value.length > TEXTAREA_THRESHOLD ? 3 : 1}
      value={value}
      placeholder="Free shipping over $50"
      onChange={(event) => onChange(event.target.value)}
      style={MONO_STYLE}
    />
  );
}

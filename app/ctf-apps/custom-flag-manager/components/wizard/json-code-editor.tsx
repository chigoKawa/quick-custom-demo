"use client";

/**
 * The Code side of the step-3 toggle: the real Contentful JSON field editor.
 *
 * `@contentful/field-editor-json` is the component the entry editor itself renders, so parse
 * validation, undo/redo, tab indentation and the invalid-JSON status line all come for free and
 * behave exactly as an author already expects them to.
 *
 * It expects `sdk.field`, which does not exist here — this column is a value inside a draft, not a
 * field on an entry. The shim below is the smallest surface `FieldConnector` actually touches.
 * Notably it never invokes the `onValueChanged` listener: `FieldConnector` bumps an
 * `externalReset` key on every remote change, which remounts the editor and discards its undo
 * stack. Reading state in through `getValue()` (which the constructor calls) and out through
 * `setValue` keeps the editor authoritative over its own text for as long as it is mounted.
 */

import React from "react";
import dynamic from "next/dynamic";
import { SkeletonBodyText, SkeletonContainer } from "@contentful/f36-components";

/** CodeMirror does not server-render, so this must not be part of the SSR pass. */
const LazyJsonEditor = dynamic(
  () => import("@contentful/field-editor-json").then((module) => module.JsonEditor),
  {
    ssr: false,
    loading: () => (
      <SkeletonContainer svgHeight={120}>
        <SkeletonBodyText numberOfLines={4} />
      </SkeletonContainer>
    ),
  },
);

type JsonFieldApi = React.ComponentProps<typeof LazyJsonEditor>["field"];

/**
 * `JSON.parse` accepts far more than a flag payload can be. The editor already rejects scalars
 * (its own `isValidJson` requires `typeof parsed === 'object'`) and treats `null` as an empty
 * field, which leaves arrays — a custom flag has to be keyed to be readable by key.
 */
export const TOP_LEVEL_ERROR = "Invalid JSON — Top level must be an object";

interface JsonCodeEditorProps {
  /** The current tree value. Read once per mount, by the editor's constructor. */
  value: unknown;
  /** A parsed JSON object, or `{}` when the author empties the field. */
  onValue: (value: Record<string, unknown>) => void;
  /** `TOP_LEVEL_ERROR` while the text parses but is the wrong shape; `null` once it is not. */
  onShapeError: (message: string | null) => void;
}

export default function JsonCodeEditor({
  value,
  onValue,
  onShapeError,
}: JsonCodeEditorProps) {
  // The shim is built once so the editor is never remounted; these keep it pointed at the
  // current props without changing its identity.
  const latest = React.useRef({ value, onValue, onShapeError });
  latest.current = { value, onValue, onShapeError };

  const field = React.useMemo(
    () =>
      createFieldShim(
        () => latest.current.value,
        (next) => {
          if (isPlainObject(next)) {
            latest.current.onShapeError(null);
            latest.current.onValue(next);
          } else {
            latest.current.onShapeError(TOP_LEVEL_ERROR);
          }
        },
        () => {
          latest.current.onShapeError(null);
          latest.current.onValue({});
        },
      ),
    [],
  );

  return <LazyJsonEditor field={field} isInitiallyDisabled={false} />;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The seven members `FieldConnector` calls, and nothing else. The subscriptions return no-op
 * unsubscribers because nothing here ever changes underneath the editor.
 */
function createFieldShim(
  read: () => unknown,
  write: (value: unknown) => void,
  clear: () => void,
): JsonFieldApi {
  const unsubscribe = () => {};

  const shim = {
    id: "customFlagValue",
    name: "Value",
    locale: "en-US",
    type: "Object",
    required: false,
    validations: [],
    getValue: read,
    setValue: async (value: unknown) => {
      write(value);
      return value;
    },
    removeValue: async () => {
      clear();
    },
    setInvalid: () => {},
    getIsDisabled: () => false,
    onValueChanged: () => unsubscribe,
    onIsDisabledChanged: () => unsubscribe,
    onSchemaErrorsChanged: () => unsubscribe,
  };

  return shim as unknown as JsonFieldApi;
}

"use client";

/**
 * The step-3 card for `JSON` flags: a visual field builder, with the real Contentful JSON editor
 * behind a Builder/Code toggle.
 *
 * The builder is the whole point of the app — the native Variants UI hands the author a raw code
 * box, so a mistyped brace or a number typed as a string only surfaces later, in frontend code.
 * Here every field has a type, values are validated as they are typed, and the payload cannot be
 * structurally invalid because it is never text.
 *
 * The tree lives on the draft (`column.nodes`), not in component state: the wizard unmounts each
 * step on navigation, and expand/collapse state, node ids and mid-typing text all have to survive
 * a trip back to step 2 to check the flag key.
 */

import React from "react";
import { Text } from "@contentful/f36-components";
import { CaretDownIcon, CaretRightIcon, CaretUpIcon, PlusIcon, XIcon } from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import {
  addChildNode,
  addRootNode,
  flattenNodes,
  isBranch,
  JSON_NODE_TYPES,
  moveNode,
  nodeErrors,
  nodesFromValue,
  removeNode,
  setNodeKey,
  setNodeType,
  setNodeValue,
  toggleCollapse,
  toggleNodeBoolean,
  valueFromNodes,
  type FlatNode,
  type JsonNode,
  type JsonNodeType,
} from "../../lib/json-tree";
import {
  BASELINE_ID,
  removeVariantColumn,
  renameColumn,
  setColumnNodes,
  setColumnView,
  type FlagDraft,
  type ValueColumn,
} from "../../lib/wizard";
import {
  CARD_BODY_PADDING,
  ColumnCard,
  ColumnCardHeader,
  ValidityPill,
} from "./column-card";
import JsonCodeEditor from "./json-code-editor";
import { SegmentedControl } from "./segmented-control";

const VIEW_OPTIONS = ["Builder", "Code"] as const;
type ViewOption = (typeof VIEW_OPTIONS)[number];

const BUILDER_LOCKED = "Fix the JSON in Code view before returning to the builder.";

/** One indent step per nesting level. No token matches; the design's 22px is a literal. */
const INDENT_STEP = 22;

const MONO_12: React.CSSProperties = {
  fontFamily: tokens.fontStackMonospace,
  fontSize: 12,
};

const FIELD_STYLE: React.CSSProperties = {
  height: 30,
  padding: `0 ${tokens.spacingXs}`,
  border: `1px solid ${tokens.gray300}`,
  borderRadius: tokens.borderRadiusSmall,
  backgroundColor: tokens.colorWhite,
  color: tokens.gray800,
  boxSizing: "border-box",
  ...MONO_12,
};

/** The 26×26 borderless row actions. */
const ROW_ACTION_STYLE: React.CSSProperties = {
  width: 26,
  height: 26,
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  color: tokens.gray500,
};

const KNOB_SHADOW = tokens.boxShadowPositive;

interface JsonColumnCardProps {
  draft: FlagDraft;
  column: ValueColumn;
  /** False once removing a variant would leave nothing to compare the baseline against. */
  canRemove: boolean;
  onChange: (draft: FlagDraft) => void;
}

export function JsonColumnCard({ draft, column, canRemove, onChange }: JsonColumnCardProps) {
  const isBaseline = column.id === BASELINE_ID;
  // Both memoised so an untouched JSON column's empty array keeps a stable identity.
  const nodes = React.useMemo(() => column.nodes ?? [], [column.nodes]);
  const errors = React.useMemo(() => nodeErrors(nodes), [nodes]);

  /**
   * Local, not on the draft: a rejected shape is a fact about text the author is still typing, and
   * it must not follow them to step 4 and back. Leaving Code view discards it with the editor.
   */
  const [codeError, setCodeError] = React.useState<string | null>(null);

  // A shape error pins the card to Code view — the tree cannot represent what is on screen.
  const view: ViewOption = codeError || column.view === "code" ? "Code" : "Builder";

  const setNodes = (next: JsonNode[]) => onChange(setColumnNodes(draft, column.id, next));

  return (
    <ColumnCard>
      <ColumnCardHeader
        label={column.label}
        isBaseline={isBaseline}
        onRename={
          isBaseline ? undefined : (label) => onChange(renameColumn(draft, column.id, label))
        }
        onRemove={
          isBaseline || !canRemove
            ? undefined
            : () => onChange(removeVariantColumn(draft, column.id))
        }
      >
        <ValidityPill
          isValid={!codeError && errors.size === 0}
          label={pillLabel(codeError, errors.size)}
        />
        <SegmentedControl<ViewOption>
          ariaLabel="JSON view"
          options={VIEW_OPTIONS}
          value={view}
          size="small"
          disabledOptions={codeError ? { Builder: BUILDER_LOCKED } : undefined}
          onSelect={(option) =>
            onChange(setColumnView(draft, column.id, option === "Code" ? "code" : "builder"))
          }
        />
      </ColumnCardHeader>

      {view === "Code" ? (
        <div style={{ padding: CARD_BODY_PADDING }}>
          <JsonCodeEditor
            value={valueFromNodes(nodes)}
            onValue={(value) => setNodes(nodesFromValue(value))}
            onShapeError={setCodeError}
          />
          {codeError && <CodeErrorBox message={codeError} />}
          <Text
            as="p"
            fontColor="gray600"
            fontSize="fontSizeS"
            style={{ marginTop: tokens.spacingXs }}
          >
            Code view uses the standard JSON field editor — parse validation and undo/redo behave
            as they do in the entry editor. Changes sync back to the builder.
          </Text>
        </div>
      ) : (
        <div style={{ padding: `${tokens.spacingXs} ${tokens.spacingXs} ${tokens.spacingS}` }}>
          {flattenNodes(nodes).map((row) => (
            <TreeRow
              key={row.node.id}
              row={row}
              error={errors.get(row.node.id)}
              nodes={nodes}
              onNodes={setNodes}
            />
          ))}
          <div style={{ padding: "6px 8px 0 30px" }}>
            <button
              type="button"
              onClick={() => setNodes(addRootNode(nodes))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 10px",
                border: `1px dashed ${tokens.gray300}`,
                borderRadius: tokens.borderRadiusSmall,
                background: "none",
                fontSize: 12,
                fontFamily: "inherit",
                color: tokens.gray700,
                cursor: "pointer",
              }}
            >
              <PlusIcon size="tiny" color={tokens.gray700} style={{ width: 13, height: 13 }} />
              Add field
            </button>
            <span style={{ fontSize: 12, color: tokens.gray500, marginLeft: 10 }}>
              Reorder with the arrow buttons.
            </span>
          </div>
        </div>
      )}
    </ColumnCard>
  );
}

/**
 * Short in the pill, long in the error box. The design put the whole parse message in the pill,
 * which pushes the Builder/Code toggle off the card on a narrow viewport.
 */
function pillLabel(codeError: string | null, errorCount: number): string {
  if (codeError) return "Invalid JSON";
  if (errorCount > 0) return `${errorCount} field${errorCount === 1 ? "" : "s"} to fix`;
  return "Valid JSON";
}

function CodeErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        marginTop: 10,
        padding: `10px ${tokens.spacingS}`,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.red100,
        border: `1px solid ${tokens.red200}`,
        fontSize: tokens.fontSizeM,
        color: tokens.red700,
      }}
    >
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ tree row */

interface TreeRowProps {
  row: FlatNode;
  error?: string;
  nodes: JsonNode[];
  onNodes: (nodes: JsonNode[]) => void;
}

function TreeRow({ row, error, nodes, onNodes }: TreeRowProps) {
  const { node, depth, index, inArray, siblings } = row;
  const branch = isBranch(node);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: tokens.borderRadiusSmall,
      }}
    >
      <span style={{ width: depth * INDENT_STEP, flexShrink: 0 }} />

      {branch ? (
        <button
          type="button"
          aria-label="Expand or collapse"
          aria-expanded={!node.collapsed}
          onClick={() => onNodes(toggleCollapse(nodes, node.id))}
          style={{
            width: 20,
            height: 24,
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            color: tokens.gray600,
            transform: `rotate(${node.collapsed ? 0 : 90}deg)`,
            transition: "transform 0.2s",
          }}
        >
          <CaretRightIcon size="tiny" color={tokens.gray600} style={{ width: 14, height: 14 }} />
        </button>
      ) : (
        <span style={{ width: 20, flex: "0 0 auto" }} />
      )}

      {inArray ? (
        // Positional, so there is no key to edit — the index is the key.
        <span style={{ width: 180, flex: "0 0 auto", ...MONO_12, color: tokens.gray500 }}>
          [{index}]
        </span>
      ) : (
        <input
          aria-label="Field key"
          spellCheck={false}
          value={node.key}
          onChange={(event) => onNodes(setNodeKey(nodes, node.id, event.target.value))}
          style={{ ...FIELD_STYLE, width: 180, flex: "0 0 auto" }}
        />
      )}

      <select
        aria-label="Field type"
        value={node.type}
        onChange={(event) =>
          onNodes(setNodeType(nodes, node.id, event.target.value as JsonNodeType))
        }
        style={{
          height: 30,
          width: 104,
          flex: "0 0 auto",
          padding: "0 6px",
          border: `1px solid ${tokens.gray300}`,
          borderRadius: tokens.borderRadiusSmall,
          backgroundColor: tokens.colorWhite,
          fontSize: 12,
          fontFamily: "inherit",
          color: tokens.gray700,
          boxSizing: "border-box",
        }}
      >
        {JSON_NODE_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <ValueControl
        node={node}
        hasError={Boolean(error)}
        onText={(text) => onNodes(setNodeValue(nodes, node.id, text))}
        onToggle={() => onNodes(toggleNodeBoolean(nodes, node.id))}
      />

      {error && <span style={{ fontSize: 12, color: tokens.red600 }}>{error}</span>}

      <div style={{ flex: 1 }} />

      {siblings > 1 && (
        <>
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onNodes(moveNode(nodes, node.id, -1))}
            style={{ ...ROW_ACTION_STYLE, opacity: index === 0 ? 0.35 : 1 }}
          >
            <CaretUpIcon size="tiny" color={tokens.gray500} style={{ width: 14, height: 14 }} />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === siblings - 1}
            onClick={() => onNodes(moveNode(nodes, node.id, 1))}
            style={{ ...ROW_ACTION_STYLE, opacity: index === siblings - 1 ? 0.35 : 1 }}
          >
            <CaretDownIcon size="tiny" color={tokens.gray500} style={{ width: 14, height: 14 }} />
          </button>
        </>
      )}

      <button
        type="button"
        aria-label="Remove field"
        onClick={() => onNodes(removeNode(nodes, node.id))}
        style={ROW_ACTION_STYLE}
      >
        <XIcon size="tiny" color={tokens.gray500} style={{ width: 14, height: 14 }} />
      </button>

      {branch && !node.collapsed && (
        <button
          type="button"
          onClick={() => onNodes(addChildNode(nodes, node.id))}
          style={{
            height: 26,
            flex: "0 0 auto",
            padding: `0 ${tokens.spacingXs}`,
            border: `1px solid ${tokens.gray300}`,
            borderRadius: tokens.borderRadiusSmall,
            backgroundColor: tokens.colorWhite,
            fontSize: 12,
            fontFamily: "inherit",
            color: tokens.gray700,
            cursor: "pointer",
          }}
        >
          {node.type === "Array" ? "Add item" : "Add field"}
        </button>
      )}
    </div>
  );
}

interface ValueControlProps {
  node: JsonNode;
  hasError: boolean;
  onText: (text: string) => void;
  onToggle: () => void;
}

/** The right-hand control, which is what the node's type actually means. */
function ValueControl({ node, hasError, onText, onToggle }: ValueControlProps) {
  if (isBranch(node)) {
    return (
      <span style={{ flex: 1, maxWidth: 320, fontSize: 12, color: tokens.gray500 }}>
        {node.collapsed
          ? `${node.children.length} item${node.children.length === 1 ? "" : "s"}`
          : node.type}
      </span>
    );
  }

  if (node.type === "Null") {
    return (
      <span style={{ flex: 1, maxWidth: 320, ...MONO_12, color: tokens.gray500 }}>null</span>
    );
  }

  if (node.type === "Boolean") {
    const checked = node.value === true;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Value"
        onClick={onToggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: tokens.spacingXs,
          height: 30,
          padding: "0 8px 0 4px",
          border: "none",
          background: "none",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-block",
            width: 34,
            height: 20,
            flex: "0 0 auto",
            borderRadius: 10,
            backgroundColor: checked ? tokens.blue500 : tokens.gray400,
            transition: "background 0.2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: checked ? 16 : 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: tokens.colorWhite,
              boxShadow: KNOB_SHADOW,
              transition: "left 0.2s",
            }}
          />
        </span>
        <span style={{ ...MONO_12, color: tokens.gray700 }}>{checked ? "true" : "false"}</span>
      </button>
    );
  }

  return (
    <input
      aria-label="Value"
      spellCheck={false}
      value={typeof node.value === "string" ? node.value : ""}
      onChange={(event) => onText(event.target.value)}
      style={{
        ...FIELD_STYLE,
        flex: 1,
        maxWidth: 320,
        borderColor: hasError ? tokens.red500 : tokens.gray300,
      }}
    />
  );
}

/**
 * The JSON builder's node tree (PLAN.md §1.10).
 *
 * Pure module: no React, no SDK. A `JsonNode[]` is an editable projection of a JSON object —
 * ordered, addressable by id, and safe to hold in component state across re-renders. The
 * authored value is always *derived* from the tree (`valueFromNodes`), never stored twice, so
 * the write path in `nt-config.ts` keeps reading `column.value` and never learns the builder
 * exists.
 *
 * Leaf values are held as text rather than as parsed JSON. `"1."`, `"-"` and `""` are all
 * states a `Number` field passes through while being typed, and a tree that reparsed on every
 * keystroke would fight the author's cursor. Coercion happens once, in `nodeValue`.
 */

export type JsonNodeType = "String" | "Number" | "Boolean" | "Object" | "Array" | "Null";

/** Order matters: this drives the type `select` in the row. */
export const JSON_NODE_TYPES: readonly JsonNodeType[] = [
  "String",
  "Number",
  "Boolean",
  "Object",
  "Array",
  "Null",
];

export interface JsonNode {
  /** Stable within a session; the row's React key and the address every mutation takes. */
  id: string;
  /** Ignored when the parent is an `Array` — the index is the key there. */
  key: string;
  type: JsonNodeType;
  /** Leaf only. Text for `String`/`Number`, boolean for `Boolean`, unused otherwise. */
  value: string | boolean;
  /** `Object`/`Array` only. */
  children: JsonNode[];
  collapsed: boolean;
}

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `n${sequence}`;
}

export function typeOfJson(value: unknown): JsonNodeType {
  if (value === null) return "Null";
  if (Array.isArray(value)) return "Array";
  if (typeof value === "object") return "Object";
  if (typeof value === "number") return "Number";
  if (typeof value === "boolean") return "Boolean";
  return "String";
}

function defaultValueFor(type: JsonNodeType): string | boolean {
  if (type === "Boolean") return false;
  if (type === "Number") return "0";
  return "";
}

export function makeNode(key: string, value: unknown): JsonNode {
  const type = typeOfJson(value);
  const node: JsonNode = {
    id: nextId(),
    key,
    type,
    value: "",
    children: [],
    collapsed: false,
  };

  if (type === "Object") {
    const record = value as Record<string, unknown>;
    node.children = Object.keys(record).map((k) => makeNode(k, record[k]));
  } else if (type === "Array") {
    node.children = (value as unknown[]).map((item, index) => makeNode(String(index), item));
  } else if (type === "Boolean") {
    node.value = value === true;
  } else if (type !== "Null") {
    node.value = String(value);
  }

  return node;
}

/**
 * Anything that is not a plain object yields no rows. The Code view rejects a non-object top
 * level before it ever reaches here, but `resolvedColumnValue` calls this on an untouched
 * column too, and an empty tree is the right answer for that.
 */
export function nodesFromValue(value: unknown): JsonNode[] {
  if (typeOfJson(value) !== "Object") return [];
  const record = value as Record<string, unknown>;
  return Object.keys(record).map((key) => makeNode(key, record[key]));
}

export function nodeValue(node: JsonNode): unknown {
  switch (node.type) {
    case "Object":
      return valueFromNodes(node.children);
    case "Array":
      return valueFromNodes(node.children, true);
    case "Null":
      return null;
    case "Boolean":
      return node.value === true || node.value === "true";
    case "Number": {
      const parsed = Number(String(node.value).trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    default:
      return String(node.value);
  }
}

export function valueFromNodes(nodes: JsonNode[], asArray = false): unknown {
  if (asArray) return nodes.map((node) => nodeValue(node));

  const object: Record<string, unknown> = {};
  for (const node of nodes) {
    object[node.key] = nodeValue(node);
  }
  return object;
}

export interface FlatNode {
  node: JsonNode;
  depth: number;
  index: number;
  /** The parent is an `Array`, so the key is positional and not editable. */
  inArray: boolean;
  siblings: number;
}

/** Depth-first, skipping the children of collapsed branches — the render order of the tree. */
export function flattenNodes(nodes: JsonNode[]): FlatNode[] {
  const rows: FlatNode[] = [];
  walkFlat(nodes, 0, false, rows);
  return rows;
}

function walkFlat(nodes: JsonNode[], depth: number, inArray: boolean, rows: FlatNode[]): void {
  nodes.forEach((node, index) => {
    rows.push({ node, depth, index, inArray, siblings: nodes.length });
    if (isBranch(node) && !node.collapsed) {
      walkFlat(node.children, depth + 1, node.type === "Array", rows);
    }
  });
}

export function isBranch(node: JsonNode): boolean {
  return node.type === "Object" || node.type === "Array";
}

/* ------------------------------------------------------------------ mutations */

interface Handle {
  node: JsonNode;
  /** The array the node lives in, so remove and reorder can splice. */
  list: JsonNode[];
  index: number;
}

function cloneNodes(nodes: JsonNode[]): JsonNode[] {
  return nodes.map((node) => ({ ...node, children: cloneNodes(node.children) }));
}

function findHandle(nodes: JsonNode[], id: string): Handle | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === id) return { node, list: nodes, index };
    const inChildren = findHandle(node.children, id);
    if (inChildren) return inChildren;
  }
  return null;
}

/**
 * Clone the whole tree, then mutate the clone in place. Cloning first keeps every operation a
 * pure function of the old tree — React sees a new array and re-renders — while letting the
 * operations themselves read like the imperative list edits they are.
 */
function edit(nodes: JsonNode[], id: string, mutate: (handle: Handle) => void): JsonNode[] {
  const next = cloneNodes(nodes);
  const handle = findHandle(next, id);
  if (!handle) return nodes;
  mutate(handle);
  return next;
}

export function toggleCollapse(nodes: JsonNode[], id: string): JsonNode[] {
  return edit(nodes, id, ({ node }) => {
    node.collapsed = !node.collapsed;
  });
}

export function setNodeKey(nodes: JsonNode[], id: string, key: string): JsonNode[] {
  return edit(nodes, id, ({ node }) => {
    node.key = key;
  });
}

/**
 * Switching a branch to a leaf drops its children, as the mock does. The Code view's undo is
 * the recovery path; a confirm dialog on every type change would be worse than the mistake.
 */
export function setNodeType(nodes: JsonNode[], id: string, type: JsonNodeType): JsonNode[] {
  return edit(nodes, id, ({ node }) => {
    if (node.type === type) return;
    node.type = type;
    node.children = [];
    node.collapsed = false;
    node.value = defaultValueFor(type);
  });
}

export function setNodeValue(nodes: JsonNode[], id: string, value: string): JsonNode[] {
  return edit(nodes, id, ({ node }) => {
    node.value = value;
  });
}

export function toggleNodeBoolean(nodes: JsonNode[], id: string): JsonNode[] {
  return edit(nodes, id, ({ node }) => {
    node.value = !(node.value === true || node.value === "true");
  });
}

export function removeNode(nodes: JsonNode[], id: string): JsonNode[] {
  return edit(nodes, id, ({ list, index }) => {
    list.splice(index, 1);
  });
}

export function moveNode(nodes: JsonNode[], id: string, delta: -1 | 1): JsonNode[] {
  return edit(nodes, id, ({ list, index }) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
  });
}

/**
 * Adds into a branch and expands it, so the new row is visible. Array children get their index
 * as a key: it is never read back (`valueFromNodes` ignores keys in array context) but it keeps
 * a freshly added row labelled consistently with its siblings.
 */
export function addChildNode(nodes: JsonNode[], parentId: string): JsonNode[] {
  return edit(nodes, parentId, ({ node }) => {
    if (!isBranch(node)) return;
    const key = node.type === "Array" ? String(node.children.length) : nextFieldKey(node.children);
    node.children.push(makeNode(key, ""));
    node.collapsed = false;
  });
}

export function addRootNode(nodes: JsonNode[]): JsonNode[] {
  return [...cloneNodes(nodes), makeNode(nextFieldKey(nodes), "")];
}

/**
 * `new_field`, then `new_field_2`, … Reusing the same placeholder would raise a duplicate-key
 * error on the second add, which reads as the app being broken rather than as a prompt to name
 * the field.
 */
function nextFieldKey(siblings: JsonNode[]): string {
  const taken = new Set(siblings.map((node) => node.key));
  if (!taken.has("new_field")) return "new_field";
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `new_field_${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `new_field_${Date.now()}`;
}

/* ------------------------------------------------------------------ validation */

export const NOT_A_NUMBER_ERROR = "Not a number";
export const KEY_REQUIRED_ERROR = "Key is required";
export const DUPLICATE_KEY_ERROR = "Duplicate key";

/**
 * Node id → the one error worth showing on that row.
 *
 * The two key rules go beyond the mock, which validated numbers only. They earn their place
 * because this app writes: an empty key produces `{"": …}` and a duplicate key silently drops
 * the earlier field, both of which a frontend reading the flag would experience as data loss
 * with no authoring-time signal.
 */
export function nodeErrors(nodes: JsonNode[]): Map<string, string> {
  const errors = new Map<string, string>();
  walkErrors(nodes, false, errors);
  return errors;
}

function walkErrors(list: JsonNode[], inArray: boolean, errors: Map<string, string>): void {
  const seen = new Set<string>();

  for (const node of list) {
    if (!inArray) {
      const key = node.key.trim();
      if (key.length === 0) {
        errors.set(node.id, KEY_REQUIRED_ERROR);
      } else if (seen.has(key)) {
        errors.set(node.id, DUPLICATE_KEY_ERROR);
      }
      seen.add(key);
    }

    if (node.type === "Number" && !isNumericText(node.value) && !errors.has(node.id)) {
      errors.set(node.id, NOT_A_NUMBER_ERROR);
    }

    if (node.type === "Object") walkErrors(node.children, false, errors);
    else if (node.type === "Array") walkErrors(node.children, true, errors);
  }
}

export function isNumericText(value: string | boolean): boolean {
  const text = String(value).trim();
  if (text.length === 0) return false;
  return Number.isFinite(Number(text));
}

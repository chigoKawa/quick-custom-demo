/**
 * Visitor roles for demo personalization.
 * Add new roles here as needed.
 */
export const VISITOR_ROLES = [
  { label: "Project Manager", value: "project_manager" },
  { label: "Carpenter", value: "carpenter" },
] as const;

export const ITEM_IN_FOCUS = "Single-family house (Åsane)"

export type VisitorRole = (typeof VISITOR_ROLES)[number]["value"];

import { ReactNode } from "react";

/**
 * A demo panel action definition.
 * Each action has a unique id, label, and renders its own UI.
 */
export interface DemoPanelAction {
  /** Unique identifier for this action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Render function for the action's UI */
  render: () => ReactNode;
}

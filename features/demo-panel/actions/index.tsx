"use client";

import { DemoPanelAction } from "../types";
import { VisitorRoleAction } from "./visitor-role-action";

/**
 * Registry of demo panel actions.
 * Add new actions here to make them appear in the demo panel.
 *
 * Example of adding a new action:
 * {
 *   id: "reset-profile",
 *   label: "Reset Profile",
 *   render: () => <ResetProfileAction />,
 * },
 */
export const demoPanelActions: DemoPanelAction[] = [
  {
    id: "visitor-role",
    label: "Visitor Role",
    render: () => <VisitorRoleAction />,
  },
  // EXAMPLE: Add more actions below
  // {
  //   id: "example-action",
  //   label: "Example Action",
  //   render: () => <ExampleAction />,
  // },
];

"use client";

import { DemoPanelAction } from "../types";

/**
 * Registry of demo panel actions.
 * Add new actions here to make them appear in the demo panel below the
 * market switcher.
 *
 * Example of adding a new action:
 * {
 *   id: "reset-profile",
 *   label: "Reset Profile",
 *   render: () => <ResetProfileAction />,
 * },
 */
export const demoPanelActions: DemoPanelAction[] = [];

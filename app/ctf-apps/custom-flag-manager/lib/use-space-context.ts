"use client";

import { useEffect, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { PageAppSDK } from "@contentful/app-sdk";

export interface SpaceContext {
  /** Space id — always known, straight from the installation. */
  spaceId: string;
  /** Environment id — always known, straight from the installation. */
  environment: string;
  /** Space display name, once the CMA answers. Falls back to the id. */
  spaceName: string;
  /**
   * False when the user's role cannot create *or* update entries. One boolean, because
   * every write this app performs needs both: creating a flag creates an entry, and every
   * registry action edits one (PLAN.md §3.5).
   */
  canWrite: boolean;
}

/**
 * Everything the header needs. Space and environment come from `sdk.ids`, never from env
 * vars or a literal (PLAN.md §6.12) — inside an app the SDK already knows.
 */
export function useSpaceContext(): SpaceContext {
  const sdk = useSDK<PageAppSDK>();
  const { space: spaceId, environment } = sdk.ids;

  const [spaceName, setSpaceName] = useState(spaceId);
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    let live = true;

    sdk.cma.space
      .get({ spaceId })
      .then((space) => {
        if (live && space?.name) setSpaceName(space.name);
      })
      .catch(() => {
        // Non-fatal: the id is a perfectly good label.
      });

    Promise.all([sdk.access.can("create", "Entry"), sdk.access.can("update", "Entry")])
      .then(([canCreate, canUpdate]) => {
        if (live) setCanWrite(canCreate && canUpdate);
      })
      .catch(() => {
        // If the check itself fails we do not know, so stay optimistic: a wrong `Read only`
        // badge is more confusing than a write that fails with a real error message.
      });

    return () => {
      live = false;
    };
  }, [sdk, spaceId]);

  return { spaceId, environment, spaceName, canWrite };
}

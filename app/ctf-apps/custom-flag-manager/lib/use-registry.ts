"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { PageAppSDK } from "@contentful/app-sdk";

import { clearAudienceCache, loadRegistry } from "./registry";
import type { RegistrySnapshot } from "./types";

export type RegistryStatus = "loading" | "ready" | "error";

export interface RegistryState {
  status: RegistryStatus;
  snapshot: RegistrySnapshot | null;
  error: Error | null;
  /** Re-reads experiences from the CMA. Audiences are re-read too. */
  reload: () => void;
}

/**
 * Loads the flag registry from the CMA.
 *
 * The experience list is never cached: a stale list produces false collision warnings,
 * which is worse than a slower page (PLAN.md §3.2).
 */
export function useRegistry(): RegistryState {
  const sdk = useSDK<PageAppSDK>();
  const [status, setStatus] = useState<RegistryStatus>("loading");
  const [snapshot, setSnapshot] = useState<RegistrySnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  // Guards against a resolved fetch from a previous run overwriting a newer one.
  const runRef = useRef(0);

  useEffect(() => {
    const run = ++runRef.current;
    setStatus("loading");
    setError(null);

    loadRegistry(sdk.cma, sdk.locales.default)
      .then((next) => {
        if (runRef.current !== run) return;
        setSnapshot(next);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (runRef.current !== run) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      });
  }, [sdk, nonce]);

  const reload = useCallback(() => {
    clearAudienceCache();
    setNonce((n) => n + 1);
  }, []);

  return { status, snapshot, error, reload };
}

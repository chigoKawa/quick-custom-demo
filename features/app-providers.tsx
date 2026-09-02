"use client";
import { ReactNode, useEffect, useState, Suspense, useCallback, useMemo, useRef } from "react";
import {
  NinetailedProvider,
  useNinetailed,
} from "@ninetailed/experience.js-react";
import { usePathname, useSearchParams } from "next/navigation";
import { NinetailedInsightsPlugin } from "@ninetailed/experience.js-plugin-insights";
import { NinetailedPreviewPlugin } from "@ninetailed/experience.js-plugin-preview";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import {
  loadPreviewData,
  type PreviewData,
} from "@/features/personalization/preview-loader";
import { isPreviewEnabled } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Skip the inner ContentfulLivePreviewProvider — useful when a child route
   *  mounts its own (e.g. the mock app uses a locale-aware variant). */
  skipLivePreviewWrapper?: boolean;
};

// Ninetailed localStorage key for profile data
const NT_STORAGE_KEY = "ninetailed_profile";

/**
 * Wipe Ninetailed profile data from browser storage so the SDK
 * creates a fresh anonymous profile on next mount.
 *
 * @param force  When true, clears even if the profile looks identified.
 *               Use sparingly — this loses the user's identity link.
 */
function clearNinetailedStorage(force = false) {
  if (typeof window === "undefined") return;
  try {
    if (!force) {
      const stored = localStorage.getItem(NT_STORAGE_KEY);
      if (stored) {
        const profile = JSON.parse(stored);
        // Identified = has traits or a non-anonymous ID (anonymous IDs are 64-char hex SHA-256)
        const isIdentified =
          (profile?.traits && Object.keys(profile.traits).length > 0) ||
          (profile?.id && !/^[a-f0-9]{64}$/.test(profile.id));
        if (isIdentified) {
          console.info("[Ninetailed] Skipping storage clear — profile is identified.");
          return;
        }
      }
    }
    // Remove all ninetailed / nt_ keys from both storages
    [localStorage, sessionStorage].forEach((storage) => {
      Object.keys(storage).forEach((key) => {
        if (key.startsWith("ninetailed") || key.startsWith("nt_")) {
          storage.removeItem(key);
        }
      });
    });
    console.info("[Ninetailed] Cleared profile storage.");
  } catch {
    // storage may be unavailable
  }
}

/**
 * Uses the SDK's reset() to properly clear the profile when a 404 or
 * similar fatal error is detected. Unlike raw localStorage deletion,
 * reset() lets the SDK tear down cleanly and re-initialize.
 */
function ProfileErrorRecovery({ onReset }: { onReset: () => void }) {
  const { reset } = useNinetailed();
  const hasReset = useRef(false);

  // Expose a one-shot reset that the parent can trigger via onError
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Stash reset function on window so the onError callback can reach it
    (window as any).__nt_reset = async () => {
      if (hasReset.current) return;
      hasReset.current = true;
      console.warn("[Ninetailed] Resetting profile via SDK reset()…");
      try {
        await reset();
      } catch {
        // If reset() itself fails, fall back to manual storage wipe
        clearNinetailedStorage(true);
      }
      // Trigger provider remount so a fresh profile is created
      setTimeout(onReset, 150);
    };
    return () => {
      delete (window as any).__nt_reset;
    };
  }, [reset, onReset]);

  return null;
}

function PageEventOnMount() {
  const { page, debug } = useNinetailed();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Enable debug mode in development
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    try {
      debug?.(true);
    } catch {
      // ignore
    }
  }, [debug]);

  // Fire page event once per route change.
  // The SDK is already initialised by the time this component mounts
  // inside <NinetailedProvider>, so a single call per navigation is enough.
  useEffect(() => {
    if (!page) return;
    try {
      page();
    } catch (err) {
      console.warn("[Ninetailed] page() failed:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pathname, searchParams?.toString()]);

  return null;
}

export default function AppProviders({ children, skipLivePreviewWrapper = false }: Props) {
  const [experiences, setExperiences] = useState<unknown[]>([]);
  const [audiences, setAudiences] = useState<unknown[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true); // Start true to block until we know preview status
  const [previewDataLoading, setPreviewDataLoading] = useState(false);
  const [previewDataFailed, setPreviewDataFailed] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [providerKey, setProviderKey] = useState(0);
  const searchParams = useSearchParams();

  const insightsPluginRef = useRef<unknown | null>(null);
  if (!insightsPluginRef.current) {
    insightsPluginRef.current = new NinetailedInsightsPlugin();
  }

  const [previewPlugin, setPreviewPlugin] = useState<NinetailedPreviewPlugin | null>(null);
  const pathname = usePathname();

  // Sync locale from pathname — first segment if it looks like a locale, else default.
  // Page-level LivePreviewProviderWrappers override this for page content;
  // this outer one exists so header/footer have a provider context.
  const outerLocale = useMemo(() => {
    const seg = (pathname || "").split("/").filter(Boolean)[0] || "";
    return /^[a-z]{2}(-[A-Z]{2,3})?$/.test(seg) ? seg : "en-US";
  }, [pathname]);

  // Proactively clear stale profile if clientId/env changed across sessions
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const clientId = process.env.NEXT_PUBLIC_NINETAILED_CLIENT_ID as string | undefined;
      const environment = process.env.NEXT_PUBLIC_NINETAILED_ENVIRONMENT as string | undefined;
      const lastClient = localStorage.getItem("ninetailed_last_client") || null;
      const lastEnv = localStorage.getItem("ninetailed_last_env") || null;

      const envChanged =
        (lastClient && clientId && lastClient !== clientId) ||
        (lastEnv && environment && lastEnv !== environment);

      if (envChanged) {
        console.info("[Ninetailed] Environment changed — force-clearing profile.");
        clearNinetailedStorage(true);
        setProviderKey((k) => k + 1);
      }

      if (clientId) localStorage.setItem("ninetailed_last_client", clientId);
      if (environment) localStorage.setItem("ninetailed_last_env", environment);
    } catch {
      // ignore storage issues
    }
  }, []);

  // SDK-level error handler: passed to <NinetailedProvider onError>.
  // When the Experience API returns a 404 (stale profile), we call
  // reset() via the ProfileErrorRecovery child to get a fresh profile.
  const handleNinetailedError = useCallback(
    (error: string | Error, ...args: unknown[]) => {
      const msg = [String(error), ...args.map(String)].join(" ");
      console.warn("[Ninetailed] SDK error:", msg);

      const is404 =
        msg.includes("404") || msg.includes("[404]") || msg.includes("not retryable");
      const isProfileIssue =
        msg.includes("Update Profile") ||
        msg.includes("Profile request failed") ||
        msg.includes("request failed");

      if (is404 && isProfileIssue) {
        // Try SDK reset() first (set up by ProfileErrorRecovery)
        const sdkReset = (window as any).__nt_reset;
        if (typeof sdkReset === "function") {
          sdkReset();
        } else {
          // Fallback: manual wipe + remount
          clearNinetailedStorage();
          setTimeout(() => setProviderKey((k) => k + 1), 150);
        }
      }
    },
    []
  );

  // Stable callback for ProfileErrorRecovery
  const handleProfileReset = useCallback(() => {
    setProviderKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Consider preview enabled if:
    // - we have an explicit ?preview=... query param, or
    // - Next.js draft mode cookie is enabled (server-confirmed via API)
    const urlPreviewEnabled = isPreviewEnabled(
      searchParams ? Object.fromEntries(searchParams.entries()) : null
    );

    setPreviewLoading(true);

    const checkDraftMode = async (): Promise<boolean> => {
      try {
        const res = await fetch("/api/preview/status", { cache: "no-store" });
        if (!res.ok) return false;
        const data = (await res.json()) as { enabled?: unknown };
        return Boolean(data?.enabled);
      } catch {
        return false;
      }
    };

    checkDraftMode()
      .then((draftEnabled) => {
        if (!mounted) return;
        const enabled = Boolean(urlPreviewEnabled || draftEnabled);
        setPreviewEnabled(enabled);
        setPreviewLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setPreviewEnabled(Boolean(urlPreviewEnabled));
        setPreviewLoading(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  useEffect(() => {
    if (!previewEnabled) {
      setPreviewDataLoading(false);
      setPreviewDataFailed(false);
      setPreviewPlugin(null);
      return;
    }
    let mounted = true;
    setPreviewDataLoading(true);
    setPreviewDataFailed(false);

    loadPreviewData()
      .then((data: PreviewData) => {
        if (!mounted) return;
        const nextExperiences = data.experiences || [];
        const nextAudiences = data.audiences || [];
        setExperiences(nextExperiences);
        setAudiences(nextAudiences);

        // The preview plugin attaches globally and can only be attached once.
        // Create it exactly once after we have the data.
        setPreviewPlugin((existing: NinetailedPreviewPlugin | null) => {
          if (existing) return existing;
          console.info("[Ninetailed] Initializing preview plugin.", {
            experiences: nextExperiences.length,
            audiences: nextAudiences.length,
          });
          return new NinetailedPreviewPlugin({
            experiences: nextExperiences as never,
            audiences: nextAudiences as never,
          });
        });
        setPreviewDataLoading(false);
      })
      .catch((err) => {
        console.warn("[Ninetailed] Failed to load preview data. Rendering without preview plugin.", err);
        if (mounted) {
          setPreviewDataLoading(false);
          setPreviewDataFailed(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [previewEnabled]);

  const plugins: unknown[] = useMemo(() => {
    const list: unknown[] = [insightsPluginRef.current].filter(Boolean) as unknown[];
    if (previewEnabled && previewPlugin) list.push(previewPlugin);
    return list;
  }, [previewEnabled, previewPlugin]);

  // Block initial render until:
  // 1. We know the preview status (previewLoading)
  // 2. If preview is enabled, wait for preview data to finish loading (but NOT for plugin
  //    to exist — if data loading failed, render without the plugin instead of deadlocking)
  if (previewLoading || (previewEnabled && previewDataLoading)) {
    return null;
  }

  if (previewEnabled && previewDataFailed) {
    console.warn("[Ninetailed] Rendering without preview plugin due to failed data loading.");
  }

  // Keep provider key stable (except when forcing a reset).
  // Remounting can re-attach the preview plugin and trigger "already attached".
  const combinedKey = `nt-${providerKey}`;

  return (
    <NinetailedProvider
      key={combinedKey}
      clientId={process.env.NEXT_PUBLIC_NINETAILED_CLIENT_ID as string}
      environment={process.env.NEXT_PUBLIC_NINETAILED_ENVIRONMENT}
      plugins={plugins as any[]}
      componentViewTrackingThreshold={2000}
      useSDKEvaluation={true}
      onError={handleNinetailedError}
      onLog={(...args: unknown[]) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[Ninetailed]", ...args);
        }
      }}
    >
      {skipLivePreviewWrapper ? (
        <>
          <Suspense fallback={null}>
            <ProfileErrorRecovery onReset={handleProfileReset} />
            <PageEventOnMount />
          </Suspense>
          {children}
        </>
      ) : (
        <LivePreviewProviderWrapper locale={outerLocale} isPreviewEnabled={previewEnabled}>
          <Suspense fallback={null}>
            <ProfileErrorRecovery onReset={handleProfileReset} />
            <PageEventOnMount />
          </Suspense>
          {children}
        </LivePreviewProviderWrapper>
      )}
    </NinetailedProvider>
  );
}

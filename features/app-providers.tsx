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
import { getI18nConfig } from "@/i18n-config";
import {
  loadPreviewData,
  type PreviewData,
} from "@/features/personalization/preview-loader";
import { isPreviewEnabled } from "@/lib/utils";

type Props = { children: ReactNode };

// Ninetailed localStorage key for profile data
const NT_STORAGE_KEY = "ninetailed_profile";

/**
 * Clear stale Ninetailed profile from localStorage.
 * This helps recover from 404 errors when the profile was deleted/aliased on Ninetailed's side.
 */
function clearStaleNinetailedProfile() {
  if (typeof window === "undefined") return;
  try {
    // Clear the main profile key
    localStorage.removeItem(NT_STORAGE_KEY);
    // Also clear any other ninetailed-related keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("ninetailed")) {
        localStorage.removeItem(key);
      }
    });
    console.info("[Ninetailed] Cleared stale profile data from localStorage");
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

function PageEventOnMount() {
  const { page, debug, identify } = useNinetailed();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasFiredInitial, setHasFiredInitial] = useState(false);

  // Enable debug mode in development
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    try {
      debug?.(true);
    } catch {
      // ignore
    }
  }, [debug]);

  // Fire page event immediately on mount and on route changes
  useEffect(() => {
    if (!page) return;

    // Fire page event immediately - this is critical to avoid the 5000ms timeout
    const firePageEvent = () => {
      try {
        page();
        if (!hasFiredInitial) {
          setHasFiredInitial(true);
        }
      } catch (err) {
        console.warn("[Ninetailed] Failed to fire page event:", err);
      }
    };

    // Fire immediately
    firePageEvent();

    // Also fire after a short delay to ensure SDK is fully initialized
    if (!hasFiredInitial) {
      const timer = setTimeout(firePageEvent, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pathname, searchParams?.toString()]);

  return null;
}

export default function AppProviders({ children }: Props) {
  const [experiences, setExperiences] = useState<unknown[]>([]);
  const [audiences, setAudiences] = useState<unknown[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true); // Start true to block until we know preview status
  const [previewDataLoading, setPreviewDataLoading] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [providerKey, setProviderKey] = useState(0);
  const searchParams = useSearchParams();

  const insightsPluginRef = useRef<unknown | null>(null);
  if (!insightsPluginRef.current) {
    insightsPluginRef.current = new NinetailedInsightsPlugin();
  }

  const [previewPlugin, setPreviewPlugin] = useState<NinetailedPreviewPlugin | null>(null);
  const [effectiveLocale, setEffectiveLocale] = useState<string>("en-US");
  const pathname = usePathname();

  // Proactively clear stale profile if clientId/env changed across sessions
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const clientId = process.env.NEXT_PUBLIC_NINETAILED_CLIENT_ID as string | undefined;
      const environment = process.env.NEXT_PUBLIC_NINETAILED_ENVIRONMENT as string | undefined;
      const lastClient = localStorage.getItem("ninetailed_last_client") || null;
      const lastEnv = localStorage.getItem("ninetailed_last_env") || null;

      const changed = (lastClient && clientId && lastClient !== clientId) || (lastEnv && environment && lastEnv !== environment);
      if (changed) {
        clearStaleNinetailedProfile();
        setProviderKey((k) => k + 1);
      }

      if (clientId) localStorage.setItem("ninetailed_last_client", clientId);
      if (environment) localStorage.setItem("ninetailed_last_env", environment);
    } catch {
      // ignore storage issues
    }
  }, []);

  // Derive effective locale from pathname with i18n config fallback
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const cfg = await getI18nConfig();
        const seg = (pathname || "").split("/").filter(Boolean)[0] || "";
        const next = cfg.locales.includes(seg as any) ? seg : cfg.defaultLocale;
        if (mounted) setEffectiveLocale(next);
      } catch {
        if (mounted) setEffectiveLocale("en-US");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  // Listen for Ninetailed 404 errors and clear stale profile
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Track if we've already cleared to avoid loops
    let hasCleared = false;

    const handleError = (event: ErrorEvent) => {
      if (hasCleared) return;
      const msg = event.message || "";
      // Detect Ninetailed profile 404 errors
      if (
        (msg.includes("Update Profile request failed") || msg.includes("Update Profile")) &&
        (msg.includes("404") || msg.includes("[404]"))
      ) {
        console.warn(
          "[Ninetailed] Detected stale profile (404). Clearing localStorage and reinitializing..."
        );
        hasCleared = true;
        clearStaleNinetailedProfile();
        // Force provider remount to create fresh profile
        setProviderKey((k) => k + 1);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (hasCleared) return;
      const reason = String(event.reason || "");
      if (
        (reason.includes("404") || reason.includes("[404]")) &&
        (reason.includes("Profile") || reason.includes("Update Profile"))
      ) {
        console.warn(
          "[Ninetailed] Detected stale profile (404 rejection). Clearing localStorage..."
        );
        hasCleared = true;
        clearStaleNinetailedProfile();
        setProviderKey((k) => k + 1);
      }
    };

    // Also intercept console.error to catch SDK errors that don't throw
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, args);
      if (hasCleared) return;
      const msg = args.map((a) => String(a)).join(" ");
      if (
        (msg.includes("Update Profile request failed") || msg.includes("Update Profile")) &&
        (msg.includes("404") || msg.includes("[404]"))
      ) {
        console.warn(
          "[Ninetailed] Detected stale profile via console.error. Clearing localStorage..."
        );
        hasCleared = true;
        clearStaleNinetailedProfile();
        setProviderKey((k) => k + 1);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      console.error = originalConsoleError;
    };
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
      setPreviewPlugin(null);
      return;
    }
    let mounted = true;
    setPreviewDataLoading(true);

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
      .catch(() => {
        // preview helper; ignore errors but stop loading
        if (mounted) setPreviewDataLoading(false);
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
  // 2. If preview is enabled, wait for preview data to load (previewDataLoading)
  // 3. If preview is enabled, wait for the plugin instance to exist
  if (previewLoading || (previewEnabled && (previewDataLoading || !previewPlugin))) {
    return null;
  }

  // Keep provider key stable (except when forcing a reset).
  // Remounting can re-attach the preview plugin and trigger "already attached".
  const combinedKey = `nt-${providerKey}`;

  return (
    <NinetailedProvider
      key={combinedKey}
      clientId={process.env.NEXT_PUBLIC_NINETAILED_CLIENT_ID as string}
      environment={process.env.NEXT_PUBLIC_NINETAILED_ENVIRONMENT}
      // @ts-expect-error The provider's plugin prop types vary by package version; this array is correct at runtime.
      plugins={plugins}
      componentViewTrackingThreshold={2000}
      useSDKEvaluation={true}
      
       
    >
      <LivePreviewProviderWrapper locale={effectiveLocale} isPreviewEnabled={!!previewEnabled}>
        <Suspense fallback={null}>
          <PageEventOnMount />
        </Suspense>
        {children}
      </LivePreviewProviderWrapper>
    </NinetailedProvider>
  );
}

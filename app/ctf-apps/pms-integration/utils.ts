import type { PmsAppInstallationParameters } from "./types";

/**
 * Get default installation parameters
 */
export function getDefaultInstallationParams(
  params?: Partial<PmsAppInstallationParameters>
): PmsAppInstallationParameters {
  return {
    provider: params?.provider || "mock",
    useMock: params?.useMock ?? true,
    simulateLatency: params?.simulateLatency ?? true,
    latencyRange: params?.latencyRange || [150, 400],
    credentials: params?.credentials || {},
  };
}

/**
 * Fetch with timeout helper
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Request failed with status ${res.status}`,
      };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      error: isAbort ? `Request timed out after ${timeoutMs}ms` : "Network error",
    };
  } finally {
    clearTimeout(id);
  }
}

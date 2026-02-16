import type { FormSelectorFieldValue } from "./types";

export function normalizeFormSelectorField(
  value: Partial<FormSelectorFieldValue> | null | undefined
): FormSelectorFieldValue {
  return {
    version: 1,
    selectedForm: value?.selectedForm,
  };
}

type FetchResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
}

export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<FetchResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { ok: false, error: "Request timed out" };
      }
      return { ok: false, error: error.message };
    }

    return { ok: false, error: "Unknown error" };
  }
}

/**
 * Contentful Management API client helper.
 *
 * Uses CONTENTFUL_MANAGEMENT_TOKEN from server environment.
 * Never import this from a client component.
 */

import { createClient, type PlainClientAPI } from "contentful-management";

let _client: PlainClientAPI | null = null;

/**
 * Returns a singleton plain CMA client.
 * Throws if the token is missing.
 */
export function getCmaClient(): PlainClientAPI {
  if (_client) return _client;

  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  if (!token) {
    throw new Error(
      "[SidebarScheduler] CONTENTFUL_MANAGEMENT_TOKEN is not set in server environment.",
    );
  }

  _client = createClient({ accessToken: token }, { type: "plain" });
  return _client;
}

/**
 * Returns the raw CMA token string for direct REST calls.
 * Throws if the token is missing.
 */
export function getCmaToken(): string {
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  if (!token) {
    throw new Error(
      "[SidebarScheduler] CONTENTFUL_MANAGEMENT_TOKEN is not set in server environment.",
    );
  }
  return token;
}

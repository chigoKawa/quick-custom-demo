"use client";

import { useCallback, useEffect, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { ConfigAppSDK } from "@contentful/app-sdk";
import type { SchedulerInstallationParameters } from "../types";

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  useEffect(() => {
    const params = sdk.parameters.installation as SchedulerInstallationParameters | undefined;
    if (params) {
      setApiBaseUrl(params.apiBaseUrl || "");
      setApiSecret(params.apiSecret || "");
    }
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const parameters: SchedulerInstallationParameters = {
      apiBaseUrl: apiBaseUrl.trim() || undefined,
      apiSecret: apiSecret.trim() || undefined,
    };
    return { parameters };
  }, [apiBaseUrl, apiSecret]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  return (
    <div style={{ padding: 20, maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>📅 Locale Scheduler</h1>
      <p style={{ marginBottom: 24, color: "#666", fontSize: 14, lineHeight: 1.5 }}>
        Schedule locale-based publish &amp; unpublish actions per entry.
        Configure the backend URL below so the sidebar can reach the API.
      </p>

      {/* API Base URL */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
          API Base URL
        </label>
        <input
          type="text"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          placeholder="e.g. http://localhost:3000"
          style={{
            width: "100%",
            padding: 8,
            border: "1px solid #cfd9e0",
            borderRadius: 4,
            fontSize: 13,
          }}
        />
        <p style={{ fontSize: 11, color: "#8492a6", marginTop: 4 }}>
          Base URL of the Next.js server hosting the scheduler API routes.
          Leave empty to use relative URLs (same origin).
        </p>
      </div>

      {/* Shared secret */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
          API Secret (optional)
        </label>
        <input
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="shared-secret-value"
          style={{
            width: "100%",
            padding: 8,
            border: "1px solid #cfd9e0",
            borderRadius: 4,
            fontSize: 13,
          }}
        />
        <p style={{ fontSize: 11, color: "#8492a6", marginTop: 4 }}>
          If set, sent as <code>x-scheduler-secret</code> header on every API call.
          Match this value on your server to secure the endpoints.
        </p>
      </div>

      {/* How it works */}
      <div style={{ marginTop: 32, padding: 16, background: "#e6f7ff", borderRadius: 6 }}>
        <strong style={{ fontSize: 13 }}>How It Works</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          <li>Open an entry and find the <em>Locale Scheduler</em> in the sidebar.</li>
          <li>Create a schedule: pick locales, date/time, and action (publish or unpublish).</li>
          <li>
            Click <strong>&quot;Run Due Schedules Now&quot;</strong> to execute all pending
            schedules whose time has arrived.
          </li>
          <li>
            The backend uses the CMA to publish/unpublish only the selected locales,
            including referenced entries and assets.
          </li>
        </ol>
      </div>

      {/* Requirements */}
      <div style={{ marginTop: 16, padding: 16, background: "#fff7e6", borderRadius: 6 }}>
        <strong style={{ fontSize: 13 }}>Requirements</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          <li>
            Set <code>CONTENTFUL_MANAGEMENT_TOKEN</code> in your server environment.
          </li>
          <li>
            The token must have publish permissions for the target space &amp; environment.
          </li>
        </ul>
      </div>
    </div>
  );
}

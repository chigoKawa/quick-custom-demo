"use client";

import { useCallback, useEffect, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { ConfigAppSDK } from "@contentful/app-sdk";

interface AppInstallationParameters {
  MOCK_MODE?: string;
  CARAVAL_API_URL?: string;
  CARAVAL_API_KEY?: string;
}

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const [mockMode, setMockMode] = useState(true);
  const [apiUrl, setApiUrl] = useState("https://api.caraval.example.com");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const params = sdk.parameters.installation as AppInstallationParameters;
    if (params) {
      setMockMode(params.MOCK_MODE !== "false");
      setApiUrl(params.CARAVAL_API_URL || "https://api.caraval.example.com");
      setApiKey(params.CARAVAL_API_KEY || "");
    }
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const parameters: AppInstallationParameters = {
      MOCK_MODE: mockMode ? "true" : "false",
      CARAVAL_API_URL: apiUrl,
      CARAVAL_API_KEY: apiKey,
    };
    return { parameters };
  }, [mockMode, apiUrl, apiKey]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Compliance Review</h1>
      <p style={{ marginBottom: 24, color: "#666" }}>
        Configure the compliance review integration for workflow automation.
      </p>

      <div style={{ marginBottom: 24, padding: 16, background: "#f7f9fa", borderRadius: 4 }}>
        <strong>Setup Required:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Create a Workflow with a &quot;Compliance Review&quot; step</li>
          <li>Create an Automation that triggers on that step</li>
          <li>Configure the Automation to call the App Action</li>
        </ol>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={mockMode}
            onChange={(e) => setMockMode(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          <span>Mock Mode (for testing)</span>
        </label>
        <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          Uses mock compliance checks instead of calling the real API.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          API URL
        </label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          disabled={mockMode}
          style={{
            width: "100%",
            padding: 8,
            border: "1px solid #cfd9e0",
            borderRadius: 4,
            opacity: mockMode ? 0.5 : 1,
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={mockMode}
          style={{
            width: "100%",
            padding: 8,
            border: "1px solid #cfd9e0",
            borderRadius: 4,
            opacity: mockMode ? 0.5 : 1,
          }}
        />
      </div>

      <div style={{ marginTop: 32, padding: 16, background: "#e3f2fd", borderRadius: 4 }}>
        <strong>How It Works:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Entry enters &quot;Compliance Review&quot; workflow step</li>
          <li>Automation triggers the App Action</li>
          <li>Function scores content and updates entry fields</li>
          <li>complianceStatus set to approved/rejected</li>
        </ol>
      </div>
    </div>
  );
}

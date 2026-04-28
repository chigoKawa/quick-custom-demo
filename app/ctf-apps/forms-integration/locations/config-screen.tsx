"use client";

import type { AppExtensionSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useCallback, useEffect, useState, useRef } from "react";

interface AppInstallationParameters {
  provider?: string;
  useMock?: boolean;
  simulateLatency?: boolean;
}

const PROVIDERS = [
  { id: "mock", name: "Mock Forms", description: "Demo forms for testing" },
  { id: "jotform", name: "JotForm", description: "Powerful online form builder" },
  { id: "typeform", name: "Typeform", description: "Beautiful conversational forms" },
  { id: "hubspot", name: "HubSpot Forms", description: "Marketing and lead capture forms" },
  { id: "formstack", name: "Formstack", description: "Enterprise form builder" },
];

export default function ConfigScreen() {
  const sdk = useSDK<AppExtensionSDK>();
  const [parameters, setParameters] = useState<AppInstallationParameters>({
    provider: "mock",
    useMock: true,
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const parametersRef = useRef(parameters);

  // Keep ref in sync
  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  // Initialize from existing params
  useEffect(() => {
    const currentParams = sdk.parameters.installation as AppInstallationParameters;
    if (currentParams && Object.keys(currentParams).length > 0) {
      setParameters(currentParams);
      setIsInstalled(!!currentParams.provider);
    }
  }, [sdk]);

  // Set up onConfigure handler
  useEffect(() => {
    sdk.app.onConfigure(() => {
      return {
        parameters: parametersRef.current,
      };
    });

    // Mark app as ready
    sdk.app.setReady();
  }, [sdk]);

  const handleProviderChange = useCallback((provider: string) => {
    setParameters((prev) => ({
      ...prev,
      provider,
      useMock: provider === "mock",
    }));
  }, []);

  const handleMockToggle = useCallback((useMock: boolean) => {
    setParameters((prev) => ({
      ...prev,
      useMock,
    }));
  }, []);

  const selectedProvider = parameters.provider || "mock";
  const useMock = parameters.useMock ?? true;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          📝 Forms Integration
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Connect your form provider to embed forms in your content entries.
        </p>
      </div>

      {/* Status Banner */}
      <div
        style={{
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
          backgroundColor: isInstalled ? "#ecfdf5" : "#fef3c7",
          border: `1px solid ${isInstalled ? "#10b981" : "#f59e0b"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{isInstalled ? "✅" : "⚠️"}</span>
          <span style={{ fontWeight: 500 }}>
            {isInstalled ? "App Configured" : "Configuration Required"}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          {isInstalled
            ? `Using ${PROVIDERS.find((p) => p.id === selectedProvider)?.name || selectedProvider}`
            : "Select a form provider to get started"}
        </p>
      </div>

      {/* Provider Selection */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Form Provider
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {PROVIDERS.map((provider) => (
            <label
              key={provider.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 16,
                borderRadius: 8,
                border: `2px solid ${
                  selectedProvider === provider.id ? "#3b82f6" : "#e5e7eb"
                }`,
                backgroundColor:
                  selectedProvider === provider.id ? "#eff6ff" : "#fff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={selectedProvider === provider.id}
                onChange={() => handleProviderChange(provider.id)}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{provider.name}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {provider.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Mock Mode Toggle */}
      {selectedProvider !== "mock" && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Demo Settings
          </h2>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => handleMockToggle(e.target.checked)}
            />
            <div>
              <div style={{ fontWeight: 500 }}>Use Mock Data</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Use sample forms instead of connecting to the real provider
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Provider Credentials (placeholder) */}
      {selectedProvider !== "mock" && !useMock && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Provider Credentials
          </h2>
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Credentials configuration for {PROVIDERS.find((p) => p.id === selectedProvider)?.name} 
              would appear here. For demo purposes, use Mock Data mode.
            </p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div
        style={{
          padding: 16,
          borderRadius: 8,
          backgroundColor: "#f0f9ff",
          border: "1px solid #0ea5e9",
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          💡 How to use
        </h3>
        <ol style={{ fontSize: 13, color: "#6b7280", paddingLeft: 20, margin: 0 }}>
          <li>Select a form provider above</li>
          <li>Add a JSON field to your content type</li>
          <li>Set the field appearance to use this app</li>
          <li>Select forms when editing entries</li>
        </ol>
      </div>
    </div>
  );
}

"use client";

import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME, PROVIDER_OPTIONS } from "../constants";
import type { PmsAppInstallationParameters } from "../types";
import { getDefaultInstallationParams } from "../utils";
import styles from "./config-screen.module.css";

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const defaults = useMemo(
    () => getDefaultInstallationParams(sdk.parameters.installation as any),
    [sdk.parameters.installation]
  );

  const [provider, setProvider] = useState(defaults.provider);
  const [useMock, setUseMock] = useState(defaults.useMock);
  const [simulateLatency, setSimulateLatency] = useState(defaults.simulateLatency);
  const [apiKey, setApiKey] = useState(defaults.credentials?.apiKey || "");
  const [apiToken, setApiToken] = useState(defaults.credentials?.apiToken || "");

  useEffect(() => {
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const parameters: PmsAppInstallationParameters = {
      provider,
      useMock,
      simulateLatency,
      latencyRange: [150, 400],
      credentials: useMock
        ? {}
        : {
            apiKey: apiKey.trim() || undefined,
            apiToken: apiToken.trim() || undefined,
          },
    };

    return { parameters } as any;
  }, [provider, useMock, simulateLatency, apiKey, apiToken]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  const showCredentials = !useMock && provider === "beds24";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🏢 {APP_NAME}</h1>
        <p className={styles.subtitle}>
          Configure your Property Management System provider. Use mock mode for demos without
          connecting to a real PMS backend.
        </p>
      </div>

      {/* Status Card */}
      <div className={styles.statusCard}>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <div className={styles.statusIcon}>🔌</div>
            <div className={styles.statusLabel}>Provider</div>
            <div className={styles.statusValue}>
              {PROVIDER_OPTIONS.find(p => p.value === provider)?.label || provider}
            </div>
          </div>
          <div className={styles.statusItem}>
            <div className={styles.statusIcon}>{useMock ? "🎭" : "🌐"}</div>
            <div className={styles.statusLabel}>Mode</div>
            <div className={styles.statusValue}>{useMock ? "Mock" : "Live"}</div>
          </div>
          <div className={styles.statusItem}>
            <div className={styles.statusIcon}>✅</div>
            <div className={styles.statusLabel}>Status</div>
            <div className={styles.statusValue}>Ready</div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      <div className={styles.successBanner}>
        <div className={styles.successIcon}>✅</div>
        <div className={styles.successText}>Configuration looks good! Save to apply changes.</div>
      </div>

      {/* Provider Selection */}
      <div className={styles.formSection}>
        <div className={styles.sectionTitle}>🏪 PMS Provider</div>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Select Provider <span className={styles.required}>*</span>
          </label>
          <select
            className={styles.select}
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className={styles.helpText}>
            Choose your PMS backend. Mock mode is perfect for demos and testing.
          </div>
        </div>
      </div>

      {/* Mock Mode Settings */}
      <div className={styles.formSection}>
        <div className={styles.sectionTitle}>🎭 Demo Settings</div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxGroup}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
            />
            <span className={styles.checkboxLabel}>
              Use Mock Mode (Demo)
              {useMock && <span className={styles.badge}>Active</span>}
            </span>
          </label>
          <div className={styles.helpText}>
            Enable to use mock data instead of connecting to a real PMS. Perfect for
            demos and testing without external dependencies.
          </div>
        </div>

        {useMock && (
          <div className={styles.formGroup}>
            <label className={styles.checkboxGroup}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={simulateLatency}
                onChange={(e) => setSimulateLatency(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>
                Simulate Network Latency
                {simulateLatency && <span className={styles.badge}>Active</span>}
              </span>
            </label>
            <div className={styles.helpText}>
              Add realistic delays (150-400ms) to mock API calls for a more authentic demo experience.
            </div>
          </div>
        )}
      </div>

      {/* Credentials Section */}
      {showCredentials && (
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>🔐 Beds24 Credentials</div>

          <div className={styles.credentialsSection}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                API Key <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your Beds24 API key"
              />
              <div className={styles.helpText}>
                Your Beds24 API key from the Beds24 dashboard
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                API Token <span className={styles.required}>*</span>
              </label>
              <input
                type="password"
                className={styles.input}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Your Beds24 API token"
              />
              <div className={styles.helpText}>
                Your Beds24 API token from the Beds24 dashboard
              </div>
            </div>
          </div>

          <div className={styles.infoBox}>
            <p>
              <strong>💡 Tip:</strong> Your credentials are stored securely in Contentful and never
              exposed in your frontend code. They are only used server-side for API calls.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.resetButton}
          onClick={() => {
            const resetDefaults = getDefaultInstallationParams();
            setProvider(resetDefaults.provider);
            setUseMock(resetDefaults.useMock);
            setSimulateLatency(resetDefaults.simulateLatency);
            setApiKey("");
            setApiToken("");
            sdk.notifier.success("Reset to defaults.");
          }}
        >
          🔄 Reset to Defaults
        </button>
      </div>
    </div>
  );
}

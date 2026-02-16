"use client";

import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME, PROVIDER_OPTIONS } from "../constants";
import type { CommerceAppInstallationParameters } from "../types";
import { getDefaultInstallationParams, validateProviderCredentials } from "../utils";
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
  const [storeUrl, setStoreUrl] = useState(defaults.credentials?.storeUrl || "");
  const [accessToken, setAccessToken] = useState(defaults.credentials?.accessToken || "");
  const [apiKey, setApiKey] = useState(defaults.credentials?.apiKey || "");
  const [apiSecret, setApiSecret] = useState(defaults.credentials?.apiSecret || "");

  const credentialErrors = useMemo(() => {
    if (useMock) return [];
    
    return validateProviderCredentials(provider, {
      storeUrl,
      accessToken,
      apiKey,
      apiSecret,
    });
  }, [provider, useMock, storeUrl, accessToken, apiKey, apiSecret]);

  useEffect(() => {
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    if (!useMock && credentialErrors.length > 0) {
      sdk.notifier.error("Fix configuration errors before installing.");
      return false as any;
    }

    const parameters: CommerceAppInstallationParameters = {
      provider,
      useMock,
      simulateLatency,
      latencyRange: [200, 500],
      credentials: useMock
        ? {}
        : {
            storeUrl: storeUrl.trim() || undefined,
            accessToken: accessToken.trim() || undefined,
            apiKey: apiKey.trim() || undefined,
            apiSecret: apiSecret.trim() || undefined,
          },
    };

    return { parameters } as any;
  }, [
    sdk,
    provider,
    useMock,
    simulateLatency,
    storeUrl,
    accessToken,
    apiKey,
    apiSecret,
    credentialErrors,
  ]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  const showCredentials = !useMock;
  const showShopifyFields = showCredentials && provider === "shopify";
  const showCommerceToolsFields = showCredentials && provider === "commercetools";
  const showBigCommerceFields = showCredentials && provider === "bigcommerce";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🛍️ {APP_NAME}</h1>
        <p className={styles.subtitle}>
          Configure your commerce provider and credentials. Use mock mode for demos without
          connecting to a real commerce backend.
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
            <div className={styles.statusIcon}>
              {credentialErrors.length === 0 ? "✅" : "⚠️"}
            </div>
            <div className={styles.statusLabel}>Status</div>
            <div className={styles.statusValue}>
              {credentialErrors.length === 0 ? "Ready" : "Errors"}
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Banner */}
      {credentialErrors.length > 0 ? (
        <div className={styles.errorBanner}>
          <div className={styles.errorTitle}>⚠️ Configuration Errors</div>
          <ul className={styles.errorList}>
            {credentialErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.successBanner}>
          <div className={styles.successIcon}>✅</div>
          <div className={styles.successText}>Configuration looks good! Save to apply changes.</div>
        </div>
      )}

      {/* Provider Selection */}
      <div className={styles.formSection}>
        <div className={styles.sectionTitle}>🏪 Commerce Provider</div>
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
            Choose your commerce backend. Mock mode is perfect for demos and testing.
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
            Enable to use mock data instead of connecting to a real provider. Perfect for
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
              Add realistic delays (200-500ms) to mock API calls for more authentic demo experience.
            </div>
          </div>
        )}
      </div>

      {/* Credentials Section */}
      {showCredentials && (
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>🔐 Provider Credentials</div>
          
          {showShopifyFields && (
            <div className={styles.credentialsSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Shopify Store URL <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="your-store.myshopify.com"
                />
                <div className={styles.helpText}>
                  Your Shopify store domain (e.g., mystore.myshopify.com)
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Shopify Access Token <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  className={styles.input}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="shpat_..."
                />
                <div className={styles.helpText}>
                  Admin API access token from your Shopify app settings
                </div>
              </div>
            </div>
          )}

          {showCommerceToolsFields && (
            <div className={styles.credentialsSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  commercetools API Key <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your API key"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  commercetools API Secret <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  className={styles.input}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Your API secret"
                />
              </div>
            </div>
          )}

          {showBigCommerceFields && (
            <div className={styles.credentialsSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  BigCommerce Store URL <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="store-abc123.mybigcommerce.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  BigCommerce Access Token <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  className={styles.input}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Your access token"
                />
              </div>
            </div>
          )}

          <div className={styles.infoBox}>
            <p>
              <strong>💡 Tip:</strong> Your credentials are stored securely in Contentful and never
              exposed in your frontend code. They're only used server-side for API calls.
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
            setStoreUrl("");
            setAccessToken("");
            setApiKey("");
            setApiSecret("");
            sdk.notifier.success("Reset to defaults.");
          }}
        >
          🔄 Reset to Defaults
        </button>
      </div>
    </div>
  );
}

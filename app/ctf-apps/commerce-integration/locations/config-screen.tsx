"use client";

import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Form,
  FormControl,
  Heading,
  List,
  Note,
  Paragraph,
  Select,
  Stack,
  Subheading,
  Text,
  TextInput,
} from "@contentful/f36-components";
import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME, PROVIDER_OPTIONS } from "../constants";
import type { CommerceAppInstallationParameters } from "../types";
import { getDefaultInstallationParams, validateProviderCredentials } from "../utils";

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const defaults = useMemo(
    () =>
      getDefaultInstallationParams(
        sdk.parameters.installation as Partial<CommerceAppInstallationParameters>
      ),
    [sdk.parameters.installation]
  );

  const [provider, setProvider] = useState(defaults.provider);
  const [useMock, setUseMock] = useState<boolean>(defaults.useMock ?? true);
  const [simulateLatency, setSimulateLatency] = useState<boolean>(
    defaults.simulateLatency ?? true
  );
  const [storeUrl, setStoreUrl] = useState(defaults.credentials?.storeUrl || "");
  const [accessToken, setAccessToken] = useState(
    defaults.credentials?.accessToken || ""
  );
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
      return false as unknown as ReturnType<
        Parameters<typeof sdk.app.onConfigure>[0]
      >;
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

    return { parameters } as unknown as ReturnType<
      Parameters<typeof sdk.app.onConfigure>[0]
    >;
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
    sdk.app.onConfigure(onConfigure as Parameters<typeof sdk.app.onConfigure>[0]);
  }, [sdk, onConfigure]);

  const showCredentials = !useMock;
  const showShopifyFields = showCredentials && provider === "shopify";
  const showCommerceToolsFields = showCredentials && provider === "commercetools";
  const showBigCommerceFields = showCredentials && provider === "bigcommerce";

  const providerLabel =
    PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ?? provider;

  const handleReset = () => {
    const resetDefaults = getDefaultInstallationParams();
    setProvider(resetDefaults.provider);
    setUseMock(resetDefaults.useMock ?? true);
    setSimulateLatency(resetDefaults.simulateLatency ?? true);
    setStoreUrl("");
    setAccessToken("");
    setApiKey("");
    setApiSecret("");
    sdk.notifier.success("Reset to defaults.");
  };

  return (
    <Box padding="spacingXl" style={{ maxWidth: 960, margin: "0 auto" }}>
      <Heading>{APP_NAME}</Heading>
      <Paragraph>
        Configure your commerce provider and credentials. Use mock mode for
        demos without connecting to a real commerce backend.
      </Paragraph>

      {/* ── Status summary ──────────────────────────────────────────── */}
      <Box marginTop="spacingL">
        <Flex gap="spacingS" flexWrap="wrap">
          <Badge variant="secondary">Provider: {providerLabel}</Badge>
          <Badge variant={useMock ? "warning" : "primary"}>
            Mode: {useMock ? "Mock" : "Live"}
          </Badge>
          <Badge variant={credentialErrors.length === 0 ? "positive" : "negative"}>
            {credentialErrors.length === 0 ? "Ready" : "Errors"}
          </Badge>
        </Flex>
      </Box>

      {/* ── Banner ──────────────────────────────────────────────────── */}
      <Box marginTop="spacingM">
        {credentialErrors.length > 0 ? (
          <Note variant="negative" title="Configuration errors">
            <List>
              {credentialErrors.map((e) => (
                <List.Item key={e}>{e}</List.Item>
              ))}
            </List>
          </Note>
        ) : (
          <Note variant="positive">
            Configuration looks good. Save to apply changes.
          </Note>
        )}
      </Box>

      <Form>
        {/* ── Provider ──────────────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Commerce provider</Subheading>
          <Paragraph>
            Choose your commerce backend. Mock mode is perfect for demos and
            testing without external dependencies.
          </Paragraph>
          <FormControl isRequired>
            <FormControl.Label>Provider</FormControl.Label>
            <Select
              value={provider}
              onChange={(e) =>
                setProvider(
                  e.target.value as CommerceAppInstallationParameters["provider"]
                )
              }
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* ── Demo settings ─────────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Demo settings</Subheading>
          <Stack flexDirection="column" spacing="spacingM" alignItems="flex-start">
            <Box>
              <Checkbox
                isChecked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
              >
                <Flex gap="spacingXs" alignItems="center">
                  <Text>Use mock mode (demo)</Text>
                  {useMock && <Badge variant="primary">Active</Badge>}
                </Flex>
              </Checkbox>
              <Box marginTop="spacingXs">
                <Text fontColor="gray600" as="div">
                  Enable to use mock data instead of connecting to a real
                  provider. Perfect for demos and testing without external
                  dependencies.
                </Text>
              </Box>
            </Box>

            {useMock && (
              <Box>
                <Checkbox
                  isChecked={simulateLatency}
                  onChange={(e) => setSimulateLatency(e.target.checked)}
                >
                  <Flex gap="spacingXs" alignItems="center">
                    <Text>Simulate network latency</Text>
                    {simulateLatency && <Badge variant="primary">Active</Badge>}
                  </Flex>
                </Checkbox>
                <Box marginTop="spacingXs">
                  <Text fontColor="gray600" as="div">
                    Add realistic delays (200–500ms) to mock API calls for a
                    more authentic demo experience.
                  </Text>
                </Box>
              </Box>
            )}
          </Stack>
        </Box>

        {/* ── Credentials ───────────────────────────────────────────── */}
        {showCredentials && (
          <Box marginTop="spacingXl">
            <Subheading>Provider credentials</Subheading>

            {showShopifyFields && (
              <Stack
                flexDirection="column"
                spacing="spacingM"
                alignItems="stretch"
              >
                <FormControl isRequired>
                  <FormControl.Label>Shopify store URL</FormControl.Label>
                  <TextInput
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="your-store.myshopify.com"
                  />
                  <FormControl.HelpText>
                    Your Shopify store domain (e.g. mystore.myshopify.com).
                  </FormControl.HelpText>
                </FormControl>

                <FormControl isRequired>
                  <FormControl.Label>Shopify access token</FormControl.Label>
                  <TextInput
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="shpat_..."
                  />
                  <FormControl.HelpText>
                    Admin API access token from your Shopify app settings.
                  </FormControl.HelpText>
                </FormControl>
              </Stack>
            )}

            {showCommerceToolsFields && (
              <Stack
                flexDirection="column"
                spacing="spacingM"
                alignItems="stretch"
              >
                <FormControl isRequired>
                  <FormControl.Label>commercetools API key</FormControl.Label>
                  <TextInput
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your API key"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormControl.Label>
                    commercetools API secret
                  </FormControl.Label>
                  <TextInput
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Your API secret"
                  />
                </FormControl>
              </Stack>
            )}

            {showBigCommerceFields && (
              <Stack
                flexDirection="column"
                spacing="spacingM"
                alignItems="stretch"
              >
                <FormControl isRequired>
                  <FormControl.Label>BigCommerce store URL</FormControl.Label>
                  <TextInput
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="store-abc123.mybigcommerce.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormControl.Label>
                    BigCommerce access token
                  </FormControl.Label>
                  <TextInput
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Your access token"
                  />
                </FormControl>
              </Stack>
            )}

            <Box marginTop="spacingM">
              <Note variant="neutral">
                Credentials are stored securely in Contentful and never
                exposed in your frontend code. They&apos;re only used
                server-side for API calls.
              </Note>
            </Box>
          </Box>
        )}

        {/* ── Actions ───────────────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Flex gap="spacingS" flexWrap="wrap" alignItems="center">
            <Button variant="secondary" onClick={handleReset}>
              Reset to defaults
            </Button>
            <Text fontColor="gray600">
              Use the &quot;Install&quot; / &quot;Save&quot; button at the top
              of the page to persist these settings.
            </Text>
          </Flex>
        </Box>
      </Form>
    </Box>
  );
}

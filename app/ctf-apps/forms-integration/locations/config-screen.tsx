"use client";

import {
  Badge,
  Box,
  Card,
  Checkbox,
  Flex,
  Form,
  Heading,
  List,
  Note,
  Paragraph,
  Stack,
  Subheading,
  Text,
} from "@contentful/f36-components";
import type { AppExtensionSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  useEffect(() => {
    const currentParams = sdk.parameters.installation as AppInstallationParameters;
    if (currentParams && Object.keys(currentParams).length > 0) {
      setParameters(currentParams);
      setIsInstalled(!!currentParams.provider);
    }
  }, [sdk]);

  useEffect(() => {
    sdk.app.onConfigure(() => {
      return {
        parameters: parametersRef.current,
      };
    });
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
  const providerLabel =
    PROVIDERS.find((p) => p.id === selectedProvider)?.name ?? selectedProvider;

  return (
    <Box padding="spacingXl" style={{ maxWidth: 800, margin: "0 auto" }}>
      <Heading>Forms Integration</Heading>
      <Paragraph>
        Connect your form provider to embed forms in your content entries.
      </Paragraph>

      {/* ── Status summary ──────────────────────────────────────────── */}
      <Box marginTop="spacingL">
        <Flex gap="spacingS" flexWrap="wrap">
          <Badge variant="secondary">Provider: {providerLabel}</Badge>
          <Badge variant={useMock ? "warning" : "primary"}>
            Mode: {useMock ? "Mock" : "Live"}
          </Badge>
          <Badge variant={isInstalled ? "positive" : "warning"}>
            {isInstalled ? "Configured" : "Configuration required"}
          </Badge>
        </Flex>
      </Box>

      <Box marginTop="spacingM">
        <Note variant={isInstalled ? "positive" : "warning"}>
          {isInstalled
            ? `Using ${providerLabel}. Save to apply any changes.`
            : "Select a form provider to get started, then save the configuration."}
        </Note>
      </Box>

      <Form>
        {/* ── Provider selection ────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Form provider</Subheading>
          <Paragraph>
            Pick the backend the field editor should query for forms. Mock
            mode uses bundled demo forms without any external connection.
          </Paragraph>
          <Stack
            flexDirection="column"
            spacing="spacingS"
            alignItems="stretch"
          >
            {PROVIDERS.map((provider) => {
              const isSelected = selectedProvider === provider.id;
              return (
                <Card
                  key={provider.id}
                  padding="default"
                  isSelected={isSelected}
                  onClick={() => handleProviderChange(provider.id)}
                  style={{ cursor: "pointer", textAlign: "left" }}
                >
                  <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    gap="spacingS"
                    flexWrap="wrap"
                  >
                    <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <Text fontWeight="fontWeightDemiBold" as="div">
                        {provider.name}
                      </Text>
                      <Text fontColor="gray600" fontSize="fontSizeS" as="div">
                        {provider.description}
                      </Text>
                    </Box>
                    {isSelected && (
                      <Badge variant="primary">Selected</Badge>
                    )}
                  </Flex>
                </Card>
              );
            })}
          </Stack>
        </Box>

        {/* ── Demo settings ─────────────────────────────────────────── */}
        {selectedProvider !== "mock" && (
          <Box marginTop="spacingXl">
            <Subheading>Demo settings</Subheading>
            <Box>
              <Checkbox
                isChecked={useMock}
                onChange={(e) => handleMockToggle(e.target.checked)}
              >
                <Flex gap="spacingXs" alignItems="center">
                  <Text>Use mock data</Text>
                  {useMock && <Badge variant="primary">Active</Badge>}
                </Flex>
              </Checkbox>
              <Box marginTop="spacingXs">
                <Text fontColor="gray600" as="div">
                  Use sample forms instead of connecting to {providerLabel}.
                  Useful for demos and local development.
                </Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* ── Credentials (placeholder) ─────────────────────────────── */}
        {selectedProvider !== "mock" && !useMock && (
          <Box marginTop="spacingXl">
            <Subheading>Provider credentials</Subheading>
            <Note variant="neutral">
              Credentials configuration for {providerLabel} would appear
              here. For demo purposes, enable mock data above.
            </Note>
          </Box>
        )}

        {/* ── Help ──────────────────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>How to use</Subheading>
          <List>
            <List.Item>Select a form provider above.</List.Item>
            <List.Item>
              Add a JSON (Object) field to your content type.
            </List.Item>
            <List.Item>
              Set the field&apos;s appearance to <strong>Forms Integration</strong>.
            </List.Item>
            <List.Item>Select a form when editing entries.</List.Item>
          </List>
        </Box>
      </Form>
    </Box>
  );
}

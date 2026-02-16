"use client";

import {
  Box,
  Button,
  Form,
  FormControl,
  Heading,
  Note,
  Paragraph,
  Text,
  TextInput,
} from "@contentful/f36-components";
import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME } from "../constants";
import type { AppInstallationParameters } from "../types";
import { getDefaultsFromParams, validateTemplateUrl } from "../utils";

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const defaults = useMemo(
    () => getDefaultsFromParams(sdk.parameters.installation as any),
    [sdk.parameters.installation]
  );

  const [catalogSearchUrlTemplate, setCatalogSearchUrlTemplate] = useState(
    defaults.catalogSearchUrlTemplate
  );
  const [bookDetailUrlTemplate, setBookDetailUrlTemplate] = useState(
    defaults.bookDetailUrlTemplate
  );
  const [defaultLimit, setDefaultLimit] = useState(String(defaults.defaultLimit));
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(
    String(defaults.requestTimeoutMs)
  );

  const searchTemplateErrors = useMemo(
    () => validateTemplateUrl(catalogSearchUrlTemplate, ["q", "limit"]),
    [catalogSearchUrlTemplate]
  );

  const detailTemplateErrors = useMemo(
    () => validateTemplateUrl(bookDetailUrlTemplate, ["id", "idType"]),
    [bookDetailUrlTemplate]
  );

  const numericErrors = useMemo(() => {
    const errs: string[] = [];
    const asLimit = Number(defaultLimit);
    if (!Number.isFinite(asLimit) || asLimit < 1 || asLimit > 50) {
      errs.push("defaultLimit must be a number between 1 and 50");
    }
    const asTimeout = Number(requestTimeoutMs);
    if (!Number.isFinite(asTimeout) || asTimeout < 1000 || asTimeout > 60000) {
      errs.push("requestTimeoutMs must be a number between 1000 and 60000");
    }
    return errs;
  }, [defaultLimit, requestTimeoutMs]);

  useEffect(() => {
    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const errors = [
      ...searchTemplateErrors,
      ...detailTemplateErrors,
      ...numericErrors,
    ];

    if (errors.length > 0) {
      sdk.notifier.error("Fix configuration errors before installing.");
      return false as any;
    }

    const parameters: AppInstallationParameters = {
      catalogSearchUrlTemplate: catalogSearchUrlTemplate.trim(),
      bookDetailUrlTemplate: bookDetailUrlTemplate.trim(),
      defaultLimit: Number(defaultLimit),
      requestTimeoutMs: Number(requestTimeoutMs),
    };

    return { parameters } as any;
  }, [
    sdk,
    catalogSearchUrlTemplate,
    bookDetailUrlTemplate,
    defaultLimit,
    requestTimeoutMs,
    searchTemplateErrors,
    detailTemplateErrors,
    numericErrors,
  ]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  const allErrors = [
    ...searchTemplateErrors,
    ...detailTemplateErrors,
    ...numericErrors,
  ];

  return (
    <Box padding="spacingL" style={{ maxWidth: 860, margin: "0 auto" }}>
      <Heading as="h2">{APP_NAME} – Installation Settings</Heading>
      <Paragraph>
        Configure the Open Library resolver URL templates used by the field editor.
      </Paragraph>

      {allErrors.length > 0 ? (
        <Note variant="negative" style={{ marginTop: 12 }}>
          <Text>
            {allErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </Text>
        </Note>
      ) : (
        <Note variant="positive" style={{ marginTop: 12 }}>
          <Text>Looks good. Save/install to apply.</Text>
        </Note>
      )}

      <Form style={{ marginTop: 16 }}>
        <Box marginBottom="spacingM">
          <FormControl isRequired>
            <FormControl.Label>catalogSearchUrlTemplate</FormControl.Label>
            <TextInput
              value={catalogSearchUrlTemplate}
              onChange={(e) => setCatalogSearchUrlTemplate(e.target.value)}
            />
            <FormControl.HelpText>
              {"Must include {{q}} and {{limit}}. Optional {{debug}}."}
            </FormControl.HelpText>
          </FormControl>
        </Box>

        <Box marginBottom="spacingM">
          <FormControl isRequired>
            <FormControl.Label>bookDetailUrlTemplate</FormControl.Label>
            <TextInput
              value={bookDetailUrlTemplate}
              onChange={(e) => setBookDetailUrlTemplate(e.target.value)}
            />
            <FormControl.HelpText>
              {"Must include {{id}} and {{idType}}. Optional {{debug}}."}
            </FormControl.HelpText>
          </FormControl>
        </Box>

        <Box marginBottom="spacingM" style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <FormControl isRequired>
            <FormControl.Label>defaultLimit</FormControl.Label>
            <TextInput value={defaultLimit} onChange={(e) => setDefaultLimit(e.target.value)} />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>requestTimeoutMs</FormControl.Label>
            <TextInput
              value={requestTimeoutMs}
              onChange={(e) => setRequestTimeoutMs(e.target.value)}
            />
          </FormControl>
        </Box>

        <Box marginTop="spacingM" style={{ display: "flex", gap: 12 }}>
          <Button
            variant="secondary"
            onClick={() => {
              setCatalogSearchUrlTemplate(defaults.catalogSearchUrlTemplate);
              setBookDetailUrlTemplate(defaults.bookDetailUrlTemplate);
              setDefaultLimit(String(defaults.defaultLimit));
              setRequestTimeoutMs(String(defaults.requestTimeoutMs));
              sdk.notifier.success("Reset to defaults.");
            }}
          >
            Reset
          </Button>
        </Box>
      </Form>
    </Box>
  );
}

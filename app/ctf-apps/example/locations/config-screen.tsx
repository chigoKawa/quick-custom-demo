/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import {
  Box,
  Button,
  Form,
  Heading,
  Note,
  Paragraph,
  Spinner,
  Text,
  TextInput,
} from "@contentful/f36-components";
import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useState } from "react";
import { APP_NAME } from "../constants";
import { runInstallation } from "../install";

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();
  const [newsletterContentTypeId, setNewsletterContentTypeId] =
    useState("newsletter");
  const [checkingModel, setCheckingModel] = useState(true);
  const [hasNewsletterModel, setHasNewsletterModel] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Load saved parameters when the config screen mounts
  useEffect(() => {
    const params = sdk.parameters.installation as
      | {
          newsletterContentTypeId?: string;
        }
      | undefined;
    if (params?.newsletterContentTypeId) {
      setNewsletterContentTypeId(params.newsletterContentTypeId);
    }

    sdk.app.setReady();
  }, [sdk]);

  const onConfigure = useCallback(async () => {
    const ctId = newsletterContentTypeId || "newsletter";

    const parameters = {
      newsletterContentTypeId: ctId,
    };

    // Preserve existing editor interface state and add this app to
    // the sidebar and entry-editor locations for the configured
    // Newsletter content type.
    const current = await sdk.app.getCurrentState().catch(() => null);
    const existingEI = (current?.EditorInterface as Record<string, any>) || {};

    // Keep the runtime structure, but do not over-constrain the type.
    const EditorInterface: Record<string, any> = {
      ...existingEI,
    };

    const prev = existingEI[ctId] || {};
    EditorInterface[ctId] = {
      ...prev,
      // Put this app in the sidebar and register an editor location.
      sidebar: { position: 1 },
      editors: { position: 1 },
    };

    const targetState: any = { EditorInterface };

    return { parameters, targetState } as any;
  }, [newsletterContentTypeId, sdk]);

  // Register the configure handler
  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  // Check if the configured Newsletter content type exists
  useEffect(() => {
    let cancelled = false;

    async function checkModel() {
      setCheckingModel(true);
      try {
        await sdk.cma.contentType.get({
          environmentId: sdk.ids.environment,
          contentTypeId: newsletterContentTypeId || "newsletter",
        });
        if (!cancelled) setHasNewsletterModel(true);
      } catch (err: unknown) {
        if (!cancelled) setHasNewsletterModel(false);
      } finally {
        if (!cancelled) setCheckingModel(false);
      }
    }

    checkModel();
    return () => {
      cancelled = true;
    };
  }, [sdk, newsletterContentTypeId]);

  // After configuration is saved/installed, run the installer once
  useEffect(() => {
    sdk.app.onConfigurationCompleted(async () => {
      try {
        setInstalling(true);
        const params = sdk.parameters.installation as
          | {
              newsletterContentTypeId?: string;
            }
          | undefined;

        await runInstallation({
          cma: sdk.cma,
          notifier: sdk.notifier,
          environmentId: sdk.ids.environment,
          locale: sdk.locales.default,
          newsletterContentTypeId:
            params?.newsletterContentTypeId || "newsletter",
        });

        sdk.notifier.success("Newsletter model installed or updated.");
      } catch (err) {
        console.error("Newsletter install failed", err);
        sdk.notifier.error(
          "Newsletter install failed. Check browser console for details."
        );
      } finally {
        setInstalling(false);
      }
    });
  }, [sdk]);

  return (
    <Box padding="spacingL" style={{ maxWidth: 820, margin: "0 auto" }}>
      <Heading as="h2">{APP_NAME} – Installation Settings</Heading>
      <Paragraph>
        Configure which content type ID to use for Newsletters. The app will
        create the content type if it does not exist, or add missing fields if
        it already exists.
      </Paragraph>

      <Form style={{ marginTop: "1.5rem" }}>
        <Box marginBottom="spacingM">
          <Text as="label">Newsletter content type ID</Text>
          <TextInput
            value={newsletterContentTypeId}
            onChange={(e) => setNewsletterContentTypeId(e.target.value)}
          />
        </Box>

        <Note>
          <Text>
            The installer is idempotent. It will not remove or rename existing
            fields, only add the required newsletter fields if they are missing.
          </Text>
          {installing && (
            <Box
              marginTop="spacingS"
              style={{ display: "flex", alignItems: "center" }}
            >
              <Spinner size="small" />
              <Text style={{ marginLeft: "0.5rem" }}>
                Installing Newsletter model… This can take a little while.
              </Text>
            </Box>
          )}
        </Note>

        {checkingModel ? (
          <Box marginTop="spacingM">
            <Spinner size="small" />
            <Text style={{ marginLeft: "0.5rem" }}>
              Checking for existing Newsletter content type…
            </Text>
          </Box>
        ) : hasNewsletterModel ? (
          <Box marginTop="spacingM">
            <Note>
              <Text>
                A content type with this ID already exists. The installer will
                keep it and only add missing fields required for Newsletter
                Preview.
              </Text>
            </Note>
          </Box>
        ) : (
          <Box marginTop="spacingM">
            <Note>
              <Text>
                No existing content type with this ID was found. The installer
                will create a new Newsletter content type.
              </Text>
            </Note>
          </Box>
        )}
      </Form>
    </Box>
  );
}

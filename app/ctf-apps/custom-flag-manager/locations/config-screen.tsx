"use client";

import React, { useCallback, useEffect } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { ConfigAppSDK } from "@contentful/app-sdk";
import {
  Flex,
  Heading,
  Paragraph,
  Note,
  TextLink,
  List,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";

import { APP_NAME, CT_EXPERIENCE, CT_AUDIENCE } from "../constants";

/**
 * The app has no configuration. Everything it needs comes from the installation itself:
 * the space and environment from `sdk.ids`, write permission from `sdk.access.can`,
 * and the content model from the Personalization integration (PLAN.md §6.5, §6.12).
 *
 * This screen exists only because an app must have somewhere to be installed from, so it
 * explains what the app will read and write rather than asking for anything.
 */
export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const onConfigure = useCallback(async () => {
    return { parameters: {} };
  }, []);

  useEffect(() => {
    sdk.app.setReady();
  }, [sdk]);

  useEffect(() => {
    sdk.app.onConfigure(onConfigure);
  }, [sdk, onConfigure]);

  return (
    <Flex
      flexDirection="column"
      style={{ maxWidth: 768, gap: tokens.spacingM }}
    >
      <Heading marginBottom="none">{APP_NAME}</Heading>

      <Paragraph marginBottom="none">
        A dedicated surface for the custom flags in your Personalization
        experiments: a registry of every flag across every experience, a guided
        create flow with a visual JSON builder, and the frontend snippet a
        developer needs to actually read the flag.
      </Paragraph>

      <Note variant="neutral" title="No configuration needed">
        The app reads the space and environment it was installed into, so there
        is nothing to fill in. Just click <strong>Install</strong>.
      </Note>

      <Paragraph marginBottom="none">
        <strong>What it touches</strong>
      </Paragraph>
      <List>
        <List.Item>
          Reads <code>{CT_EXPERIENCE}</code> and <code>{CT_AUDIENCE}</code>{" "}
          entries to build the registry.
        </List.Item>
        <List.Item>
          Creates <code>{CT_EXPERIENCE}</code> entries when you add a flag.
          Everything it writes stays a normal entry — fully visible and
          editable in the native Personalization UI.
        </List.Item>
        <List.Item>
          Never deletes an experience entry, and never edits one you did not ask
          it to.
        </List.Item>
      </List>

      <Paragraph marginBottom="none" fontColor="gray600">
        After installing, open it from{" "}
        <strong>Apps → {APP_NAME}</strong> in the top navigation.{" "}
        <TextLink
          href="https://www.contentful.com/developers/docs/personalization/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Personalization docs
        </TextLink>
      </Paragraph>
    </Flex>
  );
}

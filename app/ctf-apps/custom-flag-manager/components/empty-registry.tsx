"use client";

import React from "react";
import { Button, Flex, Heading, Paragraph, TextLink } from "@contentful/f36-components";
import { ArrowSquareOutIcon, FlagIcon } from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import { DOCS_CUSTOM_FLAGS } from "../constants";

interface EmptyRegistryProps {
  canWrite: boolean;
  onCreate: () => void;
}

/**
 * Forma 36 v5 has no `EmptyState` primitive (`@contentful/f36-empty-state` exports only
 * `MissingContent`), so this is the composition described in PLAN.md §2.2.
 */
export function EmptyRegistry({ canWrite, onCreate }: EmptyRegistryProps) {
  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      gap="spacingM"
      style={{
        border: `1px dashed ${tokens.gray300}`,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.colorWhite,
        padding: `${tokens.spacing4Xl} ${tokens.spacingXl}`,
        textAlign: "center",
      }}
    >
      <Flex
        alignItems="center"
        justifyContent="center"
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: tokens.gray200,
        }}
      >
        <FlagIcon size="medium" color={tokens.gray600} />
      </Flex>
      <Heading marginBottom="none">No custom flags yet</Heading>
      <Paragraph marginBottom="none" style={{ maxWidth: 520 }}>
        A custom flag is a key–value pair delivered at runtime. Your frontend reads the key and
        changes behaviour — layout, feature toggles, thresholds — without swapping a content entry.
      </Paragraph>
      <Flex gap="spacingS" alignItems="center">
        <Button variant="primary" onClick={onCreate} isDisabled={!canWrite}>
          Create flag
        </Button>
        <TextLink
          href={DOCS_CUSTOM_FLAGS}
          target="_blank"
          rel="noopener noreferrer"
          icon={<ArrowSquareOutIcon />}
          alignIcon="end"
        >
          Learn about custom flags
        </TextLink>
      </Flex>
    </Flex>
  );
}

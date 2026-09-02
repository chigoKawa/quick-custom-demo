"use client";

/**
 * Local composition of Forma 36's `Workbench`.
 *
 * `@contentful/f36-workbench` was deliberately not installed: its latest release is on the
 * Forma 36 **v4** line, so it drags in a second `f36-core` / `f36-tokens` / `emotion` stack.
 * Two token majors means our spacing and colours stop matching the chrome around them — the
 * opposite of looking native. See PLAN.md §2.3.
 *
 * Geometry is taken from the design mock rather than from the v4 Workbench: a white header whose
 * height comes from its padding (not a fixed 65px), a hairline in `colorElementLight`, a title at
 * 20px/28px and a 12px sub-line, then a left-aligned scrolling content area. Nothing here is
 * centred — the mock aligns every surface to the same left gutter.
 */

import React from "react";
import { Flex, Box, Heading, Text } from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";

export function Workbench({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      flexDirection="column"
      style={{
        height: "100vh",
        backgroundColor: tokens.gray100,
        fontFamily: tokens.fontStackPrimary,
        color: tokens.colorTextBase,
      }}
    >
      {children}
    </Flex>
  );
}

export function WorkbenchHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Flex
      as="header"
      alignItems="center"
      style={{
        flex: "0 0 auto",
        padding: "14px 32px",
        gap: tokens.spacingM,
        backgroundColor: tokens.colorWhite,
        borderBottom: `1px solid ${tokens.colorElementLight}`,
      }}
    >
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Heading
          as="h1"
          marginBottom="none"
          style={{
            fontSize: tokens.fontSizeXl,
            // No line-height token equals the mock's 28px (`lineHeightXl` is 32px).
            lineHeight: "28px",
            fontWeight: tokens.fontWeightDemiBold,
            color: tokens.gray900,
          }}
        >
          {title}
        </Heading>
        {description ? (
          <Text
            as="div"
            style={{
              fontSize: tokens.fontSizeS,
              lineHeight: "18px",
              color: tokens.colorTextLight,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        ) : null}
      </Box>

      {actions ? (
        <Flex
          alignItems="center"
          style={{ marginLeft: "auto", gap: tokens.spacingXs }}
        >
          {actions}
        </Flex>
      ) : null}
    </Flex>
  );
}

export function WorkbenchContent({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
        padding: "24px 32px 48px",
      }}
    >
      <Box style={{ maxWidth: 1440 }}>{children}</Box>
    </Box>
  );
}

Workbench.Header = WorkbenchHeader;
Workbench.Content = WorkbenchContent;

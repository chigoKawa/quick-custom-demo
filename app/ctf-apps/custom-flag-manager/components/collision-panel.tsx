"use client";

/**
 * The collision detail panel (PLAN.md §1.6).
 *
 * Forma 36 v5 has no drawer/side-panel primitive — `Modal` is a centred or top-anchored
 * dialog — so the frame is composed from tokens here, the same approach taken for
 * `workbench.tsx` and `empty-registry.tsx`. Everything inside the frame is a real primitive.
 *
 * The panel exists for one sentence: *which one of these actually wins today*. Remediation
 * stays copy only. Renaming a key is a frontend change as much as a content one, so a
 * one-click fix here would silently break a deployed `useFlag` call.
 */

import { useEffect, useRef } from "react";

import {
  Badge,
  Flex,
  Heading,
  IconButton,
  Note,
  Text,
  TextLink,
} from "@contentful/f36-components";
import { XIcon } from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import type { CollisionGroup, FlagRow } from "../lib/types";
import { FlagKey, FlagStatusBadge } from "./badges";

const PANEL_WIDTH = 460;

const RESOLUTIONS: { title: string; body: string }[] = [
  {
    title: "Rename a key",
    body: "Give one experience a distinct key, then update the useFlag call that reads it. The rename only takes effect once that frontend change ships.",
  },
  {
    title: "Archive one",
    body: "Archiving the experience that loses removes the ambiguity, but any frontend still reading this key falls back to its default value.",
  },
];

interface CollisionPanelProps {
  /** `null` closes the panel — the parent owns which key is open. */
  group: CollisionGroup | null;
  onClose: () => void;
  onOpenEntry: (row: FlagRow) => void;
}

export function CollisionPanel({ group, onClose, onOpenEntry }: CollisionPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!group) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [group, onClose]);

  if (!group) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(25, 37, 50, 0.28)",
          zIndex: tokens.zIndexModal,
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="collision-panel-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: PANEL_WIDTH,
          maxWidth: "100vw",
          backgroundColor: tokens.colorWhite,
          boxShadow: tokens.boxShadowHeavy,
          zIndex: tokens.zIndexModalContent,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Flex
          alignItems="flex-start"
          gap="spacingM"
          padding="spacingM"
          paddingLeft="spacingL"
          paddingRight="spacingL"
          style={{ borderBottom: `1px solid ${tokens.gray200}` }}
        >
          <Flex flexDirection="column" gap="spacing2Xs" style={{ flex: 1 }}>
            <Heading id="collision-panel-title" as="h2" marginBottom="none">
              Key collision
            </Heading>
            <FlagKey>{group.key}</FlagKey>
          </Flex>
          <IconButton
            ref={closeRef}
            variant="transparent"
            aria-label="Close panel"
            icon={<XIcon />}
            onClick={onClose}
          />
        </Flex>

        <Flex
          flexDirection="column"
          gap="spacingM"
          padding="spacingL"
          style={{ overflowY: "auto" }}
        >
          <Note variant="warning">
            If a visitor qualifies for both, only one applies. The optimization with the
            alphabetically lower entry ID wins and priority is not configurable.
          </Note>

          <SectionLabel>Experiences using this key</SectionLabel>

          {group.rows.map((row) => (
            <ExperienceRow
              key={row.id}
              row={row}
              wins={row.id === group.winner.id}
              onOpenEntry={onOpenEntry}
            />
          ))}

          <SectionLabel>How to resolve</SectionLabel>

          {RESOLUTIONS.map((option) => (
            <Flex key={option.title} flexDirection="column" gap="spacing2Xs">
              <Text fontWeight="fontWeightDemiBold" fontColor="gray900">
                {option.title}
              </Text>
              <Text fontColor="gray600" fontSize="fontSizeS">
                {option.body}
              </Text>
            </Flex>
          ))}
        </Flex>
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="fontSizeS"
      fontWeight="fontWeightDemiBold"
      fontColor="gray600"
      style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
    >
      {children}
    </Text>
  );
}

function ExperienceRow({
  row,
  wins,
  onOpenEntry,
}: {
  row: FlagRow;
  wins: boolean;
  onOpenEntry: (row: FlagRow) => void;
}) {
  return (
    <Flex
      flexDirection="column"
      gap="spacing2Xs"
      padding="spacingS"
      style={{
        border: `1px solid ${wins ? tokens.blue300 : tokens.gray200}`,
        borderRadius: tokens.borderRadiusMedium,
      }}
    >
      <Flex alignItems="center" gap="spacingXs" flexWrap="wrap">
        <TextLink as="button" onClick={() => onOpenEntry(row)}>
          {row.experience}
        </TextLink>
        <Badge variant="secondary">{row.kind}</Badge>
        {wins && <Badge variant="primary">Wins today</Badge>}
      </Flex>
      <Flex alignItems="center" gap="spacingXs" flexWrap="wrap">
        <Text
          fontColor="gray600"
          fontSize="fontSizeS"
          style={{ fontFamily: tokens.fontStackMonospace }}
        >
          {row.entryId}
        </Text>
        <Text fontColor="gray500" fontSize="fontSizeS">
          · {row.variantCount} variants ·
        </Text>
        <FlagStatusBadge status={row.status} />
      </Flex>
    </Flex>
  );
}

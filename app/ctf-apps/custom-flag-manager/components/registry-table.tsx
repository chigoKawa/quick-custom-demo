"use client";

import React from "react";
import {
  Badge,
  Flex,
  IconButton,
  Menu,
  Table,
  Text,
  Tooltip,
} from "@contentful/f36-components";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
} from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import { isAtParity } from "../lib/nt-config";
import type { FlagRow } from "../lib/types";
import { FlagKey, FlagStatusBadge, FormatBadge } from "./badges";

const READ_ONLY_TOOLTIP = "Your role does not permit editing optimizations in this space.";

export interface RegistryRowActions {
  onEdit?: (row: FlagRow) => void;
  onDuplicate?: (row: FlagRow) => void;
  onCopySnippet?: (row: FlagRow) => void;
  onDelete?: (row: FlagRow) => void;
}

interface RegistryTableProps extends RegistryRowActions {
  rows: FlagRow[];
  collidingKeys: Set<string>;
  canWrite: boolean;
  /** Opens the underlying `nt_experience` entry in the native editor. */
  onOpenEntry: (row: FlagRow) => void;
  /** Opens the collision detail for a key. */
  onInspectCollision?: (key: string) => void;
}

export function RegistryTable({
  rows,
  collidingKeys,
  canWrite,
  onOpenEntry,
  onInspectCollision,
  onEdit,
  onDuplicate,
  onCopySnippet,
  onDelete,
}: RegistryTableProps) {
  return (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.Cell>Flag key</Table.Cell>
          <Table.Cell>Used in</Table.Cell>
          <Table.Cell>Variants</Table.Cell>
          <Table.Cell>Status</Table.Cell>
          <Table.Cell>Health</Table.Cell>
          <Table.Cell align="right">Actions</Table.Cell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>
              <Flex alignItems="center" gap="spacingXs">
                <FlagKey>{row.key}</FlagKey>
                <FormatBadge format={row.format} />
              </Flex>
            </Table.Cell>

            <Table.Cell>
              <Flex flexDirection="column">
                <Text fontWeight="fontWeightMedium">{row.experience}</Text>
                <Text
                  fontColor="gray500"
                  fontSize="fontSizeS"
                  style={{ fontFamily: tokens.fontStackMonospace }}
                >
                  {row.entryId}
                </Text>
              </Flex>
            </Table.Cell>

            <Table.Cell>
              <Text fontColor="gray700">Baseline + {row.variantCount - 1}</Text>
            </Table.Cell>

            <Table.Cell>
              <FlagStatusBadge status={row.status} />
            </Table.Cell>

            <Table.Cell>
              <HealthCell
                row={row}
                isColliding={collidingKeys.has(row.key)}
                onInspectCollision={onInspectCollision}
              />
            </Table.Cell>

            <Table.Cell align="right">
              <Flex gap="spacing2Xs" justifyContent="flex-end" alignItems="center">
                <Tooltip content={canWrite ? "Edit flag" : READ_ONLY_TOOLTIP} placement="top">
                  <IconButton
                    variant="transparent"
                    size="small"
                    aria-label="Edit flag"
                    title={canWrite ? "Edit flag" : "Read-only access"}
                    icon={<PencilSimpleIcon />}
                    isDisabled={!canWrite || !onEdit}
                    onClick={() => onEdit?.(row)}
                  />
                </Tooltip>

                <Menu>
                  <Menu.Trigger>
                    <IconButton
                      variant="transparent"
                      size="small"
                      aria-label="More actions"
                      icon={<DotsThreeVerticalIcon />}
                    />
                  </Menu.Trigger>
                  <Menu.List>
                    <Menu.Item onClick={() => onOpenEntry(row)}>Open entry</Menu.Item>
                    <Menu.Item
                      onClick={() => onEdit?.(row)}
                      isDisabled={!canWrite || !onEdit}
                    >
                      Edit flag
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => onDuplicate?.(row)}
                      isDisabled={!canWrite || !onDuplicate}
                    >
                      Duplicate
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => onCopySnippet?.(row)}
                      isDisabled={!onCopySnippet}
                    >
                      Copy developer snippet
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => onDelete?.(row)}
                      isDisabled={!canWrite || !onDelete}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.List>
                </Menu>
              </Flex>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

/**
 * Two independent signals, not one combined score (PLAN.md §1.4): a key collision is a
 * cross-experience problem, parity is a within-entry one. A row can have both.
 */
function HealthCell({
  row,
  isColliding,
  onInspectCollision,
}: {
  row: FlagRow;
  isColliding: boolean;
  onInspectCollision?: (key: string) => void;
}) {
  const parityCount = row.variantValues.filter((value) =>
    isAtParity(value, row.baselineValue)
  ).length;

  if (!isColliding && parityCount === 0) {
    return (
      <Text fontColor="gray500" fontSize="fontSizeS">
        —
      </Text>
    );
  }

  return (
    <Flex alignItems="center" gap="spacingXs">
      {isColliding &&
        (onInspectCollision ? (
          <button
            type="button"
            onClick={() => onInspectCollision(row.key)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <Badge variant="negative">Key collision</Badge>
          </button>
        ) : (
          <Badge variant="negative">Key collision</Badge>
        ))}
      {parityCount > 0 && (
        <Tooltip content="Variant matches baseline" placement="top">
          <Flex alignItems="center" gap="spacing2Xs">
            <CheckCircleIcon color={tokens.orange600} size="tiny" />
            <Text fontColor="gray600" fontSize="fontSizeS">
              Parity
            </Text>
          </Flex>
        </Tooltip>
      )}
    </Flex>
  );
}

/** Kept for the "no results" state so the filters stay reachable. */
export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      gap="spacingS"
      style={{
        border: `1px solid ${tokens.gray200}`,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.colorWhite,
        padding: tokens.spacingXl,
      }}
    >
      <Text fontColor="gray600">No flags match these filters.</Text>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: tokens.blue600,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        Clear filters <ArrowRightIcon size="tiny" color={tokens.blue600} />
      </button>
    </Flex>
  );
}

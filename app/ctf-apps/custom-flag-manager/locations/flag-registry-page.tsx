"use client";

import React, { useMemo, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { PageAppSDK } from "@contentful/app-sdk";
import {
  Badge,
  Button,
  Flex,
  Note,
  SkeletonBodyText,
  SkeletonContainer,
  Text,
  TextLink,
  Tooltip,
} from "@contentful/f36-components";
import { ArrowClockwiseIcon, PlusIcon } from "@contentful/f36-icons";
import tokens from "@contentful/f36-tokens";

import { Workbench } from "../components/workbench";
import { RegistryControls } from "../components/registry-controls";
import { NoResults, RegistryTable } from "../components/registry-table";
import { EmptyRegistry } from "../components/empty-registry";
import { CollisionPanel } from "../components/collision-panel";
import CreateWizard from "../components/create-wizard";
import { APP_NAME } from "../constants";
import { applyFilters, EMPTY_FILTERS } from "../lib/filters";
import { useRegistry } from "../lib/use-registry";
import { useSpaceContext } from "../lib/use-space-context";
import { EMPTY_CONTEXT, LAST_STEP, type WizardContext } from "../lib/wizard";
import type { FlagRow } from "../lib/types";

const CREATE_DISABLED_TOOLTIP =
  "Your role does not permit creating optimizations.";

const NO_ROWS: FlagRow[] = [];
const NO_KEYS: Set<string> = new Set();

export default function FlagRegistryPage() {
  const sdk = useSDK<PageAppSDK>();
  const { spaceName, environment, canWrite } = useSpaceContext();
  const { status, snapshot, error, reload } = useRegistry();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // The panel is addressed by key, not by group object, so it survives a reload that
  // rebuilds the snapshot — and closes by itself if the collision was resolved meanwhile.
  const [inspectedKey, setInspectedKey] = useState<string | null>(null);
  const [view, setView] = useState<"registry" | "create">("registry");
  const [createStep, setCreateStep] = useState(1);

  // Derived once per snapshot: fresh `[]` / `new Set()` literals on every render would
  // invalidate the filter memo below.
  const { rows, collidingKeys } = useMemo(
    () => ({
      rows: snapshot?.rows ?? NO_ROWS,
      collidingKeys: snapshot?.collidingKeys ?? NO_KEYS,
    }),
    [snapshot],
  );

  const visibleRows = useMemo(
    () => applyFilters(rows, filters, collidingKeys),
    [rows, filters, collidingKeys],
  );

  const inspectedGroup =
    snapshot?.collisions.find((group) => group.key === inspectedKey) ?? null;

  // The create step validates against what already exists, so the wizard gets a projection of
  // the snapshot rather than the snapshot itself.
  const wizardContext = useMemo<WizardContext>(() => {
    if (!snapshot) return EMPTY_CONTEXT;
    const keyOwners = new Map<string, string[]>();
    for (const row of snapshot.rows) {
      const owners = keyOwners.get(row.key);
      if (owners) {
        if (!owners.includes(row.experience)) owners.push(row.experience);
      } else {
        keyOwners.set(row.key, [row.experience]);
      }
    }
    return { keyOwners, existingNames: snapshot.experienceNames };
  }, [snapshot]);

  const openEntry = (row: FlagRow) => {
    void sdk.navigator.openEntry(row.entryId, { slideIn: true });
  };

  const startCreate = () => {
    if (!canWrite) return;
    setCreateStep(1);
    setInspectedKey(null);
    setView("create");
  };

  return (
    <Workbench>
      <Workbench.Header
        title={APP_NAME}
        description={
          view === "create"
            ? `New custom flag · step ${createStep} of ${LAST_STEP}`
            : `Custom flags across ${spaceName} · ${environment}`
        }
        actions={
          view === "create" ? null : (
            <>
              {!canWrite && <Badge variant="secondary">Read only</Badge>}
              <Button
                variant="transparent"
                startIcon={<ArrowClockwiseIcon />}
                onClick={reload}
                isDisabled={status === "loading"}
              >
                Refresh
              </Button>
              <CreateFlagButton canWrite={canWrite} onCreate={startCreate} />
            </>
          )
        }
      />

      {view === "create" ? (
        <CreateWizard
          context={wizardContext}
          onStepChange={setCreateStep}
          onCancel={() => setView("registry")}
        />
      ) : (
        <>
          <Workbench.Content>
            {status === "loading" && <RegistrySkeleton />}

            {status === "error" && (
              <Note variant="negative" title="Could not load flags">
                <Flex
                  flexDirection="column"
                  gap="spacingS"
                  alignItems="flex-start"
                >
                  <Text>
                    {error?.message ??
                      "The Content Management API did not respond."}
                  </Text>
                  <TextLink as="button" onClick={reload}>
                    Try again
                  </TextLink>
                </Flex>
              </Note>
            )}

            {status === "ready" && snapshot && (
              <>
                {snapshot.collisions.length > 0 && (
                  <Note
                    variant="warning"
                    style={{ marginBottom: tokens.spacingM }}
                  >
                    <Flex
                      flexDirection="column"
                      gap="spacingXs"
                      alignItems="flex-start"
                    >
                      <Text>
                        {snapshot.collisions.length} flag{" "}
                        {snapshot.collisions.length === 1
                          ? "key is"
                          : "keys are"}{" "}
                        used by more than one experience. Resolution is
                        non-deterministic.
                      </Text>
                      <TextLink
                        as="button"
                        onClick={() =>
                          setFilters({ ...filters, duplicatesOnly: true })
                        }
                      >
                        Review
                      </TextLink>
                    </Flex>
                  </Note>
                )}

                {rows.length === 0 ? (
                  <EmptyRegistry canWrite={canWrite} onCreate={startCreate} />
                ) : (
                  <>
                    <RegistryControls
                      filters={filters}
                      onChange={setFilters}
                      shown={visibleRows.length}
                      total={rows.length}
                    />
                    {visibleRows.length === 0 ? (
                      <NoResults onClear={() => setFilters(EMPTY_FILTERS)} />
                    ) : (
                      <RegistryTable
                        rows={visibleRows}
                        collidingKeys={collidingKeys}
                        canWrite={canWrite}
                        onOpenEntry={openEntry}
                        onInspectCollision={setInspectedKey}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </Workbench.Content>

          <CollisionPanel
            group={inspectedGroup}
            onClose={() => setInspectedKey(null)}
            onOpenEntry={(row) => {
              setInspectedKey(null);
              openEntry(row);
            }}
          />
        </>
      )}
    </Workbench>
  );
}

/** Opens the wizard. Read-only installs get a disabled button that explains itself. */
function CreateFlagButton({
  canWrite,
  onCreate,
}: {
  canWrite: boolean;
  onCreate: () => void;
}) {
  const button = (
    <Button
      variant="primary"
      startIcon={<PlusIcon />}
      isDisabled={!canWrite}
      onClick={onCreate}
    >
      Create flag
    </Button>
  );

  if (canWrite) return button;

  return (
    <Tooltip content={CREATE_DISABLED_TOOLTIP} placement="bottom-end">
      {button}
    </Tooltip>
  );
}

/** Six rows, matching the density of a populated table (PLAN.md §1.5). */
function RegistrySkeleton() {
  return (
    <SkeletonContainer svgHeight={280} ariaLabel="Loading custom flags">
      <SkeletonBodyText
        numberOfLines={7}
        offsetTop={0}
        lineHeight={28}
        marginBottom={12}
      />
    </SkeletonContainer>
  );
}

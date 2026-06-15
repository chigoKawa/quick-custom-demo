"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Note,
  Pill,
  Spinner,
  Stack,
  Subheading,
  Text,
  TextInput,
} from "@contentful/f36-components";
import {
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashSimpleIcon,
} from "@contentful/f36-icons";
import type { FieldAppSDK, DialogAppSDK } from "@contentful/app-sdk";
import { locations } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useEffect, useState, useCallback } from "react";
import type { Form } from "@/lib/integrations/forms/forms.interface";
import type { FormSelectorFieldValue } from "../types";
import { fetchWithTimeout } from "../utils";

function readInitialValue(value: unknown): FormSelectorFieldValue {
  if (!value || typeof value !== "object") {
    return { version: 1 };
  }
  const v = value as Partial<FormSelectorFieldValue>;
  return {
    version: 1,
    selectedForm: v.selectedForm,
  };
}

export default function FormSelectorField() {
  const sdk = useSDK<FieldAppSDK | DialogAppSDK>();

  const isDialog = sdk.location.is(locations.LOCATION_DIALOG);
  const fieldSdk = isDialog ? null : (sdk as FieldAppSDK);

  const [config, setConfig] = useState<FormSelectorFieldValue>(() => {
    if (isDialog) {
      const params = (sdk as DialogAppSDK).parameters?.invocation as {
        selectedForm?: Form;
      };
      return {
        version: 1,
        selectedForm: params?.selectedForm,
      };
    }
    return readInitialValue(fieldSdk?.field?.getValue());
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(isDialog);
  const [error, setError] = useState<string | null>(null);
  const [tempSelection, setTempSelection] = useState<string | null>(() => {
    if (isDialog) {
      const params = (sdk as DialogAppSDK).parameters?.invocation as {
        selectedForm?: Form;
      };
      return params?.selectedForm?.id || null;
    }
    return null;
  });

  const saveValue = useCallback(
    (newConfig: FormSelectorFieldValue) => {
      setConfig(newConfig);
      if (fieldSdk?.field) {
        fieldSdk.field.setValue(newConfig);
      }
    },
    [fieldSdk]
  );

  const loadForms = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (query) {
        params.set("search", query);
      }

      const result = await fetchWithTimeout<{ forms: Form[] }>(
        `/api/integrations/forms?${params.toString()}`,
        {},
        8000
      );

      if (!result.ok) {
        setError(result.error);
        setForms([]);
        return;
      }

      setForms(result.data.forms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk]);

  useEffect(() => {
    if (isDialog) {
      loadForms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = useCallback(async () => {
    const result = await sdk.dialogs.openCurrentApp({
      title: "Select a form",
      width: 1200,
      minHeight: 600,
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      parameters: {
        selectedForm: config.selectedForm,
      } as unknown as Record<string, string>,
    });

    if (result && typeof result === "object" && "selectedForm" in result) {
      const data = result as { selectedForm: Form };
      saveValue({
        version: 1,
        selectedForm: data.selectedForm,
      });
    }
  }, [config, sdk, saveValue]);

  const handleDialogClose = useCallback(
    (selectedForm?: Form) => {
      if (isDialog) {
        (sdk as unknown as { close: (data: unknown) => void }).close({
          selectedForm: selectedForm || null,
        });
      }
    },
    [sdk, isDialog]
  );

  const handleSearch = useCallback(() => {
    loadForms(searchQuery);
  }, [loadForms, searchQuery]);

  const handleSelectForm = useCallback(
    (form: Form) => {
      if (isDialog) {
        setTempSelection(form.id);
      } else {
        saveValue({
          version: 1,
          selectedForm: form,
        });
      }
    },
    [isDialog, saveValue]
  );

  const handleConfirmSelection = useCallback(() => {
    const selectedForm = forms.find((f) => f.id === tempSelection);
    handleDialogClose(selectedForm);
  }, [forms, tempSelection, handleDialogClose]);

  const handleRemoveForm = useCallback(() => {
    saveValue({ version: 1 });
  }, [saveValue]);

  const selectedForm = config.selectedForm;

  // ─── Dialog mode ───────────────────────────────────────────────────
  if (isDialog) {
    return (
      <Box padding="spacingL">
        <Box marginBottom="spacingM">
          <Flex gap="spacingS" alignItems="center">
            <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
              <TextInput
                value={searchQuery}
                placeholder="Search forms by name or title…"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </Box>
            <Button
              variant="secondary"
              startIcon={<MagnifyingGlassIcon />}
              onClick={handleSearch}
            >
              Search
            </Button>
          </Flex>
        </Box>

        <Box style={{ minHeight: 400 }}>
          {loading && (
            <Flex
              alignItems="center"
              justifyContent="center"
              style={{ minHeight: 320 }}
              gap="spacingS"
            >
              <Spinner size="medium" />
              <Text fontColor="gray600">Loading forms…</Text>
            </Flex>
          )}

          {error && (
            <Note variant="negative" title="Error loading forms">
              {error}
            </Note>
          )}

          {!loading && !error && forms.length === 0 && (
            <EmptyState
              title="No forms found"
              description="Try a different search term."
            />
          )}

          {!loading && !error && forms.length > 0 && (
            <Stack
              flexDirection="column"
              spacing="spacingS"
              alignItems="stretch"
            >
              {forms.map((form) => {
                const isSelected = tempSelection === form.id;
                return (
                  <Card
                    key={form.id}
                    padding="default"
                    isSelected={isSelected}
                    onClick={() => handleSelectForm(form)}
                    style={{ cursor: "pointer", textAlign: "left" }}
                  >
                    <Flex
                      alignItems="flex-start"
                      justifyContent="space-between"
                      gap="spacingS"
                      flexWrap="wrap"
                    >
                      <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <Subheading marginBottom="none">{form.title}</Subheading>
                        <Box marginTop="spacing2Xs">
                          <Text fontColor="gray600">
                            {form.description || form.name}
                          </Text>
                        </Box>
                        <Box marginTop="spacingXs">
                          <Flex gap="spacingXs" flexWrap="wrap">
                            {form.category && (
                              <Pill label={form.category} />
                            )}
                            <Pill label={`${form.fields.length} fields`} />
                          </Flex>
                        </Box>
                      </Box>
                      {isSelected && (
                        <Badge variant="primary">Selected</Badge>
                      )}
                    </Flex>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>

        <Flex
          justifyContent="space-between"
          alignItems="center"
          marginTop="spacingL"
          gap="spacingS"
          flexWrap="wrap"
        >
          <Text fontColor="gray600">
            {tempSelection
              ? `${forms.find((f) => f.id === tempSelection)?.title ?? "1 form"} selected`
              : "Nothing selected yet"}
          </Text>
          <Flex gap="spacingS">
            <Button variant="secondary" onClick={() => handleDialogClose()}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSelection}
              isDisabled={!tempSelection}
            >
              Select form
            </Button>
          </Flex>
        </Flex>
      </Box>
    );
  }

  // ─── Field view ────────────────────────────────────────────────────
  return (
    <Box>
      {selectedForm ? (
        <Stack flexDirection="column" spacing="spacingS" alignItems="stretch">
          <SelectionCard
            contentType="Form"
            title={selectedForm.title}
            description={selectedForm.description || selectedForm.name}
            badges={
              <>
                {selectedForm.category && (
                  <Pill label={selectedForm.category} />
                )}
                <Pill label={`${selectedForm.fields.length} fields`} />
              </>
            }
          />
          <Flex gap="spacingS" flexWrap="wrap">
            <Button
              variant="secondary"
              startIcon={<PencilSimpleIcon />}
              onClick={handleOpenModal}
            >
              Change
            </Button>
            <Button
              variant="negative"
              startIcon={<TrashSimpleIcon />}
              onClick={handleRemoveForm}
            >
              Remove
            </Button>
          </Flex>
        </Stack>
      ) : (
        <EmptyState
          title="No form selected"
          description="Pick a form from your library to embed in this entry."
          action={
            <Button
              variant="primary"
              startIcon={<PlusIcon />}
              onClick={handleOpenModal}
            >
              Select a form
            </Button>
          }
        />
      )}
    </Box>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function SelectionCard({
  contentType,
  title,
  description,
  badges,
}: {
  contentType: string;
  title: string;
  description?: string;
  badges?: React.ReactNode;
}) {
  return (
    <Box
      style={{
        border: "1px solid #e7ebee",
        borderRadius: 6,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <Box
        padding="spacingXs"
        style={{
          background: "#fafbfc",
          borderBottom: "1px solid #e7ebee",
        }}
      >
        <Text fontColor="gray600" fontSize="fontSizeS">
          {contentType}
        </Text>
      </Box>
      <Box padding="spacingM">
        <Subheading marginBottom="none">{title}</Subheading>
        {description && (
          <Box marginTop="spacing2Xs">
            <Text fontColor="gray700">{description}</Text>
          </Box>
        )}
        {badges && (
          <Box marginTop="spacingS">
            <Flex gap="spacingXs" flexWrap="wrap">
              {badges}
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Box
      padding="spacingXl"
      style={{
        border: "1px dashed #d3dce6",
        borderRadius: 6,
        background: "#fafbfc",
        textAlign: "center",
      }}
    >
      <Text fontWeight="fontWeightDemiBold" as="div">
        {title}
      </Text>
      {description && (
        <Box marginTop="spacingXs">
          <Text fontColor="gray600">{description}</Text>
        </Box>
      )}
      {action && <Box marginTop="spacingM">{action}</Box>}
    </Box>
  );
}

"use client";

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
      const params = (sdk as DialogAppSDK).parameters?.invocation as any;
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
      const params = (sdk as DialogAppSDK).parameters?.invocation as any;
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

    if (result && typeof result === 'object' && 'selectedForm' in result) {
      const data = result as { selectedForm: Form };
      saveValue({
        version: 1,
        selectedForm: data.selectedForm,
      });
    }
  }, [config, sdk, saveValue]);

  const handleDialogClose = useCallback((selectedForm?: Form) => {
    if (isDialog) {
      (sdk as any).close({
        selectedForm: selectedForm || null,
      });
    }
  }, [sdk, isDialog]);

  const handleSearch = useCallback(() => {
    loadForms(searchQuery);
  }, [loadForms, searchQuery]);

  const handleSelectForm = useCallback((form: Form) => {
    if (isDialog) {
      setTempSelection(form.id);
    } else {
      saveValue({
        version: 1,
        selectedForm: form,
      });
    }
  }, [isDialog, saveValue]);

  const handleConfirmSelection = useCallback(() => {
    const selectedForm = forms.find(f => f.id === tempSelection);
    handleDialogClose(selectedForm);
  }, [forms, tempSelection, handleDialogClose]);

  const handleRemoveForm = useCallback(() => {
    saveValue({ version: 1 });
  }, [saveValue]);

  const selectedForm = config.selectedForm;

  // Dialog mode - show form selector
  if (isDialog) {
    return (
      <div style={{ padding: 24 }}>
        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 14,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              outline: "none",
            }}
          />
        </div>

        {/* Forms List */}
        <div style={{ minHeight: 400 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              Loading forms...
            </div>
          )}

          {error && (
            <div style={{ padding: 20, backgroundColor: "#fef2f2", borderRadius: 8, color: "#dc2626" }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && forms.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              No forms found
            </div>
          )}

          {!loading && !error && forms.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              {forms.map((form) => {
                const isSelected = tempSelection === form.id;
                return (
                  <div
                    key={form.id}
                    onClick={() => handleSelectForm(form)}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
                      backgroundColor: isSelected ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                          {form.title}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                          {form.description || form.name}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {form.category && (
                            <span style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 12,
                              backgroundColor: "#f3f4f6",
                              color: "#6b7280",
                            }}>
                              {form.category}
                            </span>
                          )}
                          <span style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 12,
                            backgroundColor: "#dbeafe",
                            color: "#1d4ed8",
                          }}>
                            {form.fields.length} fields
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{ color: "#3b82f6", fontSize: 20 }}>✓</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 24, 
          paddingTop: 16, 
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}>
          <button
            onClick={() => handleDialogClose()}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={!tempSelection}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              backgroundColor: tempSelection ? "#3b82f6" : "#e5e7eb",
              color: tempSelection ? "#fff" : "#9ca3af",
              cursor: tempSelection ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Select Form
          </button>
        </div>
      </div>
    );
  }

  // Field mode - show selected form or picker button
  return (
    <div style={{ padding: 8 }}>
      {selectedForm ? (
        <div style={{
          padding: 16,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                📝 {selectedForm.title}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {selectedForm.description || selectedForm.name}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                {selectedForm.category && (
                  <span style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 12,
                    backgroundColor: "#e5e7eb",
                    color: "#6b7280",
                  }}>
                    {selectedForm.category}
                  </span>
                )}
                <span style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 12,
                  backgroundColor: "#dbeafe",
                  color: "#1d4ed8",
                }}>
                  {selectedForm.fields.length} fields
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleOpenModal}
                style={{
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Change
              </button>
              <button
                onClick={handleRemoveForm}
                style={{
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: "1px solid #fecaca",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleOpenModal}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 8,
            border: "2px dashed #e5e7eb",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
            fontSize: 14,
            color: "#6b7280",
            transition: "all 0.15s ease",
          }}
        >
          📝 Select a form...
        </button>
      )}
    </div>
  );
}

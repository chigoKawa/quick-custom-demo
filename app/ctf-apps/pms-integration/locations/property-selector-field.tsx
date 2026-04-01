"use client";

import type { FieldAppSDK, DialogAppSDK } from "@contentful/app-sdk";
import { locations } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useEffect, useState, useCallback } from "react";
import type { PropertySelectorFieldValue } from "../types";
import { fetchWithTimeout } from "../utils";
import styles from "./property-selector-field.module.css";

interface PmsPropertyItem {
  id: string;
  name: string;
  city: string;
  heroImageUrl: string;
}

/**
 * fieldType is an instance parameter set on the app definition per field.
 * - 'text'  → field is a plain Symbol; we write just the property ID string
 * - 'json'  → field is a JSON Object; we write the full PropertySelectorFieldValue object
 * Defaults to 'json' when not configured.
 */
function getFieldType(sdk: FieldAppSDK | DialogAppSDK): "text" | "json" {
  const instance = (sdk as FieldAppSDK).parameters?.instance as Record<string, unknown> | undefined;
  return instance?.fieldType === "text" ? "text" : "json";
}

function readInitialValue(
  value: unknown,
  fieldType: "text" | "json"
): PropertySelectorFieldValue {
  if (fieldType === "text") {
    // Plain string stored — wrap it into our internal shape
    const id = typeof value === "string" && value.length > 0 ? value : undefined;
    return { version: 1, selectedProperty: id ? { id, name: id, city: "", heroImageUrl: "" } : undefined };
  }
  if (!value || typeof value !== "object") return { version: 1 };
  const v = value as Partial<PropertySelectorFieldValue>;
  return { version: 1, selectedProperty: v.selectedProperty };
}

export default function PropertySelectorField() {
  const sdk = useSDK<FieldAppSDK | DialogAppSDK>();

  const isDialog = sdk.location.is(locations.LOCATION_DIALOG);
  const fieldSdk = isDialog ? null : (sdk as FieldAppSDK);
  const fieldType = isDialog ? "json" : getFieldType(sdk);

  const [fieldValue, setFieldValue] = useState<PropertySelectorFieldValue>(() => {
    if (isDialog) return { version: 1 };
    return readInitialValue(fieldSdk?.field?.getValue(), fieldType);
  });

  const [properties, setProperties] = useState<PmsPropertyItem[]>([]);
  const [loading, setLoading] = useState(isDialog);
  const [error, setError] = useState<string | null>(null);
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(() => {
    if (isDialog) {
      const params = (sdk as DialogAppSDK).parameters?.invocation as any;
      return params?.selectedId || null;
    }
    return null;
  });

  const saveValue = useCallback(
    (newValue: PropertySelectorFieldValue) => {
      setFieldValue(newValue);
      if (fieldSdk?.field) {
        if (fieldType === "text") {
          // Write just the ID string (or null to clear)
          const id = newValue.selectedProperty?.id ?? null;
          fieldSdk.field.setValue(id ?? "");
        } else {
          fieldSdk.field.setValue(newValue);
        }
      }
    },
    [fieldSdk, fieldType]
  );

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk]);

  // Load properties in dialog mode
  useEffect(() => {
    if (!isDialog) return;
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchWithTimeout<{ properties: PmsPropertyItem[] }>(
          "/api/integrations/properties",
          {},
          8000
        );
        if (!result.ok) {
          setError(result.error);
          setProperties([]);
        } else {
          setProperties(result.data.properties);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [isDialog]);

  // When in text mode and we have only an ID (no name/city from prior json),
  // hydrate the display info from the API on mount
  useEffect(() => {
    if (isDialog || fieldType !== "text") return;
    const id = fieldValue.selectedProperty?.id;
    if (!id || fieldValue.selectedProperty?.name !== id) return; // already hydrated or no selection
    fetchWithTimeout<{ property: PmsPropertyItem }>(
      `/api/integrations/properties/${id}`,
      {},
      5000
    ).then((result) => {
      if (result.ok) {
        const p = result.data.property;
        setFieldValue((prev) => ({
          ...prev,
          selectedProperty: { id: p.id, name: p.name, city: p.city, heroImageUrl: p.heroImageUrl },
        }));
      }
    });
  }, [isDialog, fieldType, fieldValue.selectedProperty?.id]);

  const handleOpenDialog = useCallback(async () => {
    const result = await sdk.dialogs.openCurrentApp({
      title: "Select a property",
      width: 1200,
      minHeight: 600,
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      parameters: {
        selectedId: fieldValue.selectedProperty?.id || null,
      },
    });

    if (result && typeof result === "object" && "selectedProperty" in result) {
      const data = result as { selectedProperty: PmsPropertyItem };
      saveValue({ version: 1, selectedProperty: data.selectedProperty });
    }
  }, [sdk, fieldValue, saveValue]);

  const handleDialogConfirm = useCallback(() => {
    if (!isDialog) return;
    const selected = properties.find((p) => p.id === tempSelectedId);
    if (!selected) {
      (sdk as any).close(null);
      return;
    }
    (sdk as any).close({
      selectedProperty: {
        id: selected.id,
        name: selected.name,
        city: selected.city,
        heroImageUrl: selected.heroImageUrl,
      },
    });
  }, [isDialog, sdk, properties, tempSelectedId]);

  const handleDialogCancel = useCallback(() => {
    if (isDialog) (sdk as any).close(null);
  }, [isDialog, sdk]);

  const handleRemove = useCallback(() => {
    saveValue({ version: 1 });
  }, [saveValue]);

  // ── Dialog mode — property grid picker ──
  if (isDialog) {
    return (
      <div className={styles.container} style={{ padding: 24 }}>
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <div>Loading properties...</div>
          </div>
        )}
        {error && (
          <div className={styles.errorState}>
            <div className={styles.errorTitle}>Error Loading Properties</div>
            <div className={styles.errorMessage}>{error}</div>
          </div>
        )}
        {!loading && !error && properties.length === 0 && (
          <div className={styles.noResults}>
            <div className={styles.noResultsIcon}>🏢</div>
            <div className={styles.noResultsText}>No properties found.</div>
          </div>
        )}
        {!loading && !error && properties.length > 0 && (
          <div className={styles.propertyGrid}>
            {properties.map((property) => {
              const isSelected = tempSelectedId === property.id;
              return (
                <div
                  key={property.id}
                  className={`${styles.propertyCard} ${isSelected ? styles.propertyCardSelected : ""}`}
                  onClick={() => setTempSelectedId(isSelected ? null : property.id)}
                >
                  <div className={styles.propertyImageWrapper}>
                    {property.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={property.heroImageUrl} alt={property.name} />
                    ) : (
                      "🏢"
                    )}
                    {isSelected && <div className={styles.selectedBadge}>✓</div>}
                  </div>
                  <div className={styles.propertyCardInfo}>
                    <div className={styles.propertyCardName}>{property.name}</div>
                    <div className={styles.propertyCardCity}>{property.city}</div>
                    <div style={{ fontSize: 11, color: "#b0b8c4", fontFamily: "monospace", marginTop: 2 }}>
                      {property.id}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className={styles.modalFooter} style={{ padding: "16px 0", marginTop: 24 }}>
          <button className={styles.cancelButton} onClick={handleDialogCancel}>
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleDialogConfirm}
            disabled={!tempSelectedId}
          >
            {tempSelectedId ? "Confirm Selection" : "Select a property"}
          </button>
        </div>
      </div>
    );
  }

  // ── Field mode ──
  const selectedProperty = fieldValue.selectedProperty;

  if (selectedProperty) {
    return (
      <div className={styles.container}>
        <div className={styles.selectedPropertyCard}>
          <div className={styles.selectedPropertyImage}>
            {selectedProperty.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedProperty.heroImageUrl} alt={selectedProperty.name} />
            ) : (
              "🏢"
            )}
          </div>
          <div className={styles.selectedPropertyInfo}>
            <div className={styles.selectedPropertyName}>
              {selectedProperty.name !== selectedProperty.id ? selectedProperty.name : ""}
            </div>
            {selectedProperty.city && (
              <div className={styles.selectedPropertyCity}>{selectedProperty.city}</div>
            )}
            <div className={styles.selectedPropertyId}>{selectedProperty.id}</div>
            {fieldType === "text" && (
              <div style={{ fontSize: 11, color: "#8492a6", marginTop: 2 }}>
                Text field — stores ID only
              </div>
            )}
          </div>
          <button className={styles.changeButton} onClick={handleOpenDialog}>
            Change
          </button>
          <button className={styles.removeButton} onClick={handleRemove}>
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏢</div>
        <div className={styles.emptyTitle}>No property selected</div>
        <div className={styles.emptyText}>
          Select a property from your PMS to link to this content.
          {fieldType === "text" && (
            <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#8492a6" }}>
              The property ID will be stored as plain text.
            </span>
          )}
        </div>
        <button className={styles.selectButton} onClick={handleOpenDialog}>
          Select property
        </button>
      </div>
    </div>
  );
}

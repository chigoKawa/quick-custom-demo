"use client";

import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useEffect, useState } from "react";
import { fetchWithTimeout } from "../utils";
import type { Form } from "@/lib/integrations/forms/forms.interface";

export default function FormsSidebar() {
  const sdk = useSDK<SidebarAppSDK>();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sdk.window.startAutoResizer();
    loadForms();
  }, [sdk]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const result = await fetchWithTimeout<{ forms: Form[] }>(
        "/api/integrations/forms?limit=5",
        {},
        5000
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setForms(result.data.forms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, marginBottom: 4 }}>
          📝 Forms Integration
        </h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          Available forms in your library
        </p>
      </div>

      {/* Status */}
      {loading && (
        <div style={{ 
          padding: 16, 
          textAlign: "center", 
          color: "#6b7280",
          fontSize: 13,
        }}>
          Loading forms...
        </div>
      )}

      {error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: "#fef2f2", 
          borderRadius: 6,
          fontSize: 12,
          color: "#dc2626",
        }}>
          {error}
        </div>
      )}

      {/* Forms List */}
      {!loading && !error && (
        <div style={{ display: "grid", gap: 8 }}>
          {forms.map((form) => (
            <div
              key={form.id}
              style={{
                padding: 12,
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
              }}
            >
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
                {form.title}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                {form.fields.length} fields
              </div>
              {form.category && (
                <span style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 10,
                  backgroundColor: "#e5e7eb",
                  color: "#6b7280",
                }}>
                  {form.category}
                </span>
              )}
            </div>
          ))}

          {forms.length === 0 && (
            <div style={{ 
              padding: 16, 
              textAlign: "center", 
              color: "#6b7280",
              fontSize: 13,
            }}>
              No forms available
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && !error && forms.length > 0 && (
        <div style={{ 
          marginTop: 16, 
          paddingTop: 12, 
          borderTop: "1px solid #e5e7eb",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}>
          <div style={{
            padding: 8,
            borderRadius: 6,
            backgroundColor: "#eff6ff",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#3b82f6" }}>
              {forms.length}
            </div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>Forms</div>
          </div>
          <div style={{
            padding: 8,
            borderRadius: 6,
            backgroundColor: "#f0fdf4",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#22c55e" }}>
              {forms.reduce((acc, f) => acc + f.fields.length, 0)}
            </div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>Total Fields</div>
          </div>
        </div>
      )}
    </div>
  );
}

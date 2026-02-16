"use client";

import React from "react";
import type { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";

export default function NewsletterField() {
  const sdk = useSDK<FieldAppSDK>();

  return (
    <div style={{ padding: "8px 0" }}>
      <p style={{ fontSize: 13 }}>
        Newsletter Preview field stub. Current field value:
      </p>
      <pre
        style={{
          marginTop: 4,
          fontSize: 12,
          padding: 8,
          background: "#f7f9fa",
          borderRadius: 4,
          maxHeight: 120,
          overflow: "auto",
        }}
      >
        {JSON.stringify(sdk.field.getValue(), null, 2) || "null"}
      </pre>
    </div>
  );
}

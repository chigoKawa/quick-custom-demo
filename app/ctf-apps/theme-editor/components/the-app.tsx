"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import ThemeEditorField from "../locations/theme-editor-field";

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  let content: React.ReactNode;

  if (sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
    content = <ThemeEditorField />;
  } else {
    content = (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>🎨 Theme Editor</h2>
        <p style={{ fontSize: 13, color: "#666" }}>
          This app runs as a field editor on the <strong>theme</strong> field of the{" "}
          <strong>siteSettings</strong> content type.
        </p>
      </div>
    );
  }

  return <>{content}</>;
}

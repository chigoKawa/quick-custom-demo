"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import ConfigScreen from "../locations/config-screen";
import ContentAnchorField from "../locations/content-anchor-field";

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    return <ConfigScreen />;
  }

  if (sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
    return <ContentAnchorField />;
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Content Anchor</h2>
      <p style={{ fontSize: 13, color: "#536171" }}>
        Mount this app on a JSON Object field (e.g. <code>textAnchor</code>) to enable
        drag-to-position text placement on the hero banner.
      </p>
    </div>
  );
}

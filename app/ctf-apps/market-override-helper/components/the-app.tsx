"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import ConfigScreen from "../locations/config-screen";
import MarketOverrideField from "../locations/market-override-field";
import { APP_NAME } from "../constants";

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    return <ConfigScreen />;
  }

  if (sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
    return <MarketOverrideField />;
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {APP_NAME}
      </h2>
      <p style={{ fontSize: 13, color: "#536171" }}>
        Mount this app on a JSON Object field (e.g. <code>marketOverrides</code>)
        to enable market-specific field overrides. Configure markets and
        content types in the app config screen.
      </p>
    </div>
  );
}

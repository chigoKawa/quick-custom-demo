"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";

import ConfigScreen from "../locations/config-screen";
import FlagRegistryPage from "../locations/flag-registry-page";
import { APP_NAME } from "../constants";

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    return (
      <div style={{ padding: 16 }}>
        <ConfigScreen />
      </div>
    );
  }

  if (sdk.location.is(locations.LOCATION_PAGE)) {
    // Full-screen — the Workbench owns its own chrome, so no padding wrapper.
    return <FlagRegistryPage />;
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{APP_NAME}</h2>
      <p style={{ fontSize: 13, opacity: 0.8 }}>
        This app runs in the App Config and Page locations. Open it from the
        Apps menu in the top navigation.
      </p>
    </div>
  );
}

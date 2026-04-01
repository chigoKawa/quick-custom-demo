"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import { APP_NAME } from "../constants";
import ConfigScreen from "../locations/config-screen";
import PropertySelectorField from "../locations/property-selector-field";
import PmsSidebar from "../locations/pms-sidebar";

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  let content: React.ReactNode;

  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    content = <ConfigScreen />;
  } else if (sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
    content = <PropertySelectorField />;
  } else if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    content = <PmsSidebar />;
  } else if (sdk.location.is(locations.LOCATION_DIALOG)) {
    content = <PropertySelectorField />;
  } else {
    content = (
      <div style={{ padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{APP_NAME}</h2>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          This app is intended to run in the App Config, Entry Field, Entry Sidebar, or Dialog locations.
        </p>
      </div>
    );
  }

  return <div style={{ padding: 16 }}>{content}</div>;
}

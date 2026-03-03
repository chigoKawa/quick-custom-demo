"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import ConfigScreen from "../locations/config-screen";

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  let content: React.ReactNode;

  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    content = <ConfigScreen />;
  } else {
    content = (
      <div style={{ padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Compliance Review</h2>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          This app runs in the background via automations and functions.
        </p>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
          Configure it in the App Config location.
        </p>
      </div>
    );
  }

  return <div style={{ padding: 16 }}>{content}</div>;
}

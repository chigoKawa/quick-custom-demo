"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import ConfigScreen from "../locations/config-screen";
import PageTreeEditor from "../locations/page-tree-editor";
import PageTreeHome from "../locations/page-tree-home";
import PageTreePage from "../locations/page-tree-page";
import PageTreeSidebar from "../locations/page-tree-sidebar";
import ParentPickerDialog from "../locations/parent-picker-dialog";
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

  if (sdk.location.is(locations.LOCATION_HOME)) {
    // Full-width home widget — no outer padding
    return <PageTreeHome />;
  }

  if (sdk.location.is(locations.LOCATION_PAGE)) {
    // Full-screen — no outer padding wrapper
    return <PageTreePage />;
  }

  if (sdk.location.is(locations.LOCATION_ENTRY_EDITOR)) {
    // Full-width editor widget — no outer padding
    return <PageTreeEditor />;
  }

  if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    return (
      <div style={{ padding: 16 }}>
        <PageTreeSidebar />
      </div>
    );
  }

  if (sdk.location.is(locations.LOCATION_DIALOG)) {
    return (
      <div style={{ padding: 16 }}>
        <ParentPickerDialog />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{APP_NAME}</h2>
      <p style={{ fontSize: 13, opacity: 0.8 }}>
        This app is intended to run in the App Config, Entry Sidebar, Page, or Dialog locations.
      </p>
    </div>
  );
}

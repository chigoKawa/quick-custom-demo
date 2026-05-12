"use client";

import React from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import AuctionPickerField from "../locations/auction-picker-field";

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  if (
    sdk.location.is(locations.LOCATION_ENTRY_FIELD) ||
    sdk.location.is(locations.LOCATION_DIALOG)
  ) {
    return <AuctionPickerField />;
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>🎨 Auction Picker</h2>
      <p style={{ fontSize: 13, color: "#536171" }}>
        This app runs on the <code>externalAuctionId</code> field of the <strong>auction</strong> content type.
      </p>
    </div>
  );
}

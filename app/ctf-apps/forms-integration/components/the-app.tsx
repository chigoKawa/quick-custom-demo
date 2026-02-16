"use client";

import { locations } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import ConfigScreen from "../locations/config-screen";
import FormSelectorField from "../locations/form-selector-field";
import FormsSidebar from "../locations/forms-sidebar";

export default function TheApp() {
  const sdk = useSDK();

  let content = <div>Unknown location</div>;

  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    content = <ConfigScreen />;
  } else if (sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
    content = <FormSelectorField />;
  } else if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    content = <FormsSidebar />;
  } else if (sdk.location.is(locations.LOCATION_DIALOG)) {
    content = <FormSelectorField />;
  } else {
    content = (
      <div style={{ padding: 20 }}>
        <h2>Forms Integration</h2>
        <p>This app helps you select and embed forms in your content.</p>
      </div>
    );
  }

  return content;
}

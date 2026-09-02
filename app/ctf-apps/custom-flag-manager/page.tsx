"use client";

import { SDKProvider } from "@contentful/react-apps-toolkit";
import TheApp from "./components/the-app";

export default function Page() {
  return (
    <SDKProvider>
      <TheApp />
    </SDKProvider>
  );
}

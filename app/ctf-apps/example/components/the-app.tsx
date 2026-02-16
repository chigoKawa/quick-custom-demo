"use client";

import React, { useEffect, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import { locations, type AppExtensionSDK } from "@contentful/app-sdk";
import { APP_NAME } from "../constants";
import ConfigScreen from "../locations/config-screen";
import SidebarPreview from "../locations/entry-sidebar/stats-sidebar";
import NewsletterEditor from "../locations/editor/newsletter-editor";
import EmailPreview from "./email-preview";

function DialogPreview({ sdk, params }: { sdk: AppExtensionSDK; params: any }) {
  const [assetsById, setAssetsById] = useState<Record<string, any>>({});

  useEffect(() => {
    const richContent = params.content;
    if (!richContent || typeof richContent !== "object") {
      setAssetsById({});
      return;
    }

    const collectIds = (node: any, acc: Set<string>) => {
      if (!node || typeof node !== "object") return;
      if (node.nodeType === "embedded-asset-block") {
        const id = node.data?.target?.sys?.id;
        if (typeof id === "string") {
          acc.add(id);
        }
      }
      const content = Array.isArray(node.content) ? node.content : [];
      for (const child of content) {
        collectIds(child, acc);
      }
    };

    const ids = new Set<string>();
    collectIds(richContent as any, ids);

    if (ids.size === 0 || !sdk.cma) {
      setAssetsById({});
      return;
    }

    const query = {
      "sys.id[in]": Array.from(ids).join(","),
    } as any;

    let cancelled = false;

    sdk.cma.asset
      .getMany({ query })
      .then((res: any) => {
        if (cancelled || !res || !Array.isArray(res.items)) return;
        const map: Record<string, any> = {};
        for (const item of res.items) {
          const id = item?.sys?.id;
          if (typeof id === "string") {
            map[id] = item;
          }
        }
        setAssetsById(map);
      })
      .catch(() => {
        setAssetsById({});
      });

    return () => {
      cancelled = true;
    };
  }, [sdk.cma, params.content]);

  return (
    <div
      style={{
        minHeight: "60vh",
        maxHeight: "100vh",
        padding: 16,
        boxSizing: "border-box",
        background: "#f3f5f7",
        overflowY: "auto",
      }}
    >
      <EmailPreview
        subject={params.subject || "Newsletter preview"}
        senderName={params.senderName || ""}
        senderEmail={params.senderEmail || ""}
        replyToEmail={params.replyToEmail}
        preheader={params.preheader}
        content={params.content}
        assetsById={assetsById}
        theme={params.theme || "light"}
        viewport={params.viewport || "desktop"}
        clientPreset={
          params.clientPreset === "appleMail" ||
          params.clientPreset === "outlook"
            ? params.clientPreset
            : "gmail"
        }
      />
    </div>
  );
}

export default function TheApp() {
  const sdk = useSDK<AppExtensionSDK>();

  let content: React.ReactNode;

  if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
    content = <ConfigScreen />;
  } else if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    content = <SidebarPreview />;
  } else if (sdk.location.is(locations.LOCATION_ENTRY_EDITOR)) {
    content = <NewsletterEditor />;
  } else if (sdk.location.is(locations.LOCATION_DIALOG)) {
    const params = (sdk.parameters as any)?.invocation || {};
    content = <DialogPreview sdk={sdk} params={params} />;
  } else if (sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
    content = <div>Newsletter Preview field stub.</div>;
  } else {
    content = (
      <div className="p-4">
        <h2 className="text-xl font-semibold">{APP_NAME}</h2>
        <p className="text-sm text-muted-foreground">
          Newsletter Preview app stub. Implementation to be defined.
        </p>
      </div>
    );
  }

  return (
    <div className="flex p-10 flex-col bg-gray-50 m-auto my-auto">
      {content}
    </div>
  );
}

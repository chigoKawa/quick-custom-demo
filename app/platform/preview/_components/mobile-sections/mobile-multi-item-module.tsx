"use client";

import React from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { IMultiItemModule } from "@/features/contentful/type";
import { extractContentfulAssetUrl } from "@/lib/utils";

export default function MobileMultiItemModule(entry: IMultiItemModule) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  if (!entry?.sys?.id || !entry?.fields) return null;
  const title = entry.fields.title as string;
  const subtitle = entry.fields.subtitle as string;
  const items = Array.isArray(entry.fields.items) ? entry.fields.items : [];

  return (
    <section className="w-full py-4">
      <div className="px-4 mb-3">
        {title && (
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-lg font-bold text-foreground"
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Horizontal scroll for items */}
      {items.length > 0 && (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
          {items
            .filter((item: any) => item?.sys?.id)
            .map((item: any, i: number) => {
              const contentTypeId = item?.sys?.contentType?.sys?.id;
              const itemTitle =
                (item?.fields?.headline as string) ||
                (item?.fields?.title as string) ||
                (item?.fields?.name as string) ||
                (item?.fields?.internalName as string) ||
                "";

              // Try to extract an image from common fields
              const imageAsset =
                item?.fields?.heroImage ||
                item?.fields?.image?.fields?.image ||
                item?.fields?.image ||
                item?.fields?.featuredImage;
              const imageUrl = extractContentfulAssetUrl(imageAsset);

              return (
                <div key={item.sys.id || i} className="flex-none w-[70%] snap-start">
                  {imageUrl && (
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-secondary mb-2">
                      <img src={imageUrl} alt={itemTitle} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {!imageUrl && contentTypeId === "logo" && (
                    <div className="aspect-[3/2] rounded-xl overflow-hidden bg-muted flex items-center justify-center mb-2">
                      <span className="text-xs text-muted-foreground">{itemTitle || "Logo"}</span>
                    </div>
                  )}
                  {itemTitle && (
                    <p className="text-sm font-medium text-foreground line-clamp-2">{itemTitle}</p>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}

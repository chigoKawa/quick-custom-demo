"use client";

import React, { useState } from "react";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { baseRichTextOptions } from "@/features/contentful/richtext";
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IAlert } from "@/features/contentful/type";
import MobileButton from "./mobile-button";

const variantStyles: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
  success: "bg-green-50 border-green-200 text-green-900",
  error: "bg-red-50 border-red-200 text-red-900",
  default: "bg-gray-50 border-gray-200 text-gray-900",
};

const variantIcons: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
  default: AlertCircle,
};

export default function MobileAlert(entry: IAlert) {
  const liveEntry = useContentfulLiveUpdates(entry) || entry;
  const [isDismissed, setIsDismissed] = useState(false);
  const inspectorProps = useContentfulInspectorMode({ entryId: liveEntry?.sys?.id ?? "" });

  if (!liveEntry?.sys?.id) return null;
  const title = liveEntry.fields.title;
  const content = liveEntry.fields.content;
  const actionButton = liveEntry.fields.actionButton;
  const variant = (liveEntry.fields.variant as string) || "info";
  const dismissible = liveEntry.fields.dismissible ?? false;
  const showIcon = liveEntry.fields.showIcon ?? true;
  const Icon = variantIcons[variant] || variantIcons.default;

  if (isDismissed) return null;

  return (
    <div
      className={cn("relative border rounded-lg p-3 mx-4 my-3", variantStyles[variant] || variantStyles.default)}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        {showIcon && (
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-4 w-4" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <div
              {...inspectorProps({ fieldId: "title" })}
              className="font-semibold text-sm mb-0.5"
            >
              {title}
            </div>
          )}

          <div
            {...inspectorProps({ fieldId: "content" })}
            className="text-xs [&>p]:mb-1.5 [&>p:last-child]:mb-0"
          >
            {documentToReactComponents(content, baseRichTextOptions)}
          </div>

          {actionButton && (
            <div className="mt-2">
              <MobileButton button={actionButton} />
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

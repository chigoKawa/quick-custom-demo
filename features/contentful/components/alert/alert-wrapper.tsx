"use client";

import React, { useState } from "react";
import { IAlert } from "../../type";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { baseRichTextOptions } from "../../richtext";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import BaseButtonWrapper from "../base-button/base-button-wrapper";

const variantStyles = {
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
  success: "bg-green-50 border-green-200 text-green-900",
  error: "bg-red-50 border-red-200 text-red-900",
  default: "bg-gray-50 border-gray-200 text-gray-900",
};

const variantIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
  default: AlertCircle,
};

const AlertWrapper = (entry: IAlert) => {
  const liveEntry = useContentfulLiveUpdates(entry);
  const inspectorProps = useContentfulInspectorMode({ entryId: liveEntry.sys.id });
  const [isDismissed, setIsDismissed] = useState(false);

  const title = liveEntry.fields.title;
  const content = liveEntry.fields.content;
  const actionButton = liveEntry.fields.actionButton;
  const variant = (liveEntry.fields.variant as keyof typeof variantStyles) || "info";
  const dismissible = liveEntry.fields.dismissible ?? false;
  const showIcon = liveEntry.fields.showIcon ?? true;

  const Icon = variantIcons[variant];

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        "relative border rounded-lg p-4 my-4",
        variantStyles[variant]
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-5 w-5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <div
              {...inspectorProps({ fieldId: "title" })}
              className="font-semibold mb-1"
            >
              {title}
            </div>
          )}

          <div
            {...inspectorProps({ fieldId: "content" })}
            className="text-sm [&>p]:mb-2 [&>p:last-child]:mb-0"
          >
            {documentToReactComponents(content, baseRichTextOptions)}
          </div>

          {actionButton && (
            <div className="mt-3">
              <BaseButtonWrapper {...actionButton} />
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertWrapper;

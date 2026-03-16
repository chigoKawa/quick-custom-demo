"use client";

import React from "react";
import { AlertCircle, ArrowRight } from "lucide-react";

type Props = {
  type: "missing-params" | "unsupported-type" | "not-found";
  details?: {
    type?: string;
    entryId?: string;
    slug?: string;
    supportedTypes?: string[];
  };
};

export default function PreviewErrorState({ type, details }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-neutral-50">
      <AlertCircle className="h-10 w-10 text-neutral-400 mb-4" />

      {type === "missing-params" && (
        <>
          <h2 className="text-base font-semibold text-neutral-800 mb-2">
            Missing preview parameters
          </h2>
          <p className="text-sm text-neutral-500 mb-4 max-w-xs">
            Pass a <code className="px-1 py-0.5 bg-neutral-200 rounded text-xs font-mono">type</code> and
            either <code className="px-1 py-0.5 bg-neutral-200 rounded text-xs font-mono">entryId</code> or{" "}
            <code className="px-1 py-0.5 bg-neutral-200 rounded text-xs font-mono">slug</code> query
            parameter.
          </p>
          <div className="bg-white border rounded-lg p-3 text-left text-xs font-mono text-neutral-600 max-w-xs w-full">
            <p className="text-neutral-400 mb-1">Example:</p>
            <p className="break-all">
              /platform/preview/mobile
              <br />
              ?type=landingPage
              <br />
              &entryId=abc123
              <br />
              &locale=en-US
            </p>
          </div>
        </>
      )}

      {type === "unsupported-type" && (
        <>
          <h2 className="text-base font-semibold text-neutral-800 mb-2">
            Unsupported content type
          </h2>
          <p className="text-sm text-neutral-500 mb-4 max-w-xs">
            <code className="px-1 py-0.5 bg-neutral-200 rounded text-xs font-mono">
              {details?.type || "unknown"}
            </code>{" "}
            is not supported for mobile preview yet.
          </p>
          {details?.supportedTypes && details.supportedTypes.length > 0 && (
            <div className="bg-white border rounded-lg p-3 text-left text-xs max-w-xs w-full">
              <p className="text-neutral-400 mb-1.5 font-medium">Supported types:</p>
              <ul className="space-y-1">
                {details.supportedTypes.map((t) => (
                  <li key={t} className="flex items-center gap-1.5 text-neutral-600">
                    <ArrowRight className="h-3 w-3 text-neutral-400" />
                    <code className="font-mono">{t}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {type === "not-found" && (
        <>
          <h2 className="text-base font-semibold text-neutral-800 mb-2">
            Entry not found
          </h2>
          <p className="text-sm text-neutral-500 mb-4 max-w-xs">
            No entry was found for the given parameters. It may be unpublished or the ID/slug may be incorrect.
          </p>
          <div className="bg-white border rounded-lg p-3 text-left text-xs font-mono text-neutral-500 max-w-xs w-full space-y-1">
            {details?.type && <p>type: {details.type}</p>}
            {details?.entryId && <p>entryId: {details.entryId}</p>}
            {details?.slug && <p>slug: {details.slug}</p>}
          </div>
        </>
      )}
    </div>
  );
}

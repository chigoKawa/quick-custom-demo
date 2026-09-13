"use client";

import React, { useState } from "react";
import { Globe, RotateCcw, Lock } from "lucide-react";
import ChannelSwitcher from "./channel-switcher";
import EnsurePreviewParam from "./ensure-preview-param";

type ViewportConfig = {
  name: string;
  width: number;
  /** Label shown in the selector. */
  native: string;
};

/**
 * Desktop/tablet widths. The frame scales content down rather than resizing the
 * window, so a 1440px layout stays readable inside the harness.
 */
const VIEWPORTS: Record<string, ViewportConfig> = {
  desktop: { name: "Desktop", width: 1440, native: "1440px" },
  laptop: { name: "Laptop", width: 1280, native: "1280px" },
  tablet: { name: "Tablet", width: 834, native: "834px" },
};

type Props = {
  children: React.ReactNode;
  title?: string;
  contentTypeId?: string;
  previewType?: string;
  entryId?: string;
  slug?: string;
  locale?: string;
  /** Shown in the fake address bar. */
  path?: string;
};

/**
 * Web preview chrome: a browser window mockup.
 *
 * Exists so the web channel stays inside the harness — previously "Web" linked
 * out to the live route, which meant losing the channel switcher and any way
 * back. The page content is the real campaign component, rendered at a chosen
 * desktop width and scaled to fit.
 */
export default function WebPreviewShell({
  children,
  title,
  contentTypeId,
  previewType,
  entryId,
  slug,
  locale = "en-US",
  path,
}: Props) {
  const [viewportKey, setViewportKey] = useState<string>("desktop");
  const viewport = VIEWPORTS[viewportKey];

  // Scale the fixed-width page down to the available frame area.
  const [scale, setScale] = useState(1);
  const frameRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const available = el.clientWidth;
      setScale(available > 0 ? Math.min(1, available / viewport.width) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewport.width]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-900">
      <EnsurePreviewParam />
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-700 bg-neutral-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-neutral-400" />
          <div>
            <h1 className="text-sm font-semibold text-white">Web Preview</h1>
            {title && (
              <p className="mt-0.5 text-xs text-neutral-400">
                {title}
                {contentTypeId && (
                  <span className="ml-2 rounded bg-neutral-700 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
                    {contentTypeId}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ChannelSwitcher
            channel="web"
            type={previewType}
            entryId={entryId}
            slug={slug}
            locale={locale}
          />

          <select
            value={viewportKey}
            onChange={(e) => setViewportKey(e.target.value)}
            className="rounded border border-neutral-600 bg-neutral-700 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Viewport width"
          >
            {Object.entries(VIEWPORTS).map(([key, v]) => (
              <option key={key} value={key}>
                {v.name} ({v.native})
              </option>
            ))}
          </select>

          <button
            onClick={() => window.location.reload()}
            className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
            title="Reload"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Browser window */}
      <div className="flex flex-1 justify-center overflow-hidden p-6">
        <div className="flex w-full max-w-[1500px] flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800 shadow-2xl">
          {/* Title bar */}
          <div className="flex shrink-0 items-center gap-3 border-b border-neutral-700 bg-neutral-800 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>

            {/* Address bar */}
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5">
              <Lock className="h-3 w-3 shrink-0 text-neutral-500" />
              <span className="truncate font-mono text-[11px] text-neutral-400">
                {path || "/"}
              </span>
            </div>

            <span className="shrink-0 font-mono text-[10px] text-neutral-600">
              {viewport.native}
              {scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""}
            </span>
          </div>

          {/* Viewport — the real page at a fixed width, scaled to fit */}
          <div ref={frameRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
            <div
              style={{
                width: viewport.width,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                // Reclaim the space the transform visually frees, so the
                // scroll height matches what the viewer sees.
                marginBottom: scale < 1 ? `-${(1 - scale) * 100}%` : undefined,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

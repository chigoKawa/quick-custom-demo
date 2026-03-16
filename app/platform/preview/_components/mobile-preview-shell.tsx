"use client";

import React, { useState } from "react";
import { Smartphone, RotateCcw } from "lucide-react";

type DeviceConfig = {
  name: string;
  width: number;
  height: number;
  notchWidth: number;
  cornerRadius: number;
};

const DEVICES: Record<string, DeviceConfig> = {
  "iphone-15": {
    name: "iPhone 15",
    width: 393,
    height: 852,
    notchWidth: 126,
    cornerRadius: 50,
  },
  "iphone-se": {
    name: "iPhone SE",
    width: 375,
    height: 667,
    notchWidth: 0,
    cornerRadius: 40,
  },
  "iphone-15-pro-max": {
    name: "iPhone 15 Pro Max",
    width: 430,
    height: 932,
    notchWidth: 126,
    cornerRadius: 55,
  },
};

type Props = {
  children: React.ReactNode;
  title?: string;
  contentTypeId?: string;
};

export default function MobilePreviewShell({ children, title, contentTypeId }: Props) {
  const [deviceKey, setDeviceKey] = useState<string>("iphone-15");
  const device = DEVICES[deviceKey];

  // Scale the device to fit viewport height
  const BEZEL = 16;
  const FRAME_WIDTH = device.width + BEZEL * 2;
  const FRAME_HEIGHT = device.height + BEZEL * 2;

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-neutral-400" />
          <div>
            <h1 className="text-sm font-semibold text-white">
              Mobile Preview
            </h1>
            {title && (
              <p className="text-xs text-neutral-400 mt-0.5">
                {title}
                {contentTypeId && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300 text-[10px] font-mono">
                    {contentTypeId}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device selector */}
          <select
            value={deviceKey}
            onChange={(e) => setDeviceKey(e.target.value)}
            className="bg-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5 border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(DEVICES).map(([key, d]) => (
              <option key={key} value={key}>
                {d.name} ({d.width}×{d.height})
              </option>
            ))}
          </select>

          {/* Reload */}
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            title="Reload"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Device frame container */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div
          className="relative shrink-0"
          style={{
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            maxHeight: "calc(100vh - 80px)",
          }}
        >
          {/* Outer frame (bezel) */}
          <div
            className="absolute inset-0 bg-neutral-950 shadow-2xl"
            style={{
              borderRadius: device.cornerRadius + 4,
              border: "2px solid #444",
            }}
          />

          {/* Inner screen area */}
          <div
            className="absolute bg-white overflow-hidden"
            style={{
              top: BEZEL,
              left: BEZEL,
              right: BEZEL,
              bottom: BEZEL,
              borderRadius: device.cornerRadius - 4,
            }}
          >
            {/* Status bar */}
            <div
              className="relative flex items-center justify-between px-6 bg-white z-10"
              style={{ height: 54 }}
            >
              {/* Time */}
              <span className="text-sm font-semibold text-black">
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>

              {/* Dynamic Island / Notch */}
              {device.notchWidth > 0 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-2 bg-black rounded-full"
                  style={{
                    width: device.notchWidth,
                    height: 34,
                    borderRadius: 20,
                  }}
                />
              )}

              {/* Status icons */}
              <div className="flex items-center gap-1.5">
                {/* Signal bars */}
                <svg width="16" height="12" viewBox="0 0 16 12" className="text-black">
                  <rect x="0" y="8" width="3" height="4" fill="currentColor" rx="0.5" />
                  <rect x="4" y="5" width="3" height="7" fill="currentColor" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" fill="currentColor" rx="0.5" />
                  <rect x="12" y="0" width="3" height="12" fill="currentColor" rx="0.5" />
                </svg>
                {/* WiFi */}
                <svg width="14" height="12" viewBox="0 0 14 12" className="text-black">
                  <path d="M7 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="currentColor" />
                  <path d="M3.5 8.5a5 5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M1 5.5a8.5 8.5 0 0 1 12 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                {/* Battery */}
                <svg width="24" height="12" viewBox="0 0 24 12" className="text-black">
                  <rect x="0" y="1" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
                  <rect x="2" y="3" width="16" height="6" rx="1" fill="currentColor" />
                  <rect x="21" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Scrollable content area */}
            <div
              className="overflow-y-auto overflow-x-hidden"
              style={{
                height: `calc(100% - 54px - 34px)`,
              }}
            >
              {children}
            </div>

            {/* Home indicator */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-white"
              style={{ height: 34 }}
            >
              <div
                className="bg-black rounded-full opacity-20"
                style={{ width: 134, height: 5 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

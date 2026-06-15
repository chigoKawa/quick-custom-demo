"use client";

import React, { useState } from "react";
import { Home, HelpCircle, MessageCircle, Smartphone, RotateCcw } from "lucide-react";
import SupportHome from "./support-home";
import HelpContact from "./help-contact";
import ChatsCases from "./chats-cases";

type Tab = "home" | "help" | "chats";

type DeviceConfig = {
  name: string;
  width: number;
  height: number;
  notchWidth: number;
  cornerRadius: number;
};

const DEVICES: Record<string, DeviceConfig> = {
  "iphone-15": { name: "iPhone 15", width: 393, height: 852, notchWidth: 126, cornerRadius: 50 },
  "iphone-se": { name: "iPhone SE", width: 375, height: 667, notchWidth: 0, cornerRadius: 40 },
  "iphone-15-pro-max": { name: "iPhone 15 Pro Max", width: 430, height: 932, notchWidth: 126, cornerRadius: 55 },
};

interface KbCategory {
  sys: { id: string };
  fields: { name?: string; slug?: string; description?: string };
}

export type MicrocopyMap = Record<string, { value: string; entryId: string }>;

interface Props {
  microcopy: MicrocopyMap;
  kbCategories: KbCategory[];
  isPreview: boolean;
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Live
    </span>
  );
}

export default function AppShell({ microcopy, kbCategories, isPreview }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [deviceKey, setDeviceKey] = useState("iphone-15");
  const device = DEVICES[deviceKey];

  const BEZEL = 16;
  const FRAME_WIDTH = device.width + BEZEL * 2;
  const FRAME_HEIGHT = device.height + BEZEL * 2;

  const TAB_HEIGHT = 56;
  const STATUS_HEIGHT = 54;
  const HOME_INDICATOR = 34;

  const tabs: { key: Tab; icon: React.ReactNode; labelKey: string; fallback: string }[] = [
    { key: "home", icon: <Home className="h-5 w-5" />, labelKey: "app.tab.home", fallback: "Home" },
    { key: "help", icon: <HelpCircle className="h-5 w-5" />, labelKey: "app.tab.help", fallback: "Help" },
    { key: "chats", icon: <MessageCircle className="h-5 w-5" />, labelKey: "app.tab.chats", fallback: "Chats" },
  ];

  const mc = (key: string, fallback = "") => microcopy[key]?.value ?? fallback;

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-neutral-400" />
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              Rebell App
              {isPreview && <LiveBadge />}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Content from Contentful · rebel environment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={deviceKey}
            onChange={(e) => setDeviceKey(e.target.value)}
            className="bg-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5 border border-neutral-600 focus:outline-none"
          >
            {Object.entries(DEVICES).map(([key, d]) => (
              <option key={key} value={key}>
                {d.name} ({d.width}×{d.height})
              </option>
            ))}
          </select>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            title="Reload"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Device frame */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div
          className="relative shrink-0"
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, maxHeight: "calc(100vh - 80px)" }}
        >
          {/* Bezel */}
          <div
            className="absolute inset-0 bg-neutral-950 shadow-2xl"
            style={{ borderRadius: device.cornerRadius + 4, border: "2px solid #444" }}
          />

          {/* Screen */}
          <div
            className="absolute bg-white overflow-hidden flex flex-col"
            style={{
              top: BEZEL, left: BEZEL, right: BEZEL, bottom: BEZEL,
              borderRadius: device.cornerRadius - 4,
            }}
          >
            {/* Status bar */}
            <div
              className="relative flex items-center justify-between px-6 bg-white z-10 shrink-0"
              style={{ height: STATUS_HEIGHT }}
            >
              <span className="text-sm font-semibold text-black">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              {device.notchWidth > 0 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-2 bg-black rounded-full"
                  style={{ width: device.notchWidth, height: 34, borderRadius: 20 }}
                />
              )}
              <div className="flex items-center gap-1.5">
                <svg width="16" height="12" viewBox="0 0 16 12" className="text-black">
                  <rect x="0" y="8" width="3" height="4" fill="currentColor" rx="0.5" />
                  <rect x="4" y="5" width="3" height="7" fill="currentColor" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" fill="currentColor" rx="0.5" />
                  <rect x="12" y="0" width="3" height="12" fill="currentColor" rx="0.5" />
                </svg>
                <svg width="14" height="12" viewBox="0 0 14 12" className="text-black">
                  <path d="M7 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="currentColor" />
                  <path d="M3.5 8.5a5 5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M1 5.5a8.5 8.5 0 0 1 12 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                <svg width="24" height="12" viewBox="0 0 24 12" className="text-black">
                  <rect x="0" y="1" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
                  <rect x="2" y="3" width="16" height="6" rx="1" fill="currentColor" />
                  <rect x="21" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Scrollable screen content */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ height: `calc(100% - ${STATUS_HEIGHT}px - ${TAB_HEIGHT}px - ${HOME_INDICATOR}px)` }}
            >
              {activeTab === "home" && <SupportHome microcopy={microcopy} />}
              {activeTab === "help" && <HelpContact microcopy={microcopy} kbCategories={kbCategories} />}
              {activeTab === "chats" && <ChatsCases microcopy={microcopy} />}
            </div>

            {/* Tab bar */}
            <div
              className="shrink-0 flex bg-white border-t border-gray-100"
              style={{ height: TAB_HEIGHT }}
            >
              {tabs.map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
                    style={{ color: active ? "#2D0A31" : "#9CA3AF" }}
                  >
                    {t.icon}
                    <span className="text-[10px] font-medium">{mc(t.labelKey, t.fallback)}</span>
                    {active && (
                      <span
                        className="absolute bottom-[34px] w-4 h-0.5 rounded-full"
                        style={{ background: "#FF4D6D" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Home indicator */}
            <div
              className="shrink-0 flex items-center justify-center bg-white"
              style={{ height: HOME_INDICATOR }}
            >
              <div className="bg-black rounded-full opacity-20" style={{ width: 134, height: 5 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

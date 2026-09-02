"use client";

import React, { useState } from "react";
import {
  Home,
  HelpCircle,
  MessageCircle,
  Smartphone,
  RotateCcw,
  CreditCard,
  Wallet,
  TrendingUp,
  PiggyBank,
  Settings,
  Bell,
  Search,
  QrCode,
  User,
} from "lucide-react";
import type { SerializedScreen } from "../_lib/serialize";
import type { SiteTheme } from "@/lib/theme";
import LiveScreenContent from "./live-screen-content";
import LiveFlagBar from "./live-flag-bar";
import { AppThemeProvider, useAppTheme } from "./theme-context";
import {
  useLiveEntry,
  useLiveLinkedId,
  useLiveLinkedIds,
  useLiveFieldValue,
  useMicrocopyValue,
} from "./entries-context";

const NAV_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="h-5 w-5" />,
  help: <HelpCircle className="h-5 w-5" />,
  chat: <MessageCircle className="h-5 w-5" />,
  wallet: <Wallet className="h-5 w-5" />,
  card: <CreditCard className="h-5 w-5" />,
  user: <User className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
  "piggy-bank": <PiggyBank className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  bell: <Bell className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
  "qr-code": <QrCode className="h-5 w-5" />,
};

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

interface Props {
  // A static list of every appScreen on the server fetch — used to derive the
  // tab list (when no `navigation` is set on the screen) and to look up
  // screenKey → entry id. Field-level edits don't flow through this prop;
  // they're picked up via per-entry live subscription inside child components.
  screens: SerializedScreen[];
  isPreview: boolean;
  initialScreenKey?: string;
  theme: SiteTheme | null;
  brandName?: string;
  logoUrl?: string;
  locale: string;
  availableLocales: string[];
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Live
    </span>
  );
}

export default function AppShell(props: Props) {
  return (
    <AppThemeProvider theme={props.theme}>
      <AppShellInner {...props} />
    </AppThemeProvider>
  );
}

function AppShellInner({
  screens,
  isPreview,
  initialScreenKey,
  brandName,
  logoUrl,
  locale,
  availableLocales,
}: Props) {
  const theme = useAppTheme();

  function changeLocale(next: string) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next === "en-US") url.searchParams.delete("locale");
    else url.searchParams.set("locale", next);
    window.location.assign(url.toString());
  }

  const defaultKey =
    (initialScreenKey && screens.some((s) => s.screenKey === initialScreenKey)
      ? initialScreenKey
      : undefined) ??
    screens.find((s) => s.screenKey === "home")?.screenKey ??
    screens[0]?.screenKey ??
    "home";
  const [activeKey, setActiveKey] = useState(defaultKey);
  const [deviceKey, setDeviceKey] = useState("iphone-15");
  const device = DEVICES[deviceKey];

  const BEZEL = 16;
  const FRAME_WIDTH = device.width + BEZEL * 2;
  const FRAME_HEIGHT = device.height + BEZEL * 2;

  const TAB_HEIGHT = 64;
  const STATUS_HEIGHT = 54;
  const HOME_INDICATOR = 34;

  const activeScreen = screens.find((s) => s.screenKey === activeKey) ?? screens[0];

  const displayName = brandName ?? "App preview";

  if (!activeScreen) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">No app screens found</h1>
          <p className="text-sm text-neutral-400">
            Publish at least one <code className="bg-neutral-800 px-1.5 py-0.5 rounded">appScreen</code> entry with
            a unique <code>screenKey</code> in Contentful. The preview mock reads from the configured environment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={displayName} className="h-6 w-auto max-w-[120px] object-contain" />
          ) : (
            <Smartphone className="h-5 w-5 text-neutral-400" />
          )}
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              {displayName}
              {isPreview && <LiveBadge />}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Composed from Contentful app screens, modules &amp; widgets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availableLocales.length > 1 && (
            <select
              value={locale}
              onChange={(e) => changeLocale(e.target.value)}
              className="bg-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5 border border-neutral-600 focus:outline-none"
              title="Locale"
            >
              {availableLocales.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
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
            title="Reload to see latest content"
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
            className="absolute overflow-hidden flex flex-col"
            style={{
              top: BEZEL,
              left: BEZEL,
              right: BEZEL,
              bottom: BEZEL,
              borderRadius: device.cornerRadius - 4,
              background: theme.background,
            }}
          >
            {/* Status bar */}
            <div
              className="relative flex items-center justify-between px-6 z-10 shrink-0"
              style={{ height: STATUS_HEIGHT, background: theme.surface }}
            >
              <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              {device.notchWidth > 0 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-2 bg-black rounded-full"
                  style={{ width: device.notchWidth, height: 34, borderRadius: 20 }}
                />
              )}
              <div className="flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                <svg width="16" height="12" viewBox="0 0 16 12">
                  <rect x="0" y="8" width="3" height="4" fill="currentColor" rx="0.5" />
                  <rect x="4" y="5" width="3" height="7" fill="currentColor" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" fill="currentColor" rx="0.5" />
                  <rect x="12" y="0" width="3" height="12" fill="currentColor" rx="0.5" />
                </svg>
                <svg width="24" height="12" viewBox="0 0 24 12">
                  <rect x="0" y="1" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
                  <rect x="2" y="3" width="16" height="6" rx="1" fill="currentColor" />
                  <rect x="21" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Flag bar — renders any enabled appFlags for the active screen. */}
            <LiveFlagBar screenId={activeScreen.sys.id} />

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{
                // Flag bars are inserted ABOVE this region. We keep this region's
                // height bounded against the status + tab + indicator heights so
                // it grows / shrinks if flags appear or disappear.
                minHeight: 0,
              }}
            >
              <LiveScreenContent screenId={activeScreen.sys.id} />
            </div>

            {/* Tab bar */}
            <LiveTabBar
              screenId={activeScreen.sys.id}
              screens={screens}
              activeKey={activeKey}
              onChange={setActiveKey}
              tabHeight={TAB_HEIGHT}
            />

            {/* Home indicator */}
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ height: HOME_INDICATOR, background: theme.surface }}
            >
              <div className="bg-black rounded-full opacity-20" style={{ width: 134, height: 5 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tab bar — subscribes to the active screen's navigation entry so that
// reordering / renaming nav items propagates live.
// ============================================================

function LiveTabBar({
  screenId,
  screens,
  activeKey,
  onChange,
  tabHeight,
}: {
  screenId: string;
  screens: SerializedScreen[];
  activeKey: string;
  onChange: (key: string) => void;
  tabHeight: number;
}) {
  const theme = useAppTheme();
  const navId = useLiveLinkedId(screenId, "navigation");
  const itemIds = useLiveLinkedIds(navId ?? "", "items");

  return (
    <div
      className="shrink-0 flex border-t"
      style={{ height: tabHeight, background: theme.surface, borderColor: theme.borderSubtle }}
    >
      {itemIds.map((id) => (
        <LiveTabButton
          key={id}
          navItemId={id}
          screens={screens}
          activeKey={activeKey}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function LiveTabButton({
  navItemId,
  screens,
  activeKey,
  onChange,
}: {
  navItemId: string;
  screens: SerializedScreen[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  const theme = useAppTheme();
  const item = useLiveEntry(navItemId);
  const targetScreenId = useLiveLinkedId(navItemId, "screen");
  const labelMicrocopyId = useLiveLinkedId(navItemId, "labelMicrocopy");
  const microcopyEntry = useLiveEntry(labelMicrocopyId);
  const fallbackLabel = useLiveFieldValue<string>(navItemId, "fallbackLabel") ?? "";
  const iconKey = useLiveFieldValue<string>(navItemId, "icon");
  const label = (microcopyEntry?.fields?.value as string | undefined) || fallbackLabel;

  // Match nav item to its destination screenKey via the static screens list.
  const targetScreenKey = screens.find((s) => s.sys.id === targetScreenId)?.screenKey;
  if (!item || !targetScreenKey) return null;

  const active = activeKey === targetScreenKey;
  const icon = iconKey ? NAV_ICONS[iconKey] : null;

  return (
    <button
      onClick={() => onChange(targetScreenKey)}
      className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative"
      style={{ color: active ? theme.primary : theme.textMuted }}
    >
      {icon ?? <Home className="h-5 w-5" />}
      <span className="text-[10px] font-medium">{label}</span>
      {active && (
        <span
          className="absolute top-1 w-8 h-0.5 rounded-full"
          style={{ background: theme.primary }}
        />
      )}
    </button>
  );
}

// Suppress unused-import lint for hook only used via JSX
void useMicrocopyValue;

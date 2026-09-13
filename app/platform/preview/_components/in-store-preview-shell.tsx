"use client";

import React, { useState } from "react";
import { Monitor, RotateCcw } from "lucide-react";
import ChannelSwitcher from "./channel-switcher";
import EnsurePreviewParam from "./ensure-preview-param";
import { ScreenOrientationContext } from "./screen-orientation-context";

type ScreenConfig = {
  name: string;
  width: number;
  height: number;
  /** Native resolution, shown in the selector. */
  native: string;
  portrait?: boolean;
};

/**
 * In-store screen formats, scaled down from native resolution to fit a laptop
 * viewport. 16:9 leads because it is the standard for retail promo displays and
 * for viewing at distance; 21:9 covers above-shelf gantry strips; 9:16 covers
 * portrait totems and kiosks.
 */
const SCREENS: Record<string, ScreenConfig> = {
  "landscape-16-9": { name: "In-store display", width: 880, height: 495, native: "1920×1080" },
  "ultrawide-21-9": { name: "Gantry strip", width: 940, height: 403, native: "2560×1080" },
  "portrait-9-16": {
    name: "Portrait totem",
    width: 415,
    height: 738,
    native: "1080×1920",
    portrait: true,
  },
};

type Props = {
  children: React.ReactNode;
  title?: string;
  contentTypeId?: string;
  /** Params forwarded to the channel switcher. */
  previewType?: string;
  entryId?: string;
  slug?: string;
  locale?: string;
};

/**
 * In-store preview chrome: a portrait retail display in a slim bezel.
 *
 * Deliberately unlike the phone frame in mobile-preview-shell.tsx — no notch,
 * no status bar, no home indicator — so the two channels are instantly
 * distinguishable in a demo. The toolbar mirrors that shell's structure and
 * neutral-* palette, because this is tooling chrome, not site content; the
 * screen contents use design tokens.
 */
export default function InStorePreviewShell({
  children,
  title,
  contentTypeId,
  previewType,
  entryId,
  slug,
  locale = "en-US",
}: Props) {
  const [screenKey, setScreenKey] = useState<string>("landscape-16-9");
  const screen = SCREENS[screenKey];
  const portrait = Boolean(screen.portrait);

  const BEZEL = 14;
  const FRAME_WIDTH = screen.width + BEZEL * 2;
  const FRAME_HEIGHT = screen.height + BEZEL * 2;
  // A square large enough to cover the frame at any rotation.
  const FRAME_DIAGONAL = Math.ceil(Math.hypot(FRAME_WIDTH, FRAME_HEIGHT));

  return (
    <div className="flex min-h-screen flex-col bg-neutral-900">
      <EnsurePreviewParam />
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-700 bg-neutral-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-neutral-400" />
          <div>
            <h1 className="text-sm font-semibold text-white">In-store Preview</h1>
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
            channel="in-store"
            type={previewType}
            entryId={entryId}
            slug={slug}
            locale={locale}
          />

          <select
            value={screenKey}
            onChange={(e) => setScreenKey(e.target.value)}
            className="rounded border border-neutral-600 bg-neutral-700 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Screen size"
          >
            {Object.entries(SCREENS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.name} ({s.native})
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

      {/* Screen frame, staged in a room-like space so it reads as a mounted
          retail panel rather than a handheld device. */}
      <div className="relative flex flex-1 items-center justify-center overflow-auto p-10">
        {/* Room: a lit wall above, a distinctly lighter floor plane below, with
            the horizon behind the stand. Gives the unit something to stand on
            instead of floating in a void. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Wall wash behind the panel */}
          <div
            className="absolute inset-x-0 top-0 h-[62%]"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 50% 30%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0) 70%)",
            }}
          />
          {/* Floor */}
          <div
            className="absolute inset-x-0 bottom-0 h-[38%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 40%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          {/* Horizon line where floor meets wall */}
          <div
            className="absolute inset-x-0"
            style={{ bottom: "38%", height: 1, background: "rgba(255,255,255,0.09)" }}
          />
        </div>

        <div className="relative flex flex-col items-center">
          <div
            className="relative shrink-0"
            style={{
              width: FRAME_WIDTH,
              height: FRAME_HEIGHT,
              maxWidth: "calc(100vw - 96px)",
              // Leaves room for the toolbar, the stand (neck + plinth +
              // reflection) and the scale caption beneath it.
              maxHeight: "calc(100vh - 250px)",
            }}
          >
            {/* Chunky industrial bezel — commercial panels are heavier than
                consumer devices, and the weight is what distinguishes this
                from the phone frame at a glance. */}
            <div
              className="absolute inset-0 bg-neutral-900"
              style={{
                borderRadius: 6,
                boxShadow:
                  "0 0 0 1px #52525b, 0 20px 45px -10px rgba(0,0,0,0.9), 0 0 90px -20px rgba(0,0,0,0.8)",
              }}
            />

            {/* Travelling bezel light — the "screen is live" cue.
                A conic-gradient layer rotates behind the panel; the panel is
                opaque and inset, so only the bezel ring is lit. The ring is thin
                (BEZEL px), so the highlight has to be bright and wide to read at
                all — a subtle one is simply invisible here. Sits slightly OUTSIDE
                the frame too, so the glow spills onto the wall like real signage.
                Transform-only, so it stays on the compositor. */}
            <div
              className="pointer-events-none absolute overflow-hidden"
              style={{ inset: -10, borderRadius: 12 }}
              aria-hidden="true"
            >
              <div
                className="signage-bezel-sweep absolute"
                style={{
                  // Over-sized and centred so rotation never exposes a corner.
                  top: "50%",
                  left: "50%",
                  width: FRAME_DIAGONAL,
                  height: FRAME_DIAGONAL,
                  marginTop: -FRAME_DIAGONAL / 2,
                  marginLeft: -FRAME_DIAGONAL / 2,
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 250deg, rgba(56,189,248,0.25) 300deg, rgba(125,211,252,0.95) 342deg, rgba(56,189,248,0.25) 356deg, transparent 360deg)",
                  filter: "blur(6px)",
                }}
              />
            </div>

            {/* Panel */}
            <div
              className="absolute overflow-hidden bg-neutral-950"
              style={{
                top: BEZEL,
                left: BEZEL,
                right: BEZEL,
                bottom: BEZEL,
                borderRadius: 2,
              }}
            >
              {/* Orientation travels by context so the signage layout can pick
                  its composition without a function crossing the RSC boundary. */}
              <ScreenOrientationContext.Provider value={{ portrait }}>
                <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
              </ScreenOrientationContext.Provider>
            </div>

            {/* Static glass gradient across the panel face */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent"
              style={{ borderRadius: 6 }}
              aria-hidden="true"
            />

            {/* Drifting reflection over the glass — the cue that reads as
                "screen is on". Clipped to the panel area so it never spills
                onto the bezel. */}
            <div
              className="pointer-events-none absolute overflow-hidden"
              style={{
                top: BEZEL,
                left: BEZEL,
                right: BEZEL,
                bottom: BEZEL,
                borderRadius: 2,
              }}
              aria-hidden="true"
            >
              <div
                className="signage-sheen absolute inset-y-0"
                style={{
                  // Wide and very low-contrast, with a blur, so no edge of the
                  // gradient is ever perceptible as a rectangle.
                  width: "70%",
                  filter: "blur(28px)",
                  background:
                    "linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0) 100%)",
                }}
              />
            </div>
          </div>

          {/* Floor-standing totem mount: a short neck into a wide, flat plinth,
              like a retail freestanding display unit. Portrait gets a taller
              neck (the panel sits at eye height on a column); landscape sits
              lower on the same plinth. */}
          <div className="flex flex-col items-center" aria-hidden="true">
            {/* Neck — a visible column, lit down one side so it has form. */}
            <div
              style={{
                width: portrait ? 54 : 88,
                height: portrait ? 30 : 18,
                background:
                  "linear-gradient(90deg,#3f3f46 0%,#71717a 18%,#52525b 50%,#27272a 82%,#1c1c1f 100%)",
              }}
            />

            {/* Plinth — a wedge-shaped floor base, brighter than the backdrop so
                it reads as a solid object the unit stands on. */}
            <div
              style={{
                width: Math.round(FRAME_WIDTH * (portrait ? 0.8 : 0.4)),
                height: portrait ? 20 : 16,
                clipPath: "polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)",
                background:
                  "linear-gradient(180deg,#a1a1aa 0%,#71717a 32%,#52525b 68%,#3f3f46 100%)",
                boxShadow: "0 14px 28px -8px rgba(0,0,0,0.9)",
              }}
            />

            {/* Contact shadow + floor sheen directly under the base */}
            <div
              className="rounded-[50%] blur-[4px]"
              style={{
                width: Math.round(FRAME_WIDTH * (portrait ? 0.95 : 0.52)),
                height: 14,
                marginTop: 1,
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0) 72%)",
              }}
            />
          </div>

          {/* Physical scale caption — grounds the mockup in a real screen size.
              Kept clear of the plinth so the two never overlap. */}
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            {screen.native} · {portrait ? "9:16 portrait" : screenKey === "ultrawide-21-9" ? "21:9 ultrawide" : "16:9 landscape"}
          </p>
        </div>
      </div>
    </div>
  );
}

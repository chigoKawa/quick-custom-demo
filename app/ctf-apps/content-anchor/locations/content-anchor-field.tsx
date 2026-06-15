"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { Box, Flex, FormControl, Stack, Text } from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextAnchorValue {
  /** Horizontal position as a 0–1 fraction of the canvas width, origin left. */
  x: number;
  /** Vertical position as a 0–1 fraction of the canvas height, origin top. */
  y: number;
  version: 1;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

// Internal pixel dimensions of the canvas coordinate system (16:5 ratio)
const CANVAS_W = 480;
const CANVAS_H = 150;

// Handle size in canvas pixels
const HANDLE_W = 88;
const HANDLE_H = 30;

// Safe zone padding — must mirror EDGE_PAD_* in hero-module.tsx so the
// WYSIWYG canvas matches the actual rendered position.
// Expressed as fractions of canvas dimensions.
const PAD_X = 0.03; // 3% from left/right
const PAD_Y = 0.04; // 4% from top/bottom

// In canvas-pixel terms
const MIN_LEFT = PAD_X * CANVAS_W;
const MAX_LEFT = (1 - PAD_X) * CANVAS_W - HANDLE_W;
const MIN_TOP  = PAD_Y * CANVAS_H;
const MAX_TOP  = (1 - PAD_Y) * CANVAS_H - HANDLE_H;

const DEFAULT_VALUE: TextAnchorValue = { x: 0.08, y: 0.5, version: 1 };

// ─── Preset positions ─────────────────────────────────────────────────────────

const PRESETS: Array<{ label: string; x: number; y: number }> = [
  { label: "Top left",      x: 0.08, y: 0.18 },
  { label: "Top center",    x: 0.5,  y: 0.18 },
  { label: "Top right",     x: 0.92, y: 0.18 },
  { label: "Mid left",      x: 0.08, y: 0.5  },
  { label: "Center",        x: 0.5,  y: 0.5  },
  { label: "Mid right",     x: 0.92, y: 0.5  },
  { label: "Bottom left",   x: 0.08, y: 0.82 },
  { label: "Bottom center", x: 0.5,  y: 0.82 },
  { label: "Bottom right",  x: 0.92, y: 0.82 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function parseValue(raw: unknown): TextAnchorValue {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    const x = typeof r.x === "number" ? r.x : DEFAULT_VALUE.x;
    const y = typeof r.y === "number" ? r.y : DEFAULT_VALUE.y;
    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), version: 1 };
  }
  return { ...DEFAULT_VALUE };
}

/** Fractional anchor → clamped handle pixel position (top-left corner) */
function toPixel(anchor: TextAnchorValue): { left: number; top: number } {
  return {
    left: clamp(anchor.x * CANVAS_W - HANDLE_W / 2, MIN_LEFT, MAX_LEFT),
    top:  clamp(anchor.y * CANVAS_H - HANDLE_H / 2, MIN_TOP,  MAX_TOP),
  };
}

/** Clamped handle pixel position (top-left corner) → fractional anchor */
function toFraction(left: number, top: number): { x: number; y: number } {
  return {
    x: clamp((left + HANDLE_W / 2) / CANVAS_W, 0, 1),
    y: clamp((top  + HANDLE_H / 2) / CANVAS_H, 0, 1),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentAnchorField() {
  const sdk = useSDK<FieldAppSDK>();

  const [anchor, setAnchor] = useState<TextAnchorValue>(() =>
    parseValue(sdk.field.getValue())
  );

  const dragRef = useRef<{
    active: boolean;
    startMouseX: number;
    startMouseY: number;
    startLeft: number;
    startTop: number;
  }>({ active: false, startMouseX: 0, startMouseY: 0, startLeft: 0, startTop: 0 });

  const isDragging = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sdk.window.startAutoResizer();
    const detach = sdk.field.onValueChanged((next) => setAnchor(parseValue(next)));
    return () => {
      sdk.window.stopAutoResizer();
      detach();
    };
  }, [sdk]);

  const persist = useCallback(
    async (next: TextAnchorValue) => {
      setAnchor(next);
      await sdk.field.setValue(next);
    },
    [sdk.field]
  );

  // ── Drag ──────────────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = false;
      const pixel = toPixel(anchor);
      dragRef.current = {
        active: true,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startLeft: pixel.left,
        startTop: pixel.top,
      };
    },
    [anchor]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      isDragging.current = true;
      const dx = e.clientX - dragRef.current.startMouseX;
      const dy = e.clientY - dragRef.current.startMouseY;
      const newLeft = clamp(dragRef.current.startLeft + dx, MIN_LEFT, MAX_LEFT);
      const newTop  = clamp(dragRef.current.startTop  + dy, MIN_TOP,  MAX_TOP);
      setAnchor({ ...toFraction(newLeft, newTop), version: 1 });
    };

    const onUp = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      const dx = e.clientX - dragRef.current.startMouseX;
      const dy = e.clientY - dragRef.current.startMouseY;
      const newLeft = clamp(dragRef.current.startLeft + dx, MIN_LEFT, MAX_LEFT);
      const newTop  = clamp(dragRef.current.startTop  + dy, MIN_TOP,  MAX_TOP);
      void persist({ ...toFraction(newLeft, newTop), version: 1 });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [persist]);

  // ── Click to jump (only if not a drag) ────────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging.current) return;
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top)  * scaleY;
      const newLeft = clamp(canvasX - HANDLE_W / 2, MIN_LEFT, MAX_LEFT);
      const newTop  = clamp(canvasY - HANDLE_H / 2, MIN_TOP,  MAX_TOP);
      void persist({ ...toFraction(newLeft, newTop), version: 1 });
    },
    [persist]
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  const pixel = toPixel(anchor);
  const xPct  = Math.round(anchor.x * 100);
  const yPct  = Math.round(anchor.y * 100);

  return (
    <Stack
      flexDirection="column"
      spacing="spacingM"
      alignItems="stretch"
      padding="spacingM"
    >
      {/* Canvas */}
      <FormControl marginBottom="none">
        <FormControl.Label>Position</FormControl.Label>
        <FormControl.HelpText>
          Drag the <strong>Content</strong> handle or click anywhere on the canvas to set position.
        </FormControl.HelpText>

        <Box
          style={{
            marginTop: tokens.spacingXs,
            borderRadius: tokens.borderRadiusMedium,
            overflow: "hidden",
            border: `1px solid ${tokens.gray300}`,
          }}
        >
          {/* Padding boundary indicators */}
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: `${(CANVAS_H / CANVAS_W) * 100}%`,
              background: "linear-gradient(135deg, #1e2330 0%, #1a2744 45%, #0f2d5e 75%, #2d1f5e 100%)",
              cursor: "crosshair",
              userSelect: "none",
            }}
          >
            {/* Safe zone outline */}
            <div
              style={{
                position: "absolute",
                left:   `${PAD_X * 100}%`,
                right:  `${PAD_X * 100}%`,
                top:    `${PAD_Y * 100}%`,
                bottom: `${PAD_Y * 100}%`,
                border: `1px dashed rgba(255,255,255,0.2)`,
                borderRadius: 2,
                pointerEvents: "none",
              }}
            />

            {/* Rule-of-thirds grid (inside safe zone) */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {[1 / 3, 2 / 3].map((f) => (
                <div
                  key={`h${f}`}
                  style={{
                    position: "absolute",
                    left: `${PAD_X * 100}%`,
                    right: `${PAD_X * 100}%`,
                    top: `${(PAD_Y + f * (1 - 2 * PAD_Y)) * 100}%`,
                    borderTop: `1px dashed rgba(255,255,255,0.1)`,
                  }}
                />
              ))}
              {[1 / 3, 2 / 3].map((f) => (
                <div
                  key={`v${f}`}
                  style={{
                    position: "absolute",
                    top: `${PAD_Y * 100}%`,
                    bottom: `${PAD_Y * 100}%`,
                    left: `${(PAD_X + f * (1 - 2 * PAD_X)) * 100}%`,
                    borderLeft: `1px dashed rgba(255,255,255,0.1)`,
                  }}
                />
              ))}
            </div>

            {/* Draggable handle */}
            <div
              style={{
                position: "absolute",
                left: `${(pixel.left / CANVAS_W) * 100}%`,
                top:  `${(pixel.top  / CANVAS_H) * 100}%`,
                width:  `${(HANDLE_W / CANVAS_W) * 100}%`,
                height: `${(HANDLE_H / CANVAS_H) * 100}%`,
                background: tokens.colorWhite,
                borderRadius: tokens.borderRadiusSmall,
                border: `2px solid ${tokens.blue500}`,
                boxShadow: tokens.boxShadowDefault.replace(/;$/, ""),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                cursor: "grab",
                zIndex: 10,
                transition: dragRef.current.active ? "none" : "left 0.07s, top 0.07s",
              }}
              onMouseDown={handleMouseDown}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag grip dots */}
              <svg
                width="8"
                height="12"
                viewBox="0 0 8 12"
                fill="none"
                style={{ flexShrink: 0, pointerEvents: "none" }}
              >
                {[0, 4].map((cx) =>
                  [2, 6, 10].map((cy) => (
                    <circle key={`${cx}-${cy}`} cx={cx + 1} cy={cy} r={1} fill={tokens.blue500} />
                  ))
                )}
              </svg>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: tokens.fontWeightDemiBold,
                  color: tokens.blue500,
                  fontFamily: tokens.fontStackPrimary,
                  letterSpacing: "0.01em",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Content
              </span>
            </div>
          </div>
        </Box>
      </FormControl>

      {/* Coordinates row */}
      <Flex justifyContent="space-between" alignItems="center" gap="spacingXs">
        <Text fontSize="fontSizeS" fontColor="gray600">
          {xPct}% from left · {yPct}% from top
        </Text>
        <button
          onClick={() => void persist({ ...DEFAULT_VALUE })}
          style={{
            padding: `${tokens.spacing2Xs} ${tokens.spacingXs}`,
            fontSize: tokens.fontSizeS,
            fontFamily: tokens.fontStackPrimary,
            fontWeight: tokens.fontWeightMedium,
            color: tokens.gray700,
            background: tokens.colorWhite,
            border: `1px solid ${tokens.gray300}`,
            borderRadius: tokens.borderRadiusSmall,
            cursor: "pointer",
            lineHeight: 1.4,
          }}
        >
          Reset
        </button>
      </Flex>

      {/* Preset grid */}
      <FormControl marginBottom="none">
        <FormControl.Label>Presets</FormControl.Label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: tokens.spacing2Xs,
          }}
        >
          {PRESETS.map((p) => {
            const isActive =
              Math.abs(anchor.x - p.x) < 0.03 && Math.abs(anchor.y - p.y) < 0.03;
            return (
              <button
                key={p.label}
                onClick={() => void persist({ x: p.x, y: p.y, version: 1 })}
                style={{
                  padding: `${tokens.spacingXs} ${tokens.spacing2Xs}`,
                  fontSize: tokens.fontSizeS,
                  fontFamily: tokens.fontStackPrimary,
                  fontWeight: isActive ? tokens.fontWeightDemiBold : tokens.fontWeightNormal,
                  borderRadius: tokens.borderRadiusSmall,
                  border: isActive
                    ? `2px solid ${tokens.blue500}`
                    : `1px solid ${tokens.gray300}`,
                  background: isActive ? tokens.blue100 : tokens.colorWhite,
                  color: isActive ? tokens.blue700 : tokens.gray700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </FormControl>
    </Stack>
  );
}

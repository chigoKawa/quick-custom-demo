"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  dotClassName?: string;
};

/**
 * A static stand-in for a QR code.
 *
 * Signage guidance treats the QR as a cue that a next step exists — even
 * viewers who never scan register it. A real encoder would mean a new
 * dependency, and the preview only needs the affordance, so this draws a
 * fixed corner-marker pattern instead. It is deliberately not scannable.
 */
export default function QrPlaceholder({ size = 64, className, dotClassName }: Props) {
  // Corner markers + a sparse field: reads as a QR at a glance.
  const cells = [
    1, 1, 1, 0, 1, 1,
    1, 0, 1, 0, 1, 0,
    1, 1, 1, 0, 0, 1,
    0, 0, 0, 1, 1, 0,
    1, 1, 0, 1, 0, 1,
    1, 0, 1, 0, 1, 1,
  ];

  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded border-2 p-1.5", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="grid h-full w-full grid-cols-6 gap-px">
        {cells.map((on, i) => (
          <span
            key={i}
            className={on ? cn("block", dotClassName ?? "bg-foreground") : "block bg-transparent"}
          />
        ))}
      </div>
    </div>
  );
}

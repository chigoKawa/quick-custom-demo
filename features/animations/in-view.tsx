"use client";

import React, { PropsWithChildren } from "react";
import { motion, Variants, useReducedMotion } from "framer-motion";

export type InViewProps = PropsWithChildren<{
  delay?: number;
  duration?: number;
  y?: number;
  once?: boolean;
  className?: string;
}>;

// Modern ease-out — a soft quart curve. Feels smoother than plain "easeOut"
// because the tail decelerates more gently. Used by every reveal in this file.
const SMOOTH_EASE = [0.16, 1, 0.3, 1] as const;

const base: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function FadeIn({
  children,
  delay = 0,
  duration = 0.7,
  y = 24,
  once = true,
  className,
}: InViewProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      style={{ willChange: "transform, opacity" }}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
      transition={{ delay, duration, ease: SMOOTH_EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  delay = 0,
  duration = 0.7,
  once = true,
  className,
}: InViewProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
      variants={base}
      transition={{ staggerChildren: 0.12, delayChildren: delay, duration, ease: SMOOTH_EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Section-level reveal. Wrap page sections so they animate in as the visitor
 * scrolls. Above-the-fold sections (index === 0) render without animation to
 * avoid a jarring first-paint fade. Respects `prefers-reduced-motion`.
 *
 * The reveal combines opacity, translate-Y, subtle scale, and a small blur —
 * the same "focus arriving" pattern used by Linear / Stripe / Vercel. Longer
 * duration (~800ms) reads as intentional smoothness rather than a snap.
 */
export function RevealSection({
  children,
  index = 0,
  className,
  y = 40,
  duration = 0.8,
}: PropsWithChildren<{
  index?: number;
  className?: string;
  y?: number;
  duration?: number;
}>) {
  const reduce = useReducedMotion();

  // First section is above the fold — skip animation entirely.
  if (reduce || index === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      // will-change hints the browser to promote the layer, keeping the
      // transition on the compositor for 60fps.
      style={{ willChange: "transform, opacity, filter" }}
      initial={{ opacity: 0, y, scale: 0.985, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{ duration, ease: SMOOTH_EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Item reveal for grids/lists. Each item fires on its own scroll intersection
 * and applies a stagger delay based on `index`. Slightly shorter travel and
 * duration than section reveal so a big grid doesn't drag.
 */
export function RevealItem({
  children,
  index = 0,
  className,
  y = 24,
}: PropsWithChildren<{
  index?: number;
  className?: string;
  y?: number;
}>) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      style={{ willChange: "transform, opacity, filter" }}
      initial={{ opacity: 0, y, scale: 0.985, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.65,
        delay: Math.min(index * 0.07, 0.45),
        ease: SMOOTH_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { useTracking, type MetricEventName } from "@/features/tracking/use-tracking";
import { LongText } from "@/features/contentful/components/long-text";
import type { TextContrastOption, TextAnchorValue, HeroSizeOption } from "../../type";
import { type FocalPoint } from "@/lib/focal-point";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HeroModuleSlide = {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageObjectPosition?: string;
  imageEntryId?: string;
  imageFocalPoint?: FocalPoint | null;
  textAnchor?: TextAnchorValue;
  textContrast?: TextContrastOption;
  bannerSize?: HeroSizeOption;
  buttons?: Array<{ label: string; href: string }>;
};

type Props = {
  slides: HeroModuleSlide[];
  entryId?: string;
  metricEventName?: MetricEventName;
};

// ─── Contrast helpers ─────────────────────────────────────────────────────────

type ContrastConfig = {
  textClass: string;
  scrim: string | null;
  subtitleClass: string;
  bodyClass: string;
};

function resolveContrast(option: TextContrastOption | undefined): ContrastConfig {
  switch (option) {
    case "Dark on light":
      return {
        textClass: "text-gray-900",
        subtitleClass: "text-gray-700",
        bodyClass: "text-gray-700",
        scrim: "rgba(255,255,255,0.72)",
      };
    case "Light (no scrim)":
      return {
        textClass: "text-white",
        subtitleClass: "text-white/80",
        bodyClass: "text-white/80",
        scrim: null,
      };
    case "Dark (no scrim)":
      return {
        textClass: "text-gray-900",
        subtitleClass: "text-gray-700",
        bodyClass: "text-gray-700",
        scrim: null,
      };
    case "Transparent":
      return {
        textClass: "text-white",
        subtitleClass: "text-white/80",
        bodyClass: "text-white/80",
        scrim: null,
      };
    case "Dark Transparent":
      return {
        textClass: "text-gray-900",
        subtitleClass: "text-gray-700",
        bodyClass: "text-gray-700",
        scrim: null,
      };
    case "Light on dark":
    default:
      return {
        textClass: "text-white",
        subtitleClass: "text-white/80",
        bodyClass: "text-white/80",
        scrim: "rgba(0,0,0,0.45)",
      };
  }
}

// ─── Size config ─────────────────────────────────────────────────────────────
//
// Small  → 4:1  (1600×400)  — tight header, category pages
// Medium → 3:1  (1600×533)  — standard hero (default)
// Large  → 2:1  (1600×800)  — campaign pages, editorial
//
// minHeight prevents the banner from becoming unusable on narrow windows where
// the aspect ratio alone would give too little height for the content block.
// TEXT_BLOCK_MAX_H is the worst-case content height as % of banner height,
// used to clamp the anchor's top position so the block never escapes the bottom.

type SizeConfig = {
  aspectRatio: string;
  imageW: number;
  imageH: number;
  minHeight: number;
  textBlockMaxH: number;
};

const SIZE_CONFIG: Record<HeroSizeOption, SizeConfig> = {
  Small:  { aspectRatio: "4 / 1", imageW: 1600, imageH: 400, minHeight: 320, textBlockMaxH: 60 },
  Medium: { aspectRatio: "3 / 1", imageW: 1600, imageH: 533, minHeight: 420, textBlockMaxH: 42 },
  Large:  { aspectRatio: "2 / 1", imageW: 1600, imageH: 800, minHeight: 560, textBlockMaxH: 30 },
};

const DEFAULT_SIZE: HeroSizeOption = "Medium";

// ─── Banner image URL ─────────────────────────────────────────────────────────

function buildBannerImageUrl(
  rawUrl: string | undefined,
  focalPoint: FocalPoint | null | undefined,
  w: number,
  h: number,
): string | undefined {
  if (!rawUrl) return undefined;
  const url = new URL(rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl);
  url.searchParams.set("w", String(w));
  url.searchParams.set("h", String(h));
  url.searchParams.set("fit", "fill");
  url.searchParams.set("fm", "webp");
  url.searchParams.set("q", "80");
  if (focalPoint) {
    const f = focalPointToGravity(focalPoint);
    if (f) url.searchParams.set("f", f);
  }
  return url.toString();
}

function focalPointToGravity(fp: FocalPoint): string {
  const x = fp.x;
  const y = fp.y;
  if (y < 0.33) {
    if (x < 0.33) return "top_left";
    if (x > 0.66) return "top_right";
    return "top";
  }
  if (y > 0.66) {
    if (x < 0.33) return "bottom_left";
    if (x > 0.66) return "bottom_right";
    return "bottom";
  }
  if (x < 0.33) return "left";
  if (x > 0.66) return "right";
  return "center";
}


// Safe zone — must mirror PAD_X / PAD_Y in content-anchor-field.tsx.
const EDGE_PAD_X = 3; // % from left/right
const EDGE_PAD_Y = 4; // % from top/bottom
const TEXT_BLOCK_MAX_W = 44; // % of banner width

function anchorToStyle(
  anchor: TextAnchorValue | undefined,
  textBlockMaxH: number,
): React.CSSProperties {
  const x = anchor?.x ?? 0.08;
  const y = anchor?.y ?? 0.5;
  const leftPct = x * 100;
  const topPct  = y * 100;

  return {
    position: "absolute",
    left: `clamp(${EDGE_PAD_X}%, calc(${leftPct}% - ${TEXT_BLOCK_MAX_W / 2}%), calc(${100 - TEXT_BLOCK_MAX_W - EDGE_PAD_X}%))`,
    top:  `clamp(${EDGE_PAD_Y}%, calc(${topPct}% - ${textBlockMaxH / 2}%), calc(${100 - textBlockMaxH - EDGE_PAD_Y}%))`,
    maxWidth: `${TEXT_BLOCK_MAX_W}%`,
    padding: `clamp(10px, 1.2%, 18px) clamp(12px, 1.8%, 22px)`,
    boxSizing: "border-box" as const,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeroModule({ slides, entryId, metricEventName }: Props) {
  const safeSlides = Array.isArray(slides) ? slides.filter((s) => s && s.title) : [];
  const [current, setCurrent] = useState(0);
  const inspectorProps = useContentfulInspectorMode({ entryId: entryId || "" });
  const { trackMetric } = useTracking();

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % safeSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [safeSlides.length]);

  if (safeSlides.length === 0) return null;

  const slide = safeSlides[current] ?? safeSlides[0];
  const primary = slide.buttons?.[0];
  const secondary = slide.buttons?.[1];
  const sizeConfig = SIZE_CONFIG[slide.bannerSize ?? DEFAULT_SIZE];
  const contrast = resolveContrast(slide.textContrast);
  const textStyle = anchorToStyle(slide.textAnchor, sizeConfig.textBlockMaxH);
  const imageInspectorProps = useContentfulInspectorMode({ entryId: slide?.imageEntryId || "" });
  const bannerImageUrl = buildBannerImageUrl(slide.imageUrl, slide.imageFocalPoint, sizeConfig.imageW, sizeConfig.imageH);

  const handleCtaClick = (params: {
    ctaType: "primary" | "secondary";
    ctaLabel: string;
    ctaHref: string;
  }) => {
    try {
      const evt: MetricEventName = (metricEventName as MetricEventName) || "hero_cta_clicked";
      trackMetric(evt, {
        slideTitle: slide.title,
        location: "hero-module",
        entryId: entryId || "",
        ...params,
      });
    } catch {
      // ignore
    }
  };

  return (
    <section className="relative w-full overflow-hidden">
      {/* ── Desktop banner (full-bleed) ───────────────────────────────── */}
      <div
        className="hidden md:block relative w-full"
        style={{ aspectRatio: sizeConfig.aspectRatio, minHeight: sizeConfig.minHeight }}
      >
        {/* Background image — covers the full banner; focal point controls the crop */}
        {bannerImageUrl ? (
          <img
            src={bannerImageUrl}
            alt={slide.imageAlt || slide.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: slide.imageObjectPosition || "center center" }}
            {...(slide.imageEntryId ? imageInspectorProps({ fieldId: "image" }) : {})}
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--surface-inverse)]" />
        )}

        {/* Text block — absolutely positioned via anchor */}
        <div style={textStyle}>
          {/* Scrim fills the padded container exactly */}
          {contrast.scrim ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: contrast.scrim,
                borderRadius: 8,
                backdropFilter: "blur(2px)",
              }}
            />
          ) : null}

          {/* Text content — z-index sits above scrim */}
          <div className="relative z-10">
            {slide.subtitle ? (
              <p
                className={`font-medium mb-1 ${contrast.subtitleClass}`}
                style={{ fontSize: "clamp(0.7rem, 1vw, 0.875rem)" }}
              >
                {slide.subtitle}
              </p>
            ) : null}
            <h2
              {...inspectorProps({ fieldId: "headline" })}
              className={`font-semibold tracking-tight mb-2 ${contrast.textClass}`}
              style={{ fontSize: "clamp(1.5rem, 2.4vw, 3rem)", lineHeight: 1.15 }}
            >
              {slide.title}
            </h2>
            {slide.description ? (
              <div style={{ fontSize: "clamp(0.8rem, 1.1vw, 1rem)" }}>
                <LongText
                  text={slide.description}
                  inspectorProps={inspectorProps({ fieldId: "subCopy" })}
                  className={`mb-4 leading-relaxed ${contrast.bodyClass}`}
                />
              </div>
            ) : null}
            {primary || secondary ? (
              <div className="flex flex-wrap items-center gap-2">
                {primary ? (
                  <Button asChild size="sm" className="rounded-full px-5">
                    <Link
                      href={primary.href}
                      onClick={() =>
                        handleCtaClick({ ctaType: "primary", ctaLabel: primary.label, ctaHref: primary.href })
                      }
                    >
                      {primary.label}
                    </Link>
                  </Button>
                ) : null}
                {secondary ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-full px-5 bg-transparent"
                    style={
                      slide.textContrast?.startsWith("Light")
                        ? { borderColor: "rgba(255,255,255,0.7)", color: "white" }
                        : {}
                    }
                  >
                    <Link
                      href={secondary.href}
                      onClick={() =>
                        handleCtaClick({ ctaType: "secondary", ctaLabel: secondary.label, ctaHref: secondary.href })
                      }
                    >
                      {secondary.label}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Slide controls */}
        {safeSlides.length > 1 ? (
          <SlideControls
            total={safeSlides.length}
            current={current}
            onDot={setCurrent}
            onPrev={() => setCurrent((p) => (p - 1 + safeSlides.length) % safeSlides.length)}
            onNext={() => setCurrent((p) => (p + 1) % safeSlides.length)}
          />
        ) : null}
      </div>

      {/* ── Mobile banner (stacked) ──────────────────────────────────── */}
      <div className="md:hidden">
        {slide.imageUrl ? (
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <img
              src={slide.imageUrl}
              alt={slide.imageAlt || slide.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: slide.imageObjectPosition || "center center" }}
            />
          </div>
        ) : null}
        <div className="px-4 py-6">
          {slide.subtitle ? (
            <p className="text-accent font-medium text-sm mb-1">{slide.subtitle}</p>
          ) : null}
          <h2
            {...inspectorProps({ fieldId: "headline" })}
            className="text-2xl font-semibold tracking-tight mb-2 text-balance"
          >
            {slide.title}
          </h2>
          {slide.description ? (
            <LongText
              text={slide.description}
              inspectorProps={inspectorProps({ fieldId: "subCopy" })}
              className="text-sm text-muted-foreground mb-4 leading-relaxed"
            />
          ) : null}
          {primary || secondary ? (
            <div className="flex flex-col gap-2">
              {primary ? (
                <Button asChild size="lg" className="rounded-full w-full">
                  <Link
                    href={primary.href}
                    onClick={() =>
                      handleCtaClick({ ctaType: "primary", ctaLabel: primary.label, ctaHref: primary.href })
                    }
                  >
                    {primary.label}
                  </Link>
                </Button>
              ) : null}
              {secondary ? (
                <Button asChild size="lg" variant="outline" className="rounded-full w-full bg-transparent">
                  <Link
                    href={secondary.href}
                    onClick={() =>
                      handleCtaClick({ ctaType: "secondary", ctaLabel: secondary.label, ctaHref: secondary.href })
                    }
                  >
                    {secondary.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {safeSlides.length > 1 ? (
          <div className="flex justify-center gap-2 pb-4">
            {safeSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === current ? "w-8 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Slide controls overlay ───────────────────────────────────────────────────

function SlideControls({
  total,
  current,
  onDot,
  onPrev,
  onNext,
}: {
  total: number;
  current: number;
  onDot: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => onDot(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === current ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-black/20 border-white/30 text-white hover:bg-black/40"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-black/20 border-white/30 text-white hover:bg-black/40"
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

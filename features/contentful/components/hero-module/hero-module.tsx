"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { useTracking, type MetricEventName } from "@/features/tracking/use-tracking";
import { LongText } from "@/features/contentful/components/long-text";

export type HeroModuleSlide = {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageObjectPosition?: string;
  imageEntryId?: string;
  imagePlacement?: "Left" | "Right";
  buttons?: Array<{ label: string; href: string }>;
};

type Props = {
  slides: HeroModuleSlide[];
  entryId?: string;
  metricEventName?: MetricEventName;
};

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
  const imagePlacement = slide.imagePlacement === "Left" ? "Left" : "Right";
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
        ctaType: params.ctaType,
        ctaLabel: params.ctaLabel,
        ctaHref: params.ctaHref,
      });
   
    } catch {
      // ignore
    }
  };
  
  // Inspector for the imageWithFocalPoint entry (linked image field)
  const imageInspectorProps = useContentfulInspectorMode({ entryId: slide?.imageEntryId || "" });

  return (
    <section className="relative overflow-hidden">

      <div className="container mx-auto px-4 py-8 md:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* When image is Left, render image column first in DOM so it appears left on desktop */}
          {imagePlacement === "Left" ? (
            <div className="relative animate-in fade-in zoom-in-95 duration-700 hidden lg:block">
              <div
                className="flex items-center justify-center"
                {...(slide.imageEntryId ? imageInspectorProps({ fieldId: "image" }) : {})}
              >
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.imageAlt || slide.title}
                    className="max-w-full max-h-[300px] sm:max-h-[380px] md:max-h-[480px] w-auto h-auto object-contain rounded-xl"
                    style={{
                      objectPosition: slide.imageObjectPosition || "center center",
                      filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.08))",
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Text — always shown */}
          <div>
            {slide.subtitle ? (
              <p className="text-accent font-medium mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {slide.subtitle}
              </p>
            ) : null}
            <h2 {...inspectorProps({ fieldId: "headline" })} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-3 text-balance animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
              {slide.title}
            </h2>
            {slide.description ? (
              <LongText
                text={slide.description}
                inspectorProps={inspectorProps({ fieldId: "subCopy" })}
                className="text-base md:text-lg text-muted-foreground mb-6 max-w-md leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200"
              />
            ) : null}
            {primary || secondary ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300 [&>*]:w-full [&>*]:sm:w-auto">
                {primary ? (
                  <Button asChild size="lg" className="rounded-full px-6 md:px-8">
                    <Link
                      href={primary.href}
                      onClick={() =>
                        handleCtaClick({
                          ctaType: "primary",
                          ctaLabel: primary.label,
                          ctaHref: primary.href,
                        })
                      }
                    >
                      {primary.label}
                    </Link>
                  </Button>
                ) : null}
                {secondary ? (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full px-6 md:px-8 bg-transparent"
                  >
                    <Link
                      href={secondary.href}
                      onClick={() =>
                        handleCtaClick({
                          ctaType: "secondary",
                          ctaLabel: secondary.label,
                          ctaHref: secondary.href,
                        })
                      }
                    >
                      {secondary.label}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Image column — on mobile always below text; on desktop: right when imagePlacement=Right, already rendered left above when Left */}
          <div className="relative animate-in fade-in zoom-in-95 duration-700">
            <div
              className="flex items-center justify-center"
              {...(slide.imageEntryId ? imageInspectorProps({ fieldId: "image" }) : {})}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={slide.imageAlt || slide.title}
                  className={imagePlacement === "Left" ? "max-w-full max-h-[300px] sm:max-h-[380px] md:max-h-[480px] w-auto h-auto object-contain rounded-xl lg:hidden" : "max-w-full max-h-[300px] sm:max-h-[380px] md:max-h-[480px] w-auto h-auto object-contain rounded-xl"}
                  style={{
                    objectPosition: slide.imageObjectPosition || "center center",
                    filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.08))",
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>

        {safeSlides.length > 1 ? (
          <div className="flex items-center justify-between mt-8 lg:mt-12">
            <div className="flex items-center gap-2">
              {safeSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === current
                      ? "w-8 bg-primary"
                      : "w-2 bg-border hover:bg-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-transparent"
                onClick={() =>
                  setCurrent((prev) => (prev - 1 + safeSlides.length) % safeSlides.length)
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-transparent"
                onClick={() => setCurrent((prev) => (prev + 1) % safeSlides.length)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

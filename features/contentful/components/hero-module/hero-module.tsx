"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { useTracking, type MetricEventName } from "@/features/tracking/use-tracking";

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
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div
            className={
              imagePlacement === "Left" ? "order-2 lg:order-2" : "order-2 lg:order-1"
            }
          >
            {slide.subtitle ? (
              <p className="text-accent font-medium mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {slide.subtitle}
              </p>
            ) : null}
            <h2 {...inspectorProps({ fieldId: "headline" })} className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
              {slide.title}
            </h2>
            {slide.description ? (
              <p {...inspectorProps({ fieldId: "subCopy" })} className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                {slide.description}
              </p>
            ) : null}
            {primary || secondary ? (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
                {primary ? (
                  <Button asChild size="lg" className="rounded-full px-8">
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
                    className="rounded-full px-8 bg-transparent"
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

          <div
            className={
              imagePlacement === "Left"
                ? "order-1 lg:order-1 relative animate-in fade-in zoom-in-95 duration-700"
                : "order-1 lg:order-2 relative animate-in fade-in zoom-in-95 duration-700"
            }
          >
            <div 
              className="aspect-[4/3] rounded-2xl overflow-hidden bg-secondary"
              {...(slide.imageEntryId ? imageInspectorProps({ fieldId: "image" }) : {})}
            >
              <img
                src={slide.imageUrl || "/placeholder.svg"}
                alt={slide.imageAlt || slide.title}
                className="w-full h-full object-cover"
                style={{ objectPosition: slide.imageObjectPosition || "center center" }}
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
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

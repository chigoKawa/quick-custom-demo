"use client";

import React, { FC, useState, useCallback } from "react";
import Link from "next/link";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { sectionsComponentMap } from "../../component-maps/sections";
import type { IPmsPropertyEntry, IGeneralTopic } from "../../type";
import type {
  PmsPropertyDetail,
  PmsRoomType,
  PmsOffer,
  PmsAvailability,
} from "@/lib/integrations/pms/pms.interface";

interface Props {
  pmsProperty: PmsPropertyDetail;
  ctfEntry: IPmsPropertyEntry | null;
  locale: string;
}

const bookingModeColors: Record<string, string> = {
  INSTANT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  APPLICATION: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  WAITLIST: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ENQUIRY_ONLY: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-400",
};

export default function PropertyDetailPage({ pmsProperty, ctfEntry: publishedCtfEntry, locale }: Props) {
  const ctfEntry = useContentfulLiveUpdates(publishedCtfEntry) || publishedCtfEntry;

  const displayTitle =
    (ctfEntry?.fields?.editorialTitle as string | undefined) ?? pmsProperty.name;

  const sections = ctfEntry?.fields?.bodySections as unknown as Array<Record<string, unknown>> | undefined;

  // Hero override: use Contentful heroModule entry if provided
  const ctfHero = ctfEntry?.fields?.hero as Record<string, unknown> | undefined;

  // Gallery override: if the editor has supplied assets, use their URLs; otherwise fall back to PMS
  const ctfGalleryAssets = ctfEntry?.fields?.gallery as Array<{ fields?: { file?: { url?: string } } }> | undefined;
  const galleryImages: string[] =
    ctfGalleryAssets && ctfGalleryAssets.length > 0
      ? ctfGalleryAssets.flatMap((a) => {
          const url = a?.fields?.file?.url;
          return url ? [`https:${url}`] : [];
        })
      : (pmsProperty.galleryImageUrls ?? []);

  // Offers override: Contentful generalTopic entries take precedence over PMS offers
  const ctfOffers = ctfEntry?.fields?.offers as IGeneralTopic[] | undefined;
  const hasCtfOffers = Array.isArray(ctfOffers) && ctfOffers.length > 0;

  return (
    <div className="min-h-screen">
      {/* ── 1. Hero ── */}
      <PropertyHero
        pmsProperty={pmsProperty}
        displayTitle={displayTitle}
        locale={locale}
        ctfHero={ctfHero}
      />

      {/* ── 2. Gallery ── */}
      {galleryImages.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <PropertyGallery
            images={galleryImages}
            alt={pmsProperty.name}
          />
        </section>
      )}

      {/* ── 3. Editorial Intro (optional Contentful) ── */}
      {ctfEntry?.fields?.editorialIntro && (
        <div className="prose dark:prose-invert max-w-3xl mx-auto px-4 py-12">
          {documentToReactComponents(ctfEntry.fields.editorialIntro as any)}
        </div>
      )}

      {/* ── 4. Room Types ── */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
          Available Rooms
        </h2>
        {pmsProperty.roomTypes && pmsProperty.roomTypes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pmsProperty.roomTypes.map((roomType) => (
              <RoomTypeCard
                key={roomType.id}
                roomType={roomType}
                availability={pmsProperty.availability}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No rooms available at this time.</p>
        )}
      </section>

      {/* ── 5. Offers — Contentful generalTopic entries take precedence over PMS offers ── */}
      {hasCtfOffers ? (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-border/30">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
            Current Offers
          </h2>
          <div className="flex flex-wrap gap-4">
            {ctfOffers!.map((topic) => (
              <GeneralTopicOfferCard key={(topic as any).sys?.id ?? topic.fields.internalName} topic={topic} />
            ))}
          </div>
        </section>
      ) : pmsProperty.offers && pmsProperty.offers.length > 0 ? (
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-border/30">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
            Current Offers
          </h2>
          <div className="flex flex-wrap gap-4">
            {pmsProperty.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 6. Body Sections (optional Contentful) ── */}
      {Array.isArray(sections) && sections.length > 0 && (
        <div className="w-full overflow-hidden max-w-7xl mx-auto">
          {sections.map((sectionEntry, index) => {
            const contentTypeId =
              (sectionEntry?.sys as Record<string, unknown>)?.contentType &&
              typeof (sectionEntry.sys as Record<string, unknown>).contentType === "object"
                ? ((sectionEntry.sys as Record<string, Record<string, unknown>>).contentType?.sys as Record<string, unknown>)?.id ??
                  ((sectionEntry.sys as Record<string, Record<string, unknown>>).contentType as Record<string, unknown>)?.id ??
                  null
                : null;

            const Component =
              contentTypeId && typeof contentTypeId === "string"
                ? (sectionsComponentMap as Record<string, FC<Record<string, unknown>>>)[contentTypeId]
                : undefined;

            if (!Component) return null;

            return (
              <Component
                key={(sectionEntry?.sys as Record<string, unknown>)?.id as string ?? `section-${index}`}
                {...sectionEntry}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function PropertyHero({
  pmsProperty,
  displayTitle,
  locale,
  ctfHero,
}: {
  pmsProperty: PmsPropertyDetail;
  displayTitle: string;
  locale: string;
  ctfHero?: Record<string, unknown>;
}) {
  // Resolve hero image: Contentful heroModule image takes precedence over PMS heroImageUrl
  const ctfHeroImageUrl = (() => {
    if (!ctfHero) return null;
    const fields = ctfHero.fields as Record<string, unknown> | undefined;
    // heroModule stores image via an imageWithFocalPoint entry link
    const imageEntry = fields?.image as Record<string, unknown> | undefined;
    const imageFields = imageEntry?.fields as Record<string, unknown> | undefined;
    const asset = imageFields?.image as Record<string, unknown> | undefined;
    const assetFields = asset?.fields as Record<string, unknown> | undefined;
    const file = assetFields?.file as Record<string, unknown> | undefined;
    const url = file?.url as string | undefined;
    return url ? `https:${url}` : null;
  })();

  const heroImageUrl = ctfHeroImageUrl ?? pmsProperty.heroImageUrl ?? null;

  return (
    <section className="relative overflow-hidden min-h-[400px] md:min-h-[520px]">
      {heroImageUrl ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt={pmsProperty.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-8 pb-16 flex flex-col h-full min-h-[400px] md:min-h-[520px] justify-end">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-white/80 mb-6">
          <Link href={`/${locale}`} className="hover:text-white transition-colors">
            Home
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/${locale}/properties`} className="hover:text-white transition-colors">
            Properties
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-white font-medium truncate max-w-[200px]">{pmsProperty.name}</span>
        </nav>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 leading-tight">
          {displayTitle}
        </h1>
        <p className="text-lg text-white/90">
          {pmsProperty.city} &middot; {pmsProperty.address}, {pmsProperty.postcode}
        </p>
      </div>
    </section>
  );
}

function PropertyGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainImage = images[activeIndex] ?? images[0];

  if (images.length === 0) return null;

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {images.length > 1 && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[540px]">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                idx === activeIndex
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`${alt} ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 flex items-start justify-center group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainImage}
          alt={alt}
          className="max-w-full w-full h-auto object-cover rounded-xl transition-transform duration-700 group-hover:scale-[1.01]"
          style={{ maxHeight: "540px" }}
        />
      </div>
    </div>
  );
}

function RoomTypeCard({
  roomType,
  availability,
}: {
  roomType: PmsRoomType;
  availability: PmsAvailability[];
}) {
  const [bookingLoading, setBookingLoading] = useState(false);

  const roomAvailability = availability.filter(
    (a) => a.roomTypeId === roomType.id && a.available
  );
  const firstAvailability = roomAvailability[0];

  const handleBookNow = useCallback(async () => {
    if (!firstAvailability) return;
    setBookingLoading(true);
    try {
      const params = new URLSearchParams({
        roomTypeId: roomType.id,
        startDate: firstAvailability.startDate,
        endDate: firstAvailability.endDate,
      });
      const res = await fetch(`/api/integrations/booking-session?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.session?.url) {
        window.open(data.session.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Booking session error", err);
    } finally {
      setBookingLoading(false);
    }
  }, [roomType.id, firstAvailability]);

  const badgeClass = bookingModeColors[roomType.bookingMode] ?? bookingModeColors.ENQUIRY_ONLY;
  const visibleAmenities = roomType.amenities.slice(0, 4);
  const remainingCount = roomType.amenities.length - 4;

  return (
    <article className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold leading-tight">{roomType.name}</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${badgeClass}`}>
            {roomType.bookingMode.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>{roomType.bedType} bed</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>{roomType.sizeSqm} m²</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{roomType.occupancy} person</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-primary">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>£{roomType.pricePerWeek}/wk</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {visibleAmenities.map((amenity) => (
            <span
              key={amenity}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {amenity}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              +{remainingCount} more
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <button
          onClick={handleBookNow}
          disabled={!firstAvailability || bookingLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all duration-200 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bookingLoading ? "Loading..." : firstAvailability ? "Book Now" : "No Availability"}
        </button>
      </div>
    </article>
  );
}

function GeneralTopicOfferCard({ topic }: { topic: IGeneralTopic }) {
  const mediaUrl = (() => {
    const file = (topic.fields?.media as any)?.fields?.file;
    const url = file?.url as string | undefined;
    return url ? `https:${url}` : null;
  })();

  return (
    <article className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden min-w-[240px] max-w-[320px] flex flex-col">
      {mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl} alt={topic.fields.title} className="w-full h-36 object-cover" />
      )}
      <div className="p-5 flex flex-col gap-2 flex-1">
        {topic.fields.tagline && (
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            {topic.fields.tagline}
          </span>
        )}
        <h3 className="font-bold text-base leading-tight">{topic.fields.title}</h3>
        {topic.fields.body && (
          <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            {documentToReactComponents(topic.fields.body as any)}
          </div>
        )}
      </div>
    </article>
  );
}

function OfferCard({ offer }: { offer: PmsOffer }) {
  const offerTypeBadgeColors: Record<string, string> = {
    DISCOUNT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    INCENTIVE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    EARLY_BIRD: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    BUNDLE: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  };

  const badgeClass = offerTypeBadgeColors[offer.offerType] ?? offerTypeBadgeColors.INCENTIVE;

  const formattedValue =
    offer.valueType === "PERCENT"
      ? `${offer.value}% off`
      : `${offer.currency || "£"}${offer.value} off`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <article className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 min-w-[240px] max-w-[320px] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base leading-tight">{offer.name}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${badgeClass}`}>
          {offer.offerType.replace("_", " ")}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
      <div className="text-xl font-bold text-primary">{formattedValue}</div>
      <div className="text-xs text-muted-foreground">
        Valid: {formatDate(offer.validFrom)} – {formatDate(offer.validTo)}
      </div>
    </article>
  );
}

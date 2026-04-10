import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { PageDataResponse } from "@/app/api/seed/page-data/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const NT_API_BASE = "https://experience.ninetailed.co";

const KNOWN_METRICS = [
  "newsletter_signup",
  "customer_conversion",
  "form_completed",
  "demo_request_submitted",
  "application_submitted",
  "paid_campaign_converted",
  "hero_cta_clicked",
  "add_to_cart",
  "kb_search",
];

type SimulationRequest = {
  pageData: PageDataResponse;
  profiles: number;
  conversionRate: number;
  pageSlug: string;
  locale: string;
  conversionMetric?: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type NtEvent = Record<string, any>;

function makeAnonId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function makeMessageId(): string {
  return crypto.randomUUID();
}

function buildContext(pageSlug: string, locale: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://localhost:3000";
  const pageUrl = `${origin}/${pageSlug}`;
  return {
    app: {
      name: "Ninetailed Analytics SDK",
      version: "1.0.0",
    },
    library: {
      name: "Ninetailed React Analytics SDK",
      version: "1.0.0",
    },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    campaign: {},
    locale,
    page: {
      path: `/${pageSlug}`,
      query: {},
      referrer: "",
      search: "",
      url: pageUrl,
    },
  };
}

function buildPageEvent(
  anonymousId: string,
  ctx: ReturnType<typeof buildContext>,
  ts: string
): NtEvent {
  return {
    channel: "web",
    context: ctx,
    messageId: makeMessageId(),
    anonymousId,
    timestamp: ts,
    type: "page",
    properties: {
      title: "Home",
      url: ctx.page.url,
      path: ctx.page.path,
      hash: "",
      search: "",
      width: 1920,
      height: 1080,
      query: {},
      referrer: "",
    },
  };
}

function buildComponentEvent(
  anonymousId: string,
  ctx: ReturnType<typeof buildContext>,
  ts: string,
  componentId: string,
  experienceId?: string,
  variantIndex?: number
): NtEvent {
  return {
    channel: "web",
    context: ctx,
    messageId: makeMessageId(),
    anonymousId,
    timestamp: ts,
    type: "component",
    componentType: "Entry",
    componentId,
    ...(experienceId ? { experienceId } : {}),
    ...(variantIndex !== undefined ? { variantIndex } : {}),
  };
}

function buildTrackEvent(
  anonymousId: string,
  ctx: ReturnType<typeof buildContext>,
  ts: string,
  eventName: string,
  properties: Record<string, unknown>
): NtEvent {
  return {
    channel: "web",
    context: ctx,
    messageId: makeMessageId(),
    anonymousId,
    timestamp: ts,
    type: "track",
    event: eventName,
    properties,
  };
}

async function sendEvents(
  clientId: string,
  environment: string,
  events: NtEvent[]
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const url = `${NT_API_BASE}/v2/organizations/${clientId}/environments/${environment}/events`;
  const payload = JSON.stringify({ events });
  console.log(
    `[simulate] Sending ${events.length} events to ${url} (${(payload.length / 1024).toFixed(1)}KB)`
  );
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(
      `[simulate] API ${res.status}:`,
      JSON.stringify(body, null, 2)
    );
  }
  return { ok: res.ok, status: res.status, body };
}

export async function POST(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_NINETAILED_CLIENT_ID;
  const environment =
    process.env.NEXT_PUBLIC_NINETAILED_ENVIRONMENT || "main";

  if (!clientId) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_NINETAILED_CLIENT_ID not set" },
      { status: 500 }
    );
  }

  let body: SimulationRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pageData, profiles, conversionRate, pageSlug, locale } = body;
  const conversionMetric = body.conversionMetric || "customer_conversion";

  if (!pageData?.sections?.length || profiles < 1) {
    return NextResponse.json(
      { error: "Missing pageData or invalid profiles count" },
      { status: 400 }
    );
  }

  const ctx = buildContext(pageSlug || pageData.pageSlug, locale || "en-US");
  const results: {
    profileIndex: number;
    anonymousId: string;
    eventCount: number;
    converted: boolean;
    trackEvents: string[];
    error?: string;
  }[] = [];

  // API limit: max 200 events, max 50 unique profiles per batch
  const MAX_PROFILES_PER_BATCH = 5;

  for (
    let batchStart = 0;
    batchStart < profiles;
    batchStart += MAX_PROFILES_PER_BATCH
  ) {
    const batchEnd = Math.min(
      batchStart + MAX_PROFILES_PER_BATCH,
      profiles
    );
    const allEvents: NtEvent[] = [];

    for (let p = batchStart; p < batchEnd; p++) {
      const anonId = makeAnonId();
      const shouldConvert = Math.random() * 100 < conversionRate;
      let eventCount = 0;
      const trackEventNames: string[] = [];
      const ts = new Date().toISOString();

      // 1. Page event
      allEvents.push(buildPageEvent(anonId, ctx, ts));
      eventCount++;

      // 2. Component view events for each section
      for (const section of pageData.sections) {
        if (section.hasExperiences && section.experiences.length > 0) {
          for (const exp of section.experiences) {
            const vIdx =
              exp.variantCount > 0
                ? Math.floor(Math.random() * (exp.variantCount + 1))
                : 0;
            allEvents.push(
              buildComponentEvent(
                anonId,
                ctx,
                ts,
                section.entryId,
                exp.experienceId,
                vIdx
              )
            );
            eventCount++;
          }
        } else {
          allEvents.push(
            buildComponentEvent(anonId, ctx, ts, section.entryId)
          );
          eventCount++;
        }
      }

      // 3. For converting profiles: fire track events
      if (shouldConvert) {
        // 3a. Fire section-specific metric events if configured
        for (const section of pageData.sections) {
          if (
            section.metricEventName &&
            KNOWN_METRICS.includes(section.metricEventName)
          ) {
            allEvents.push(
              buildTrackEvent(anonId, ctx, ts, section.metricEventName, {
                entryId: section.entryId,
                location: section.contentType,
                ...(section.ctaLabel
                  ? { ctaLabel: section.ctaLabel }
                  : {}),
                ...(section.ctaHref
                  ? { ctaHref: section.ctaHref }
                  : {}),
              })
            );
            trackEventNames.push(section.metricEventName);
            eventCount++;
          }
        }

        // 3b. Always fire the selected conversion metric for converting profiles
        allEvents.push(
          buildTrackEvent(anonId, ctx, ts, conversionMetric, {
            source: "simulation",
            pageSlug: pageData.pageSlug,
          })
        );
        trackEventNames.push(conversionMetric);
        eventCount++;
      }

      results.push({
        profileIndex: p,
        anonymousId: anonId.substring(0, 12) + "...",
        eventCount,
        converted: shouldConvert,
        trackEvents: trackEventNames,
      });
    }

    // Send this batch to Ninetailed
    const res = await sendEvents(clientId, environment, allEvents);
    if (!res.ok) {
      const apiMsg =
        (res.body as any)?.message ||
        (res.body as any)?.error ||
        JSON.stringify(res.body);
      for (let i = batchStart; i < batchEnd; i++) {
        const r = results.find((r) => r.profileIndex === i);
        if (r) r.error = `API ${res.status}: ${apiMsg}`;
      }
    }
  }

  const totalEvents = results.reduce((s, r) => s + r.eventCount, 0);
  const conversions = results.filter((r) => r.converted).length;

  return NextResponse.json({
    success: true,
    summary: {
      profiles: results.length,
      totalEvents,
      conversions,
      conversionRate: Math.round((conversions / results.length) * 100),
      conversionMetric,
    },
    results,
  });
}

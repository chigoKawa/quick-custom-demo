/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  NinetailedProvider,
  useNinetailed,
} from "@ninetailed/experience.js-react";
import { NinetailedInsightsPlugin } from "@ninetailed/experience.js-plugin-insights";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  Plus,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Square,
  Check,
  AlertCircle,
  Settings2,
  Sparkles,
  ListPlus,
  Globe,
  MousePointerClick,
  Eye,
  User,
  Route,
  Download,
  FileSearch,
  Layers,
  Users,
  Activity,
} from "lucide-react";
import type { PageDataResponse } from "@/app/api/seed/page-data/route";

// ─── Types ───────────────────────────────────────────────────────────────

type ContentfulEntry = {
  id: string;
  label: string;
  contentType: string;
  metricEventName: string | null;
};

type EventType = "page" | "track" | "identify";

type EventConfig = {
  name: string;
  label: string;
  description: string;
  type: EventType;
  needsEntry: boolean;
  entryContentTypes: string[];
  defaultProps: Record<string, string | number | boolean>;
};

type EventQueueItem = {
  id: string;
  eventName: string;
  eventType: EventType;
  count: number;
  entryId?: string;
  entryLabel?: string;
  props: Record<string, string | number | boolean>;
  isCustom?: boolean;
  status: "pending" | "running" | "done" | "error";
  fired: number;
};

type Scenario = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  steps: Omit<EventQueueItem, "id" | "status" | "fired">[];
};

// ─── Event type icons & colors ───────────────────────────────────────────

const EVENT_TYPE_META: Record<
  EventType,
  { icon: ReactNode; color: string; bg: string; label: string }
> = {
  page: {
    icon: <Globe className="h-3.5 w-3.5" />,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Page View",
  },
  track: {
    icon: <MousePointerClick className="h-3.5 w-3.5" />,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "Track",
  },
  identify: {
    icon: <User className="h-3.5 w-3.5" />,
    color: "text-violet-600",
    bg: "bg-violet-100",
    label: "Identify",
  },
};

// ─── Known events with proper types & real-world properties ──────────────

const KNOWN_EVENTS: EventConfig[] = [
  // Page events
  {
    name: "homepage_view",
    label: "Homepage View",
    description: "Simulates a page view on the homepage",
    type: "page",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { category: "home" },
  },
  {
    name: "product_page_view",
    label: "Product Page View",
    description: "Simulates a page view on a product page",
    type: "page",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { category: "products", productId: "biltema-car-shampoo-4l" },
  },
  {
    name: "landing_page_view",
    label: "Landing Page View",
    description: "Simulates a page view on a campaign landing page",
    type: "page",
    needsEntry: true,
    entryContentTypes: ["landingPage"],
    defaultProps: { category: "landing" },
  },
  // Track events
  {
    name: "hero_cta_clicked",
    label: "Hero CTA Clicked",
    description:
      "Fired when a user clicks a CTA in a hero module. Maps to the real hero-module tracking call.",
    type: "track",
    needsEntry: true,
    entryContentTypes: ["heroModule", "cta", "landingPage"],
    defaultProps: {
      slideTitle: "Get your home and wheels ready for spring",
      location: "hero-module",
      entryId: "2J2mVALx15lVclAtP4LCnJ",
      ctaType: "primary",
      ctaLabel: "Shop spring essentials",
      ctaHref: "/spring-garden-cleanup",
    },
  },
  {
    name: "add_to_cart",
    label: "Add to Cart",
    description: "Fired when a product is added to the cart",
    type: "track",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: {
      productId: "biltema-car-shampoo-4l",
      productTitle: "Car Shampoo — 4 L",
      productPrice: 79,
      productSku: "34600",
      location: "product-page",
    },
  },
  {
    name: "newsletter_signup",
    label: "Newsletter Signup",
    description: "Fired on successful newsletter subscription",
    type: "track",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { slideTitle: "newsletter", location: "form", entryId: "" },
  },
  {
    name: "customer_conversion",
    label: "Customer Conversion",
    description: "Fired when a visitor converts to customer",
    type: "track",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { location: "checkout", value: 1 },
  },
  {
    name: "demo_request_submitted",
    label: "Demo Request Submitted",
    description: "Fired when a demo request form is submitted",
    type: "track",
    needsEntry: true,
    entryContentTypes: ["formEmbed", "cta", "landingPage"],
    defaultProps: { location: "demo-form" },
  },
  {
    name: "application_submitted",
    label: "Application Submitted",
    description: "Fired when an application form is submitted",
    type: "track",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { location: "application-form" },
  },
  {
    name: "form_completed",
    label: "Form Completed",
    description: "Fired on any form completion",
    type: "track",
    needsEntry: true,
    entryContentTypes: ["formEmbed", "landingPage"],
    defaultProps: { location: "form-embed" },
  },
  {
    name: "paid_campaign_converted",
    label: "Paid Campaign Converted",
    description: "Fired when a paid campaign leads to conversion",
    type: "track",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { campaign: "spring-2025", medium: "cpc" },
  },
  {
    name: "kb_search",
    label: "Knowledge Base Search",
    description: "Fired when a user searches the knowledge base",
    type: "track",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { queryLength: 12, locale: "en-US" },
  },
  // Identify events
  {
    name: "identify_role",
    label: "Identify Visitor Role",
    description:
      "Sets a visitor role trait for personalization audience targeting",
    type: "identify",
    needsEntry: false,
    entryContentTypes: [],
    defaultProps: { role: "homeowner" },
  },
];

// ─── Pre-built scenarios ─────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: "homepage-browse",
    name: "Homepage Browse & Click",
    description:
      "Full homepage visit: page view, then hero CTA click. Simulates a user landing on the homepage and engaging with the hero banner.",
    icon: <Globe className="h-5 w-5 text-blue-500" />,
    steps: [
      {
        eventName: "homepage_view",
        eventType: "page",
        count: 1,
        props: { category: "home" },
      },
      {
        eventName: "hero_cta_clicked",
        eventType: "track",
        count: 1,
        props: {
          slideTitle: "Get your home and wheels ready for spring",
          location: "hero-module",
          entryId: "2J2mVALx15lVclAtP4LCnJ",
          ctaType: "primary",
          ctaLabel: "Shop spring essentials",
          ctaHref: "/spring-garden-cleanup",
        },
      },
    ],
  },
  {
    id: "product-purchase",
    name: "Product Browse & Add to Cart",
    description:
      "Simulates a user browsing a product page and adding items to cart.",
    icon: <MousePointerClick className="h-5 w-5 text-amber-500" />,
    steps: [
      {
        eventName: "product_page_view",
        eventType: "page",
        count: 1,
        props: {
          category: "products",
          productId: "biltema-car-shampoo-4l",
        },
      },
      {
        eventName: "add_to_cart",
        eventType: "track",
        count: 1,
        props: {
          productId: "biltema-car-shampoo-4l",
          productTitle: "Car Shampoo — 4 L",
          productPrice: 79,
          productSku: "34600",
          location: "product-page",
        },
      },
      {
        eventName: "customer_conversion",
        eventType: "track",
        count: 1,
        props: { location: "checkout", value: 1 },
      },
    ],
  },
  {
    id: "newsletter-signup",
    name: "Newsletter Signup Flow",
    description:
      "Page view followed by form completion and newsletter subscription.",
    icon: <Zap className="h-5 w-5 text-emerald-500" />,
    steps: [
      {
        eventName: "homepage_view",
        eventType: "page",
        count: 1,
        props: { category: "home" },
      },
      {
        eventName: "form_completed",
        eventType: "track",
        count: 1,
        props: { location: "form-embed" },
      },
      {
        eventName: "newsletter_signup",
        eventType: "track",
        count: 1,
        props: { slideTitle: "newsletter", location: "form", entryId: "" },
      },
    ],
  },
  {
    id: "campaign-landing",
    name: "Campaign Landing Conversion",
    description:
      "Simulates a user arriving from a paid campaign, viewing the page, and converting.",
    icon: <Route className="h-5 w-5 text-violet-500" />,
    steps: [
      {
        eventName: "landing_page_view",
        eventType: "page",
        count: 1,
        props: { category: "landing", utm_source: "google", utm_medium: "cpc" },
      },
      {
        eventName: "hero_cta_clicked",
        eventType: "track",
        count: 1,
        props: {
          slideTitle: "Spring Campaign",
          location: "hero-module",
          ctaType: "primary",
          ctaLabel: "Get started",
          ctaHref: "/spring-garden-cleanup",
        },
      },
      {
        eventName: "paid_campaign_converted",
        eventType: "track",
        count: 1,
        props: { campaign: "spring-2025", medium: "cpc" },
      },
    ],
  },
  {
    id: "identified-homeowner",
    name: "Identified Homeowner Journey",
    description:
      "Identify as a homeowner, then browse homepage and click hero CTA. Tests audience-based personalization.",
    icon: <User className="h-5 w-5 text-rose-500" />,
    steps: [
      {
        eventName: "identify_role",
        eventType: "identify",
        count: 1,
        props: { role: "homeowner" },
      },
      {
        eventName: "homepage_view",
        eventType: "page",
        count: 1,
        props: { category: "home" },
      },
      {
        eventName: "hero_cta_clicked",
        eventType: "track",
        count: 1,
        props: {
          slideTitle: "Get your home and wheels ready for spring",
          location: "hero-module",
          ctaType: "primary",
          ctaLabel: "Shop spring essentials",
          ctaHref: "/spring-garden-cleanup",
        },
      },
    ],
  },
  {
    id: "high-volume-engagement",
    name: "High-Volume Engagement",
    description:
      "Simulates heavy engagement: multiple page views, several CTA clicks, and multiple add-to-cart events.",
    icon: <Sparkles className="h-5 w-5 text-orange-500" />,
    steps: [
      {
        eventName: "homepage_view",
        eventType: "page",
        count: 5,
        props: { category: "home" },
      },
      {
        eventName: "hero_cta_clicked",
        eventType: "track",
        count: 10,
        props: {
          slideTitle: "Get your home and wheels ready for spring",
          location: "hero-module",
          ctaType: "primary",
          ctaLabel: "Shop spring essentials",
          ctaHref: "/spring-garden-cleanup",
        },
      },
      {
        eventName: "add_to_cart",
        eventType: "track",
        count: 8,
        props: {
          productId: "biltema-car-shampoo-4l",
          productTitle: "Car Shampoo — 4 L",
          productPrice: 79,
          productSku: "34600",
          location: "product-page",
        },
      },
      {
        eventName: "customer_conversion",
        eventType: "track",
        count: 3,
        props: { location: "checkout", value: 1 },
      },
    ],
  },
];

// ─── Entry Picker ────────────────────────────────────────────────────────

function EntryPicker({
  contentTypes,
  metricEventName,
  value,
  onChange,
}: {
  contentTypes: string[];
  metricEventName?: string;
  value?: string;
  onChange: (entry: ContentfulEntry | null) => void;
}) {
  const [entries, setEntries] = useState<ContentfulEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);
  const autoSelected = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      const allEntries: ContentfulEntry[] = [];

      if (metricEventName) {
        for (const ct of ["heroModule", "cta"]) {
          try {
            const res = await fetch(
              `/api/seed/entries?contentType=${ct}&metricEventName=${encodeURIComponent(metricEventName)}`
            );
            const data = await res.json();
            if (data.entries?.length) allEntries.push(...data.entries);
          } catch {
            // continue
          }
        }
      }

      for (const ct of contentTypes) {
        try {
          const res = await fetch(`/api/seed/entries?contentType=${ct}`);
          const data = await res.json();
          if (data.entries?.length) {
            const newEntries = data.entries.filter(
              (e: ContentfulEntry) => !allEntries.some((a) => a.id === e.id)
            );
            allEntries.push(...newEntries);
          }
        } catch {
          // continue
        }
      }
      return allEntries;
    };

    fetchAll()
      .then((all) => {
        setEntries(all);
        if (
          !autoSelected.current &&
          !value &&
          metricEventName &&
          all.length > 0
        ) {
          const match = all.find((e) => e.metricEventName === metricEventName);
          if (match) {
            autoSelected.current = true;
            onChange(match);
          }
        }
      })
      .catch(() => setError("Failed to load entries"))
      .finally(() => setLoading(false));
  }, [contentTypes, metricEventName, value, onChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading entries…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive py-1">
        <AlertCircle className="h-3.5 w-3.5" />
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">
        No matching entries found
      </p>
    );
  }

  const grouped = entries.reduce<Record<string, ContentfulEntry[]>>(
    (acc, e) => {
      const key = e.contentType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    },
    {}
  );

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => {
        if (v === "__clear") {
          onChange(null);
          return;
        }
        const entry = entries.find((e) => e.id === v) || null;
        onChange(entry);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an entry…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__clear">
          <span className="text-muted-foreground">None</span>
        </SelectItem>
        {Object.entries(grouped).map(([ct, items]) => (
          <div key={ct}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {ct}
            </div>
            {items.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                <span className="flex items-center gap-2">
                  {e.label}
                  {e.metricEventName && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                      {e.metricEventName}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium">
          {current} / {total} events fired
        </span>
        <span className="text-2xl font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200 ease-out"
          style={{
            width: `${pct}%`,
            background:
              pct === 100
                ? "var(--color-emerald-500, #10b981)"
                : "var(--color-primary)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────

function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "error" | "running" | "muted";
}) {
  const styles = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
    running: "bg-amber-100 text-amber-700",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function EventTypeBadge({ type }: { type: EventType }) {
  const meta = EVENT_TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ─── Event Queue Row ─────────────────────────────────────────────────────

function EventRow({
  item,
  config,
  onUpdate,
  onRemove,
  disabled,
}: {
  item: EventQueueItem;
  config: EventConfig | undefined;
  onUpdate: (updates: Partial<EventQueueItem>) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusBadge = () => {
    switch (item.status) {
      case "running":
        return (
          <Badge variant="running">
            <Loader2 className="h-3 w-3 animate-spin" />
            {item.fired}/{item.count}
          </Badge>
        );
      case "done":
        return (
          <Badge variant="success">
            <Check className="h-3 w-3" />
            Done
          </Badge>
        );
      case "error":
        return (
          <Badge variant="error">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`rounded-xl border transition-colors ${
        item.status === "running"
          ? "border-amber-300 bg-amber-50/50"
          : item.status === "done"
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {config?.label || item.eventName}
            </span>
            <EventTypeBadge type={item.eventType} />
            {item.isCustom && <Badge variant="muted">Custom</Badge>}
            {statusBadge()}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {item.eventName}
            {item.entryLabel && (
              <span className="font-sans ml-2 text-foreground/60">
                → {item.entryLabel}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-40 p-0.5"
              onClick={() =>
                onUpdate({ count: Math.max(1, item.count - 1) })
              }
              disabled={disabled || item.count <= 1}
            >
              −
            </button>
            <Input
              type="number"
              min={1}
              max={10000}
              value={item.count}
              onChange={(e) =>
                onUpdate({
                  count: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className="w-14 h-7 text-center text-sm font-semibold border-0 bg-transparent p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={disabled}
            />
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-40 p-0.5"
              onClick={() =>
                onUpdate({ count: Math.min(10000, item.count + 1) })
              }
              disabled={disabled}
            >
              +
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <Settings2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t space-y-4">
          {config?.description && (
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
          )}

          {config?.needsEntry && config.entryContentTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Linked Entry</label>
              <EntryPicker
                contentTypes={config.entryContentTypes}
                metricEventName={
                  item.eventType === "track" ? item.eventName : undefined
                }
                value={item.entryId}
                onChange={(entry) =>
                  onUpdate({
                    entryId: entry?.id,
                    entryLabel: entry?.label,
                    props: entry
                      ? { ...item.props, entryId: entry.id }
                      : (() => {
                          const { entryId: _rm, ...rest } = item.props as any;
                          return rest;
                        })(),
                  })
                }
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Properties
              <span className="text-muted-foreground font-normal ml-1">
                (JSON)
              </span>
            </label>
            <textarea
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px] resize-y"
              defaultValue={
                Object.keys(item.props).length > 0
                  ? JSON.stringify(item.props, null, 2)
                  : ""
              }
              placeholder='{ "key": "value" }'
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (!val) {
                  onUpdate({ props: {} });
                  return;
                }
                try {
                  onUpdate({ props: JSON.parse(val) });
                } catch {
                  toast.error("Invalid JSON — changes not saved");
                }
              }}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scenario Card ───────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  onLoad,
  onRun,
  isRunning,
}: {
  scenario: Scenario;
  onLoad: () => void;
  onRun: () => void;
  isRunning: boolean;
}) {
  const totalEvents = scenario.steps.reduce((s, step) => s + step.count, 0);
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {scenario.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{scenario.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {scenario.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {scenario.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-muted-foreground text-xs">→</span>
            )}
            <EventTypeBadge type={step.eventType} />
            {step.count > 1 && (
              <span className="text-[10px] text-muted-foreground font-medium">
                ×{step.count}
              </span>
            )}
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {totalEvents} event{totalEvents !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onLoad}
          disabled={isRunning}
        >
          <ListPlus className="h-3.5 w-3.5 mr-1.5" />
          Load to Queue
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={onRun}
          disabled={isRunning}
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Run Now
        </Button>
      </div>
    </div>
  );
}

// ─── Tabs component ──────────────────────────────────────────────────────

function Tabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; icon: ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-muted">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Build a scenario from real page data ────────────────────────────────

function buildScenarioFromPage(
  data: PageDataResponse
): Scenario {
  const steps: Scenario["steps"] = [];

  // 1. Page view
  steps.push({
    eventName: `${data.pageSlug}_page_view`,
    eventType: "page",
    count: 1,
    props: { category: data.pageSlug, pageTitle: data.pageTitle },
  });

  // 2. Component view for each section (especially personalized ones)
  for (const section of data.sections) {
    steps.push({
      eventName: "component_view",
      eventType: "track",
      count: 1,
      props: {
        componentId: section.entryId,
        componentType: section.contentType,
        componentLabel: section.label,
        variantIndex: 0,
        hasExperiences: section.hasExperiences,
        experienceCount: section.experienceCount,
      },
    });
  }

  // 3. Track events for sections that have a metricEventName or CTA
  for (const section of data.sections) {
    if (section.metricEventName) {
      steps.push({
        eventName: section.metricEventName,
        eventType: "track",
        count: 1,
        props: {
          entryId: section.entryId,
          location: section.contentType,
          ...(section.ctaLabel ? { ctaLabel: section.ctaLabel } : {}),
          ...(section.ctaHref ? { ctaHref: section.ctaHref } : {}),
        },
      });
    } else if (section.ctaLabel && section.ctaHref) {
      // Sections with CTAs but no explicit metric — fire a hero_cta_clicked or generic click
      const isHero =
        section.contentType === "heroModule" ||
        section.contentType === "heroBanner";
      steps.push({
        eventName: isHero ? "hero_cta_clicked" : "hero_cta_clicked",
        eventType: "track",
        count: 1,
        props: {
          entryId: section.entryId,
          location: section.contentType,
          ctaType: "primary",
          ctaLabel: section.ctaLabel,
          ctaHref: section.ctaHref,
          slideTitle: section.label,
        },
      });
    }
  }

  return {
    id: `page-${data.pageSlug}`,
    name: `${data.pageTitle} — Full Visit`,
    description: `Auto-generated from "${data.pageSlug}" page: ${data.sections.length} sections (${data.sections.filter((s) => s.hasExperiences).length} personalized). Includes page view, component views, and interaction events.`,
    icon: <FileSearch className="h-5 w-5 text-cyan-500" />,
    steps,
  };
}

// ─── Page Loader component ───────────────────────────────────────────────

function PageLoader({
  onScenarioBuilt,
  onRunDirect,
  isRunning,
}: {
  onScenarioBuilt: (scenario: Scenario) => void;
  onRunDirect: (scenario: Scenario) => void;
  isRunning: boolean;
}) {
  const [slug, setSlug] = useState("home");
  const [locale, setLocale] = useState("en-US");
  const [loading, setLoading] = useState(false);
  const [pageData, setPageData] = useState<PageDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPageData(null);

    try {
      const res = await fetch(
        `/api/seed/page-data?slug=${encodeURIComponent(slug)}&locale=${encodeURIComponent(locale)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: PageDataResponse = await res.json();
      setPageData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch page");
    } finally {
      setLoading(false);
    }
  }, [slug, locale]);

  const scenario = pageData ? buildScenarioFromPage(pageData) : null;

  return (
    <Card className="overflow-hidden border-2 border-dashed border-primary/20">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Download className="h-4 w-4 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Load from Page</h3>
            <p className="text-xs text-muted-foreground">
              Fetch real sections from a Contentful page and build a scenario
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">
              Page slug
            </label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="home"
              className="mt-1"
              disabled={loading}
            />
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-muted-foreground">
              Locale
            </label>
            <Input
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en-US"
              className="mt-1"
              disabled={loading}
            />
          </div>
          <Button
            onClick={fetchPage}
            disabled={loading || !slug.trim()}
            size="sm"
            className="mb-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSearch className="h-4 w-4 mr-1.5" />
            )}
            {loading ? "Loading…" : "Fetch"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {pageData && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{pageData.pageTitle}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  /{pageData.pageSlug}
                </p>
              </div>
              <Badge variant="default">
                <Layers className="h-3 w-3" />
                {pageData.sections.length} sections
              </Badge>
            </div>

            {/* Section breakdown */}
            <div className="grid gap-1.5">
              {pageData.sections.map((section) => (
                <div
                  key={section.entryId}
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/50"
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      section.hasExperiences
                        ? "bg-violet-500"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                  <span className="font-medium truncate flex-1">
                    {section.label || section.entryId}
                  </span>
                  <span className="text-muted-foreground font-mono shrink-0">
                    {section.contentType}
                  </span>
                  {section.hasExperiences && (
                    <span className="text-violet-600 font-medium shrink-0">
                      {section.experienceCount} exp
                    </span>
                  )}
                  {section.metricEventName && (
                    <span className="text-emerald-600 font-medium shrink-0">
                      {section.metricEventName}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Generated scenario summary */}
            {scenario && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs text-muted-foreground">
                  Generated scenario: {scenario.steps.length} steps —{" "}
                  {scenario.steps.filter((s) => s.eventType === "page").length}{" "}
                  page,{" "}
                  {scenario.steps.filter((s) => s.eventType === "track").length}{" "}
                  track
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onScenarioBuilt(scenario)}
                    disabled={isRunning}
                  >
                    <ListPlus className="h-3.5 w-3.5 mr-1.5" />
                    Load to Queue
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onRunDirect(scenario)}
                    disabled={isRunning}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Run Now
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Inner seeder (inside NinetailedProvider) ────────────────────────────

function SeederInner() {
  const { track, page, identify } = useNinetailed();

  const [activeTab, setActiveTab] = useState<string>("simulate");
  const [queue, setQueue] = useState<EventQueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [log, setLog] = useState<string[]>([]);
  const abortRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Add event form state
  const [customName, setCustomName] = useState("");
  const [addMode, setAddMode] = useState<"preset" | "custom">("preset");
  const [presetToAdd, setPresetToAdd] = useState("");

  // ── Simulation state ──
  const [simSlug, setSimSlug] = useState("home");
  const [simLocale, setSimLocale] = useState("en-US");
  const [simProfiles, setSimProfiles] = useState(10);
  const [simConversionRate, setSimConversionRate] = useState(30);
  const [simPageData, setSimPageData] = useState<PageDataResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState({ profile: 0, total: 0, events: 0 });
  const [simError, setSimError] = useState<string | null>(null);
  const [simMetric, setSimMetric] = useState("customer_conversion");

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const totalEvents = queue.reduce((sum, item) => sum + item.count, 0);

  const updateItem = useCallback(
    (id: string, updates: Partial<EventQueueItem>) => {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addPresetEvent = useCallback((eventName: string) => {
    const known = KNOWN_EVENTS.find((e) => e.name === eventName);
    setQueue((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        eventName,
        eventType: known?.type || "track",
        count: 1,
        props: known ? { ...known.defaultProps } : {},
        isCustom: !known,
        status: "pending" as const,
        fired: 0,
      },
    ]);
  }, []);

  const addCustomEvent = useCallback(() => {
    const name = customName.trim().replace(/\s+/g, "_").toLowerCase();
    if (!name) {
      toast.error("Event name cannot be empty");
      return;
    }
    setQueue((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        eventName: name,
        eventType: "track" as EventType,
        count: 1,
        props: {},
        isCustom: true,
        status: "pending" as const,
        fired: 0,
      },
    ]);
    setCustomName("");
  }, [customName]);

  const loadScenario = useCallback((scenario: Scenario) => {
    const items: EventQueueItem[] = scenario.steps.map((step) => ({
      ...step,
      id: crypto.randomUUID(),
      status: "pending" as const,
      fired: 0,
    }));
    setQueue((prev) => [...prev, ...items]);
    toast.success(`Loaded "${scenario.name}" — ${items.length} steps added`);
    setActiveTab("events");
  }, []);

  // Core event firing logic — handles all three event types
  const fireEvent = useCallback(
    async (item: EventQueueItem) => {
      const sanitizedProps: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(item.props)) {
        if (value !== undefined && value !== null) {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            sanitizedProps[key] = value;
          } else {
            sanitizedProps[key] = JSON.stringify(value);
          }
        }
      }

      switch (item.eventType) {
        case "page":
          await page?.(sanitizedProps as any);
          break;
        case "identify":
          await identify?.("", sanitizedProps as any);
          break;
        case "track":
        default:
          track?.(item.eventName as any, sanitizedProps as never);
          break;
      }
    },
    [track, page, identify]
  );

  const runQueue = useCallback(
    async (items: EventQueueItem[]) => {
      const activeItems = items.filter((item) => item.count > 0);
      const total = activeItems.reduce((sum, item) => sum + item.count, 0);
      if (total === 0) {
        toast.error("No events to fire");
        return;
      }

      setIsRunning(true);
      setLog([]);
      setProgress({ current: 0, total });
      abortRef.current = false;

      setQueue((prev) =>
        prev.map((item) => ({ ...item, status: "pending" as const, fired: 0 }))
      );

      let fired = 0;
      const typeLabels = { page: "PAGE", track: "TRACK", identify: "IDENTIFY" };

      for (const item of activeItems) {
        if (abortRef.current) break;

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "running" as const } : q
          )
        );

        let itemFired = 0;
        let hadError = false;

        for (let i = 0; i < item.count; i++) {
          if (abortRef.current) break;

          try {
            await fireEvent(item);
            fired++;
            itemFired++;

            setProgress({ current: fired, total });
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, fired: itemFired } : q
              )
            );

            const label = typeLabels[item.eventType] || "TRACK";
            setLog((prev) => [
              ...prev,
              `✓ [${fired}/${total}] ${label} ${item.eventName}${item.entryId ? ` → ${item.entryLabel || item.entryId}` : ""}`,
            ]);
          } catch (err) {
            hadError = true;
            setLog((prev) => [
              ...prev,
              `✗ [ERROR] ${item.eventName}: ${err instanceof Error ? err.message : "Unknown error"}`,
            ]);
          }

          // Delay between events
          if (
            i < item.count - 1 ||
            activeItems.indexOf(item) < activeItems.length - 1
          ) {
            await new Promise((r) => setTimeout(r, 80));
          }
        }

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: hadError
                    ? ("error" as const)
                    : ("done" as const),
                }
              : q
          )
        );
      }

      setIsRunning(false);
      if (abortRef.current) {
        toast.info(`Stopped — ${fired} of ${total} events fired.`);
      } else {
        toast.success(`All ${total} events fired!`);
      }
    },
    [fireEvent]
  );

  const runScenarioDirect = useCallback(
    (scenario: Scenario) => {
      const items: EventQueueItem[] = scenario.steps.map((step) => ({
        ...step,
        id: crypto.randomUUID(),
        status: "pending" as const,
        fired: 0,
      }));
      setQueue(items);
      setActiveTab("events");
      // Run after state settles
      setTimeout(() => runQueue(items), 50);
    },
    [runQueue]
  );

  const stopFiring = useCallback(() => {
    abortRef.current = true;
  }, []);

  const resetQueue = useCallback(() => {
    setQueue([]);
    setLog([]);
    setProgress({ current: 0, total: 0 });
  }, []);

  const setAllCounts = useCallback((count: number) => {
    setQueue((prev) => prev.map((item) => ({ ...item, count })));
  }, []);

  // ── Simulation engine ──────────────────────────────────────────────────

  const fetchSimPageData = useCallback(async () => {
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await fetch(
        `/api/seed/page-data?slug=${encodeURIComponent(simSlug)}&locale=${encodeURIComponent(simLocale)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: PageDataResponse = await res.json();
      setSimPageData(data);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Failed to load page");
    } finally {
      setSimLoading(false);
    }
  }, [simSlug, simLocale]);

  const runSimulation = useCallback(async () => {
    if (!simPageData) return;

    setSimRunning(true);
    setLog([]);
    setSimProgress({ profile: 0, total: simProfiles, events: 0 });
    setSimError(null);

    setLog((prev) => [
      ...prev,
      `Sending ${simProfiles} profiles to server…`,
      `Page: /${simPageData.pageSlug} (${simPageData.sections.length} sections, ${simPageData.sections.filter((s) => s.hasExperiences).length} personalized)`,
      `Conversion rate: ${simConversionRate}%`,
      `───────────────────────────────`,
    ]);

    try {
      const res = await fetch("/api/seed/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageData: simPageData,
          profiles: simProfiles,
          conversionRate: simConversionRate,
          pageSlug: simPageData.pageSlug,
          locale: simLocale,
          conversionMetric: simMetric,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      // Log individual profile results
      for (const r of data.results || []) {
        const trackInfo = r.trackEvents?.length
          ? ` → ${r.trackEvents.join(", ")}`
          : "";
        const status = r.error
          ? `✗ ERROR: ${r.error}`
          : r.converted
            ? `✓ ${r.eventCount} events (converted${trackInfo})`
            : `✓ ${r.eventCount} events`;
        setLog((prev) => [
          ...prev,
          `Profile ${r.profileIndex + 1} [${r.anonymousId}] ${status}`,
        ]);
      }

      setSimProgress({
        profile: data.summary.profiles,
        total: simProfiles,
        events: data.summary.totalEvents,
      });

      setLog((prev) => [
        ...prev,
        `───────────────────────────────`,
        `Done! ${data.summary.profiles} profiles, ${data.summary.totalEvents} events, ${data.summary.conversions} conversions (${data.summary.conversionRate}%)`,
      ]);

      toast.success(
        `Simulation complete! ${data.summary.profiles} unique profiles, ${data.summary.totalEvents} total events.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSimError(msg);
      setLog((prev) => [...prev, `✗ SIMULATION ERROR: ${msg}`]);
      toast.error(`Simulation failed: ${msg}`);
    } finally {
      setSimRunning(false);
    }
  }, [simPageData, simProfiles, simConversionRate, simLocale, simMetric]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:px-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Ninetailed Event Seeder
            </h1>
            <p className="text-sm text-muted-foreground">
              Simulate page views, track events &amp; identify calls
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: "simulate",
            label: "Simulate",
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: "scenarios",
            label: "Scenarios",
            icon: <Route className="h-4 w-4" />,
          },
          {
            id: "events",
            label: "Event Queue",
            icon: <Zap className="h-4 w-4" />,
          },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ═══ Simulate Tab ═══ */}
      {activeTab === "simulate" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Simulate realistic multi-profile visits using the SDK&apos;s{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              eventBuilder
            </code>{" "}
            and{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">batch</code>
            . Fires real{" "}
            <strong>page</strong>, <strong>component</strong>, and{" "}
            <strong>track</strong> events that populate the Optimization Hub.
          </p>

          {/* Config */}
          <Card className="overflow-hidden">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold">Simulation Config</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Page slug
                  </label>
                  <Input
                    value={simSlug}
                    onChange={(e) => setSimSlug(e.target.value)}
                    placeholder="home"
                    className="mt-1"
                    disabled={simRunning}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Locale
                  </label>
                  <Input
                    value={simLocale}
                    onChange={(e) => setSimLocale(e.target.value)}
                    placeholder="en-US"
                    className="mt-1"
                    disabled={simRunning}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Number of profiles
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={simProfiles}
                    onChange={(e) =>
                      setSimProfiles(
                        Math.max(1, Math.min(500, parseInt(e.target.value) || 1))
                      )
                    }
                    className="mt-1"
                    disabled={simRunning}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Conversion rate (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={simConversionRate}
                    onChange={(e) =>
                      setSimConversionRate(
                        Math.max(
                          0,
                          Math.min(100, parseInt(e.target.value) || 0)
                        )
                      )
                    }
                    className="mt-1"
                    disabled={simRunning}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Conversion metric
                </label>
                <Select
                  value={simMetric}
                  onValueChange={setSimMetric}
                  disabled={simRunning}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "customer_conversion",
                      "newsletter_signup",
                      "form_completed",
                      "demo_request_submitted",
                      "application_submitted",
                      "paid_campaign_converted",
                      "hero_cta_clicked",
                      "add_to_cart",
                      "kb_search",
                    ].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSimPageData}
                  disabled={simLoading || simRunning || !simSlug.trim()}
                >
                  {simLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <FileSearch className="h-4 w-4 mr-1.5" />
                  )}
                  {simLoading ? "Loading…" : "Load Page"}
                </Button>

                {simRunning ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      abortRef.current = true;
                    }}
                  >
                    <Square className="h-3.5 w-3.5 mr-1.5" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={runSimulation}
                    disabled={!simPageData}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Run Simulation
                  </Button>
                )}
              </div>

              {simError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {simError}
                </div>
              )}
            </div>
          </Card>

          {/* Page data preview */}
          {simPageData && (
            <Card className="overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {simPageData.pageTitle}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      /{simPageData.pageSlug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default">
                      <Layers className="h-3 w-3" />
                      {simPageData.sections.length} sections
                    </Badge>
                    <Badge variant="success">
                      <Sparkles className="h-3 w-3" />
                      {simPageData.sections.filter((s) => s.hasExperiences).length}{" "}
                      personalized
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                  {simPageData.sections.map((section) => (
                    <div
                      key={section.entryId}
                      className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/50"
                    >
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          section.hasExperiences
                            ? "bg-violet-500"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                      <span className="font-medium truncate flex-1">
                        {section.label || section.entryId}
                      </span>
                      <span className="text-muted-foreground font-mono shrink-0">
                        {section.contentType}
                      </span>
                      {section.experiences.length > 0 && (
                        <span className="text-violet-600 font-medium shrink-0">
                          {section.experiences.length} exp
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                  <p>
                    <strong>Per profile:</strong> 1 page event +{" "}
                    {simPageData.sections.reduce(
                      (s, sec) =>
                        s + Math.max(1, sec.experiences.length),
                      0
                    )}{" "}
                    component events + conversion tracks at {simConversionRate}%
                    rate
                  </p>
                  <p>
                    <strong>Total estimate:</strong> ~
                    {(
                      simProfiles *
                      (1 +
                        simPageData.sections.reduce(
                          (s, sec) =>
                            s + Math.max(1, sec.experiences.length),
                          0
                        ) +
                        Math.round(
                          (simConversionRate / 100) *
                            simPageData.sections.filter(
                              (s) => s.metricEventName || s.ctaLabel
                            ).length
                        ))
                    ).toLocaleString()}{" "}
                    events across {simProfiles} profiles
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Simulation progress */}
          {simProgress.total > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Simulation Progress
                </h3>
                <span className="text-2xl font-bold tabular-nums">
                  {Math.round(
                    (simProgress.profile / simProgress.total) * 100
                  )}
                  %
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${(simProgress.profile / simProgress.total) * 100}%`,
                    background:
                      simProgress.profile === simProgress.total
                        ? "var(--color-emerald-500, #10b981)"
                        : "var(--color-indigo-500, #6366f1)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Profile {simProgress.profile} / {simProgress.total}
                </span>
                <span>{simProgress.events.toLocaleString()} events fired</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══ Scenarios Tab ═══ */}
      {activeTab === "scenarios" && (
        <div className="space-y-6">
          {/* Load from Page */}
          <PageLoader
            onScenarioBuilt={loadScenario}
            onRunDirect={runScenarioDirect}
            isRunning={isRunning}
          />

          {/* Preset scenarios */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Preset Scenarios
            </h3>
            <p className="text-xs text-muted-foreground">
              Pre-built event sequences. Run directly or load to customize.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SCENARIOS.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onLoad={() => loadScenario(scenario)}
                onRun={() => runScenarioDirect(scenario)}
                isRunning={isRunning}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Events Tab ═══ */}
      {activeTab === "events" && (
        <div className="space-y-6">
          {/* Controls bar */}
          <Card className="overflow-hidden">
            <div className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {queue.length} event{queue.length !== 1 ? " types" : " type"}
                  <span className="font-normal text-muted-foreground ml-1.5">
                    ({totalEvents.toLocaleString()} total)
                  </span>
                </p>
                {queue.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {(
                      ["page", "track", "identify"] as EventType[]
                    ).map((type) => {
                      const count = queue.filter(
                        (q) => q.eventType === type
                      ).length;
                      if (count === 0) return null;
                      return (
                        <span
                          key={type}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${EVENT_TYPE_META[type].bg}`}
                          />
                          {count} {EVENT_TYPE_META[type].label.toLowerCase()}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {queue.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    Set all:
                    {[1, 5, 10, 50, 100].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAllCounts(n)}
                        disabled={isRunning}
                        className="px-2 py-1 rounded-md hover:bg-muted transition-colors disabled:opacity-40 font-medium"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                {queue.length > 0 && (
                  <div className="h-6 w-px bg-border hidden sm:block" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetQueue}
                  disabled={isRunning}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
                {isRunning ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopFiring}
                  >
                    <Square className="h-3.5 w-3.5 mr-1.5" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => runQueue(queue)}
                    disabled={queue.length === 0}
                    className="min-w-[100px]"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Start
                  </Button>
                )}
              </div>
            </div>

            {progress.total > 0 && (
              <div className="px-4 pb-4">
                <ProgressBar
                  current={progress.current}
                  total={progress.total}
                />
              </div>
            )}
          </Card>

          {/* Queue */}
          {queue.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <Eye className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Event queue is empty
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Load a scenario above or add individual events below
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {queue.map((item, index) => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="flex flex-col items-center pt-4 shrink-0 w-6">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    {index < queue.length - 1 && (
                      <div className="w-px h-full bg-border mt-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <EventRow
                      item={item}
                      config={KNOWN_EVENTS.find(
                        (e) => e.name === item.eventName
                      )}
                      onUpdate={(updates) => updateItem(item.id, updates)}
                      onRemove={() => removeItem(item.id)}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add events */}
          <Card className="overflow-hidden">
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Events
              </h3>

              <div className="flex gap-1 p-0.5 rounded-lg bg-muted w-fit">
                <button
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    addMode === "preset"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setAddMode("preset")}
                >
                  Preset
                </button>
                <button
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    addMode === "custom"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setAddMode("custom")}
                >
                  Custom
                </button>
              </div>

              {addMode === "preset" && (
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select
                      value={presetToAdd}
                      onValueChange={setPresetToAdd}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an event…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(["page", "track", "identify"] as EventType[]).map(
                          (type) => {
                            const events = KNOWN_EVENTS.filter(
                              (e) => e.type === type
                            );
                            if (events.length === 0) return null;
                            return (
                              <div key={type}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {EVENT_TYPE_META[type].label}
                                </div>
                                {events.map((e) => (
                                  <SelectItem key={e.name} value={e.name}>
                                    <span className="flex items-center gap-2">
                                      {e.label}
                                      <span className="text-muted-foreground text-xs font-mono">
                                        {e.name}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </div>
                            );
                          }
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (presetToAdd) {
                        addPresetEvent(presetToAdd);
                        setPresetToAdd("");
                      }
                    }}
                    disabled={!presetToAdd}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              )}

              {addMode === "custom" && (
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="my_custom_event"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCustomEvent();
                      }}
                      className="font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomEvent}
                    disabled={!customName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ═══ Log (always visible when populated) ═══ */}
      {log.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Event Log</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setLog([])}
            >
              Clear
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto px-4 pb-4">
            <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs leading-6 space-y-0.5">
              {log.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("✗")
                      ? "text-destructive"
                      : line.includes("PAGE")
                        ? "text-blue-600"
                        : line.includes("IDENTIFY")
                          ? "text-violet-600"
                          : "text-foreground/70"
                  }
                >
                  {line}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Outer wrapper with standalone NinetailedProvider ─────────────────────

export default function EventSeeder() {
  const [plugins] = useState(() => [new NinetailedInsightsPlugin()]);

  return (
    <NinetailedProvider
      clientId={process.env.NEXT_PUBLIC_NINETAILED_CLIENT_ID as string}
      environment={process.env.NEXT_PUBLIC_NINETAILED_ENVIRONMENT}
      plugins={plugins as any[]}
      componentViewTrackingThreshold={0}
      useSDKEvaluation={true}
    >
      <SeederInner />
    </NinetailedProvider>
  );
}

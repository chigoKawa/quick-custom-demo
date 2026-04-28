"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Wallet,
  Clock,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { useMicrocopyHelper } from "@/hooks/use-microcopy";
import type { MicrocopyDataMap } from "@/lib/microcopy";

// ---------------------------------------------------------------------------
// Resolved CDA shape helpers
// ---------------------------------------------------------------------------

type ResolvedEntry = {
  sys?: { id?: string; contentType?: { sys?: { id?: string } } };
  fields?: Record<string, unknown>;
};

type PaymentMethodEntry = ResolvedEntry & {
  fields?: {
    label?: string;
    category?: string;
    provider?: string;
    description?: string;
    icon?: { fields?: { file?: { url?: string } } };
  };
};

type MarketEntry = ResolvedEntry & {
  fields?: {
    code?: string;
    internalName?: string;
    locales?: string[];
  };
};

type MarketConfigEntry = ResolvedEntry & {
  fields?: {
    market?: MarketEntry;
    acceptedCardSchemes?: PaymentMethodEntry[];
    digitalWallets?: PaymentMethodEntry[];
    payLaterAndInstallments?: PaymentMethodEntry[];
    localPaymentMethods?: PaymentMethodEntry[];
    status?: string;
  };
};

type SnippetEntry = ResolvedEntry & {
  fields?: {
    marketsConfig?: MarketConfigEntry[];
    displayMode?: string;
    fallbackMessage?: string;
  };
};

// ---------------------------------------------------------------------------
// Locale → Market Code mapping
// ---------------------------------------------------------------------------

const LOCALE_TO_MARKET: Record<string, string> = {
  "en-US": "US",
  de: "DE",
  ar: "DE",
  sv: "SE",
  da: "DK",
  fi: "FI",
  es: "ES",
  "es-MX": "MX",
  "it-IT": "IT",
};

function resolveMarketCode(locale: string): string {
  if (LOCALE_TO_MARKET[locale]) return LOCALE_TO_MARKET[locale];
  const upper = locale.split("-").pop()?.toUpperCase();
  return upper || locale.toUpperCase();
}

function matchMarketConfig(
  configs: MarketConfigEntry[],
  locale: string
): MarketConfigEntry | undefined {
  const targetCode = resolveMarketCode(locale);

  for (const cfg of configs) {
    const market = cfg.fields?.market;
    if (!market?.fields) continue;

    const marketLocales = market.fields.locales;
    if (Array.isArray(marketLocales) && marketLocales.includes(locale)) {
      return cfg;
    }

    const code = (market.fields.code ?? "").toUpperCase();
    if (code === targetCode) return cfg;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Category config (icons, ordering, microcopy keys + fallbacks)
// ---------------------------------------------------------------------------

type CategoryKey =
  | "acceptedCardSchemes"
  | "digitalWallets"
  | "payLaterAndInstallments"
  | "localPaymentMethods";

const CATEGORIES: {
  field: CategoryKey;
  icon: LucideIcon;
  mcKey: string;
  fallback: string;
}[] = [
  { field: "acceptedCardSchemes", icon: CreditCard, mcKey: "payment.category.cards", fallback: "Cards" },
  { field: "digitalWallets", icon: Wallet, mcKey: "payment.category.digitalWallets", fallback: "Digital Wallets" },
  { field: "payLaterAndInstallments", icon: Clock, mcKey: "payment.category.payLater", fallback: "Pay Later & Installments" },
  { field: "localPaymentMethods", icon: MapPin, mcKey: "payment.category.localMethods", fallback: "Local Payment Methods" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PaymentMethodPill({ method }: { method: PaymentMethodEntry }) {
  const label = method.fields?.label ?? "Unknown";
  const iconUrl = method.fields?.icon?.fields?.file?.url;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm font-medium shadow-sm">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl.startsWith("//") ? `https:${iconUrl}` : iconUrl}
          alt=""
          className="h-4 w-4 object-contain"
        />
      ) : null}
      {label}
    </span>
  );
}

function CategorySection({
  icon: Icon,
  mcKey,
  fallback,
  methods,
  t,
}: {
  icon: LucideIcon;
  mcKey: string;
  fallback: string;
  methods: PaymentMethodEntry[];
  t: ReturnType<typeof useMicrocopyHelper>;
}) {
  if (methods.length === 0) return null;
  const label = t(mcKey, fallback);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span {...label.inspectorProps}>{label.value}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {methods.map((m, i) => (
          <PaymentMethodPill key={m.sys?.id ?? i} method={m} />
        ))}
      </div>
    </div>
  );
}

function MarketCard({
  config,
  t,
  showMarketName,
}: {
  config: MarketConfigEntry;
  t: ReturnType<typeof useMicrocopyHelper>;
  showMarketName?: boolean;
}) {
  const fields = config.fields;
  if (!fields) return null;
  const marketName = fields.market?.fields?.internalName ?? "Unknown Market";
  const marketCode = fields.market?.fields?.code ?? "";

  const activeCats = CATEGORIES.filter((cat) => {
    const arr = fields[cat.field] as PaymentMethodEntry[] | undefined;
    return Array.isArray(arr) && arr.length > 0;
  });

  if (activeCats.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      {showMarketName && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg font-semibold">{marketName}</span>
          {marketCode && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium uppercase text-muted-foreground">
              {marketCode}
            </span>
          )}
        </div>
      )}
      <div className="space-y-4">
        {activeCats.map((cat) => (
          <CategorySection
            key={cat.field}
            icon={cat.icon}
            mcKey={cat.mcKey}
            fallback={cat.fallback}
            methods={(fields[cat.field] as PaymentMethodEntry[]) ?? []}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

interface PaymentMethodsBlockProps {
  entry: SnippetEntry;
  locale: string;
}

export default function PaymentMethodsBlock({
  entry,
  locale,
}: PaymentMethodsBlockProps) {
  const inspectorProps = useContentfulInspectorMode({
    entryId: entry?.sys?.id,
  });

  const [microcopy, setMicrocopy] = useState<MicrocopyDataMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/microcopy?locale=${encodeURIComponent(locale)}&withIds=true`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.microcopy) setMicrocopy(data.microcopy);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [locale]);

  const t = useMicrocopyHelper(microcopy);

  const fields = entry?.fields;
  if (!fields) return null;

  const configs = (fields.marketsConfig ?? []).filter(
    (c) => c?.fields?.status === "active"
  );
  const displayMode = fields.displayMode ?? "currentMarketWithFallback";
  const fallbackMessage = fields.fallbackMessage;

  if (configs.length === 0) return null;

  if (displayMode === "allMarkets") {
    return (
      <div
        className="my-6 space-y-4"
        {...inspectorProps({ fieldId: "marketsConfig" })}
      >
        {configs.map((cfg, i) => (
          <MarketCard
            key={cfg.sys?.id ?? i}
            config={cfg}
            t={t}
            showMarketName
          />
        ))}
      </div>
    );
  }

  const matched = matchMarketConfig(configs, locale);

  if (matched) {
    return (
      <div
        className="my-6"
        {...inspectorProps({ fieldId: "marketsConfig" })}
      >
        <MarketCard config={matched} t={t} />
      </div>
    );
  }

  if (displayMode === "currentMarketWithFallback") {
    const usConfig = configs.find(
      (c) => (c.fields?.market?.fields?.code ?? "").toUpperCase() === "US"
    );

    return (
      <div
        className="my-6 space-y-4"
        {...inspectorProps({ fieldId: "marketsConfig" })}
      >
        {fallbackMessage && (
          <p className="text-sm italic text-muted-foreground">
            {fallbackMessage}
          </p>
        )}
        {usConfig ? <MarketCard config={usConfig} t={t} /> : null}
      </div>
    );
  }

  return null;
}

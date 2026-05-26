"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveMarket } from "@/lib/market-overrides/react";
import type { MarketSummary } from "@/lib/markets";

interface Props {
  markets: MarketSummary[];
  i18nLocales: string[];
}

/**
 * Inline market picker designed to live inside the DemoPanel.
 *
 * Switching builds a new pathname by stripping any existing `/market/<code>`
 * segment from the current path, inserting the new one (or omitting it for
 * "no market"), then issuing a full-page reload via `window.location.assign`.
 * The hard reload is intentional — it guarantees Next.js middleware re-runs,
 * server components re-fetch, and any cached preview data is invalidated.
 * `router.push` alone doesn't reliably re-run middleware when only the path
 * segment changes during preview sessions.
 */
export function MarketSwitcher({ markets, i18nLocales }: Props) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const activeMarketCode = useActiveMarket();

  const activeMarket = useMemo(() => {
    if (!activeMarketCode) return null;
    const lower = activeMarketCode.toLowerCase();
    return markets.find((m) => m.codeLower === lower) ?? null;
  }, [markets, activeMarketCode]);

  const handleSwitch = (newCode: string | null) => {
    const search = searchParams?.toString() ?? "";
    const next = buildMarketUrl(pathname, i18nLocales, newCode);
    const href = search ? `${next}?${search}` : next;
    if (typeof window !== "undefined") {
      window.location.assign(href);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <MarketOption
        isActive={!activeMarket}
        onClick={() => handleSwitch(null)}
        icon={<Globe className="h-4 w-4 text-muted-foreground" />}
        label="Default"
        sublabel="No market overrides"
      />

      {markets.length > 0 && <div className="my-1 h-px bg-border" />}

      {markets.map((m) => (
        <MarketOption
          key={m.id}
          isActive={activeMarket?.id === m.id}
          onClick={() => handleSwitch(m.code)}
          icon={<FlagThumb market={m} size={20} />}
          label={m.label}
          sublabel={m.code.toUpperCase()}
        />
      ))}

      {markets.length === 0 && (
        <div className="px-2 py-3 text-xs text-muted-foreground">
          No published market entries.
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function MarketOption({
  isActive,
  onClick,
  icon,
  label,
  sublabel,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left",
        "hover:bg-muted/60 transition-colors",
        isActive && "bg-muted"
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{label}</div>
        {sublabel && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {sublabel}
          </div>
        )}
      </div>
      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

function FlagThumb({ market, size }: { market: MarketSummary; size: number }) {
  if (market.flagUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={market.flagUrl}
        alt={`${market.label} flag`}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{ width: size, height: size }}
      className="rounded flex items-center justify-center bg-muted text-[10px] font-semibold text-muted-foreground flex-shrink-0"
    >
      {market.code.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Build a market-switched URL from the current pathname.
 *
 * Strips any existing `/market/<code>` segment (either at the path root
 * or after a locale prefix), then inserts the new `/market/<newCode>`
 * segment in the right place. Passing `null` for newCode removes the
 * segment entirely (back to the base URL).
 */
function buildMarketUrl(
  pathname: string,
  i18nLocales: string[],
  newCode: string | null
): string {
  let localePrefix = "";
  let rest = pathname;
  for (const locale of i18nLocales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      localePrefix = `/${locale}`;
      rest = pathname.slice(localePrefix.length) || "/";
      break;
    }
  }

  const marketStripped = rest.replace(
    /^\/market\/[a-zA-Z0-9_-]+(?=\/|$)/,
    ""
  );
  const cleanRest = marketStripped === "" ? "/" : marketStripped;

  if (!newCode) {
    return `${localePrefix}${cleanRest === "/" ? "" : cleanRest}` || "/";
  }
  const lower = newCode.toLowerCase();
  const tail = cleanRest === "/" ? "" : cleanRest;
  return `${localePrefix}/market/${lower}${tail}` || "/";
}

"use client";

import { useState } from "react";
import { Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { demoPanelActions } from "./actions";
import { MarketSwitcher } from "@/features/market-switcher/market-switcher";
import type { MarketSummary } from "@/lib/markets";

interface Props {
  /** Published market entries. Sourced server-side in the layout. */
  markets: MarketSummary[];
  /** Configured i18n locales — needed by the switcher to parse paths. */
  i18nLocales: string[];
}

export function DemoPanel({ markets, i18nLocales }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed top-6 right-6 z-[20000] flex flex-col items-end gap-3">
      {/* Floating pill trigger */}
      <div className="flex items-center gap-1 p-1.5 bg-background/80 backdrop-blur-lg border rounded-full shadow-2xl">
        <TooltipProvider delayDuration={0}>
          <Button
            variant={isExpanded ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full pl-3 pr-2 gap-2 h-9"
          >
            <Settings
              className={cn("h-4 w-4", isExpanded && "animate-spin-slow")}
            />
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </TooltipProvider>
      </div>

      {/* Expanded panel */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out origin-top-right",
          isExpanded
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="bg-background/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 w-80">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Demo Settings
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                className="h-6 w-6 rounded-full"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>

            {/* Market switcher (always present — primary demo control) */}
            <div className="p-3 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Market</p>
              <MarketSwitcher markets={markets} i18nLocales={i18nLocales} />
            </div>

            {/* Any other registered demo actions */}
            {demoPanelActions.length > 0 && (
              <div className="space-y-4">
                {demoPanelActions.map((action) => (
                  <div
                    key={action.id}
                    className="p-3 border rounded-lg bg-muted/50"
                  >
                    <p className="text-sm font-medium mb-2">{action.label}</p>
                    {action.render()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

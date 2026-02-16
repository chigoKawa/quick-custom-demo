"use client";

import { useState } from "react";
import { Settings, ChevronDown, ChevronUp, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { demoPanelActions } from "./actions";

export function DemoPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    /* Container is now fixed to the top right. 
       'items-end' ensures the panel aligns with the right edge of the bar.
    */
    <div className="fixed top-6 right-6 z-[20000] flex flex-col items-end gap-3">
      {/* 1. THE FLOATING BAR (Pill Shape) */}
      <div className="flex items-center gap-1 p-1.5 bg-background/80 backdrop-blur-lg border rounded-full shadow-2xl">
        <TooltipProvider delayDuration={0}>
          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">Home</TooltipContent>
          </Tooltip> */}

     

          {/* TOGGLE BUTTON */}
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

      {/* 2. THE PANEL (Floating underneath, aligned to the right) */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out origin-top-right",
          isExpanded
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
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

            {/* Actions from registry */}
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
          </div>
        </div>
      </div>
    </div>
  );
}

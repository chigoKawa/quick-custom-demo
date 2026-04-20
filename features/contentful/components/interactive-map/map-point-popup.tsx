"use client";

import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import type { Document } from "@contentful/rich-text-types";
import { baseRichTextOptions } from "../../richtext";
import { getPointTypeIcon, getPointTypeColor } from "./map-point-icon";

interface MapPointPopupProps {
  title: string;
  pointType: string;
  summary?: Document;
}

export default function MapPointPopup({ title, pointType, summary }: MapPointPopupProps) {
  const Icon = getPointTypeIcon(pointType);
  const color = getPointTypeColor(pointType);

  return (
    <div className="min-w-[200px] max-w-[280px] p-1">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon width={16} height={16} style={{ color }} />
        </span>
        <h3 className="font-semibold text-sm leading-tight text-foreground">{title}</h3>
      </div>
      <span
        className="inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {pointType}
      </span>
      {summary && (
        <div className="text-xs text-muted-foreground prose prose-sm max-w-none [&>p]:mb-1 [&>p]:text-xs">
          {documentToReactComponents(summary, baseRichTextOptions)}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { ExternalLink, Globe, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewChannel = "web" | "mobile" | "in-store";

type Props = {
  /** The channel currently being viewed. */
  channel: PreviewChannel;
  type?: string;
  entryId?: string;
  slug?: string;
  locale: string;
};

/**
 * Cross-channel navigation for the preview harness: the same entry viewed as
 * web, mobile, or in-store. Lives in the dark toolbar chrome of each shell.
 *
 * The web link only appears when a slug is known, because the public campaign
 * route resolves by slug (`/[locale]/campaigns/[slug]`) — an entryId-only
 * preview has no public URL to point at.
 */
export default function ChannelSwitcher({ channel, type, entryId, slug, locale }: Props) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (entryId) params.set("entryId", entryId);
  else if (slug) params.set("slug", slug);
  params.set("locale", locale);
  // `preview` must be in the URL, not just resolved server-side: AppProviders
  // reads it client-side (isPreviewEnabled, lib/utils.ts) to decide whether to
  // attach the Ninetailed preview plugin. Without it there is no audience
  // switcher widget on the page.
  params.set("preview", "true");
  const qs = params.toString();

  // Web points at the in-harness browser mockup, not the live route. Linking
  // out would drop this switcher (and the way back), and the public campaign
  // route also redirects expired campaigns to the locale home.
  const items: Array<{
    key: PreviewChannel;
    label: string;
    href: string;
    Icon: typeof Globe;
  }> = [
    { key: "web", label: "Web", href: `/platform/preview/web?${qs}`, Icon: Globe },
    { key: "mobile", label: "Mobile", href: `/platform/preview/mobile?${qs}`, Icon: Smartphone },
    { key: "in-store", label: "In-store", href: `/platform/preview/in-store?${qs}`, Icon: Monitor },
  ];

  // The real, non-mocked page. `?preview` keeps expired campaigns from
  // redirecting to the locale home.
  const liveHref =
    type === "campaign" && slug ? `/${locale}/campaigns/${slug}?preview` : null;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-1 rounded-md bg-neutral-900/60 p-0.5"
      role="group"
      aria-label="Preview channel"
    >
      {items.map(({ key, label, href, Icon }) => {
        const isActive = key === channel;
        const shared =
          "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors";

        return (
          <a
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              shared,
              isActive
                ? "bg-neutral-700 text-white"
                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </a>
        );
      })}
    </div>

      {/* Escape hatch to the genuine page, outside the harness. Opens in a new
          tab so the switcher is never lost. */}
      {liveHref && (
        <a
          href={liveHref}
          target="_blank"
          rel="noreferrer"
          title="Open the live page in a new tab"
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-700/50 hover:text-neutral-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="sr-only">Open live page</span>
        </a>
      )}
    </div>
  );
}

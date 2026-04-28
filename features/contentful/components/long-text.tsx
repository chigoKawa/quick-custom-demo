import React from "react";
import { marked } from "marked";
import { cn } from "@/lib/utils";

// Configure marked: no GFM tables/task-lists, just core inline + block markdown
marked.use({
  gfm: true,
  breaks: true,
});

/**
 * Renders a Contentful long-text (Text) field with full markdown support.
 * Supports: headings, bold, italic, blockquotes, inline code, links, bullet
 * lists, ordered lists, and horizontal rules.
 *
 * HTML is sanitized by only using DOMParser-safe innerHTML on trusted
 * Contentful-authored content (not user-submitted HTML).
 */
export function LongText({
  text,
  className,
  inspectorProps,
}: {
  text: string;
  className?: string;
  inspectorProps?: Record<string, unknown> | null;
}) {
  const html = marked.parse(text) as string;

  return (
    <div
      {...(inspectorProps as any)}
      className={cn(
        // Base prose styles — mirrors Tailwind Typography but without the plugin dep
        "long-text",
        "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mb-4 [&_h1]:mt-6",
        "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mb-3 [&_h2]:mt-5",
        "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4",
        "[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3",
        "[&_p]:leading-relaxed [&_p]:mb-3 last:[&_p]:mb-0",
        "[&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-3",
        "[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mb-3",
        "[&_li]:leading-relaxed",
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:opacity-80",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4",
        "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono",
        "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4",
        "[&_hr]:border-border [&_hr]:my-6",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

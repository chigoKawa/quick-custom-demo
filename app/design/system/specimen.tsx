"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Keeps one misbehaving component from blanking the whole catalogue.
 *
 * Without this, a single throw inside any specimen unmounts the page and
 * replaces it with the global error screen — which is the least useful thing a
 * component reference page could do. Failing in place, labelled, is better:
 * the reader still gets the other 60 specimens and can see exactly which one
 * is broken and why.
 */
class SpecimenErrorBoundary extends Component<
  { name: string; inset?: boolean; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[design system] "${this.props.name}" failed to render:`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className={`rounded-lg border border-destructive/40 bg-destructive/5 p-4 ${
            this.props.inset ? "m-5" : ""
          }`}
        >
          <p className="text-sm font-medium text-destructive">
            This component threw while rendering.
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Usually a placeholder field shape the component does not accept. The message
            below is the actual error — the full stack is in the browser console.
          </p>
          <pre className="mt-2.5 overflow-x-auto rounded bg-background p-2.5 font-mono text-[11px] text-muted-foreground">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Labelled frame around one component specimen.
 *
 * Every entry states the human name, the Contentful content type id (the key
 * components are registered under), and the source file — so a reader can go
 * from "this card looks wrong" to the file that renders it without searching.
 */
export interface SpecimenProps {
  /** Human-readable component name, e.g. "FAQ module". */
  name: string;
  /** Contentful content type id, e.g. `faqModule`. Omit for non-Contentful primitives. */
  contentType?: string;
  /** Repo-relative source path, e.g. `features/contentful/components/faq-module/`. */
  source?: string;
  /** One or two sentences on what the component is for. */
  description?: string;
  /** Field names or prop names worth calling out, rendered as chips. */
  fields?: string[];
  /** Variant label shown next to the name, e.g. "layout: accordion". */
  variant?: string;
  /**
   * Note shown above the rendering — use for specimens whose real content
   * arrives from a runtime API and so look empty or skeletal here.
   */
  note?: string;
  /** Renders the specimen on a plain surface without the inset canvas padding. */
  bleed?: boolean;
  children: ReactNode;
}

export function Specimen({
  name,
  contentType,
  source,
  description,
  fields,
  variant,
  note,
  bleed = false,
  children,
}: SpecimenProps) {
  return (
    <article
      id={specimenId(name, variant)}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-base font-semibold tracking-tight">{name}</h3>
          {contentType && (
            <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
              {contentType}
            </code>
          )}
          {variant && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {variant}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
        )}

        {source && (
          <p className="mt-2 font-mono text-xs text-muted-foreground/80">{source}</p>
        )}

        {fields && fields.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {fields.map((field) => (
              <li
                key={field}
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {field}
              </li>
            ))}
          </ul>
        )}
      </header>

      {note && (
        <p className="border-b border-border bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
          {note}
        </p>
      )}

      <div className={bleed ? "bg-background" : "bg-background p-5"}>
        <SpecimenErrorBoundary name={name} inset={bleed}>
          {children}
        </SpecimenErrorBoundary>
      </div>
    </article>
  );
}

/** Stable anchor id so the index nav can link to a specimen. */
export function specimenId(name: string, variant?: string): string {
  return [name, variant]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Section heading with an anchor, used to group specimens. */
export function SpecimenGroup({
  id,
  title,
  summary,
  children,
}: {
  id: string;
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {summary && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{summary}</p>}
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

/** Small labelled cell, used in the foundations grids. */
export function Swatch({
  token,
  className,
  label,
}: {
  token: string;
  className: string;
  label?: string;
}) {
  return (
    <div className="min-w-0">
      <div className={`h-16 rounded-lg border border-border ${className}`} />
      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground" title={token}>
        {token}
      </p>
      {label && <p className="truncate text-[11px] text-muted-foreground/70">{label}</p>}
    </div>
  );
}

"use client";

import React from "react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

import { sectionsComponentMap } from "@/features/contentful/component-maps/sections";
import { thingsComponentMap } from "@/features/contentful/component-maps/things";
import { renderEmbeddedEntry } from "@/features/contentful/component-maps/embedded-entries";
import { baseRichTextOptions } from "@/features/contentful/richtext";
import BaseButtonWrapper from "@/features/contentful/components/base-button/base-button-wrapper";
import FaqModuleSection from "@/features/contentful/components/faq-module/faq-module-section";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Specimen, SpecimenGroup, Swatch } from "./specimen";
import * as fx from "./fixtures";

/* -------------------------------------------------------------------------- */
/* Section specimens — rendered through the real component map                */
/* -------------------------------------------------------------------------- */

/**
 * Renders a section fixture through `sectionsComponentMap`, exactly the way a
 * landing page does (`<Component {...sectionEntry} />`). Going through the map
 * rather than importing each component directly means this page also verifies
 * the map itself: a content type that is missing a registration shows up here
 * as a visible gap instead of silently rendering nothing on a real page.
 */
function SectionSpecimen({
  contentType,
  entry,
  ...rest
}: {
  contentType: string;
  entry: unknown;
} & Omit<React.ComponentProps<typeof Specimen>, "children" | "contentType">) {
  const Component = sectionsComponentMap[contentType];

  return (
    <Specimen contentType={contentType} bleed {...rest}>
      {Component ? (
        <Component {...(entry as Record<string, unknown>)} />
      ) : (
        <MissingRegistration contentType={contentType} />
      )}
    </Specimen>
  );
}

function MissingRegistration({ contentType }: { contentType: string }) {
  return (
    <div className="m-5 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      <code className="font-mono">{contentType}</code> is not registered in{" "}
      <code className="font-mono">features/contentful/component-maps/sections.ts</code>.
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Foundations                                                                */
/* -------------------------------------------------------------------------- */

const surfaceTokens: Array<{ token: string; className: string; label: string }> = [
  { token: "--background", className: "bg-background", label: "page ground" },
  { token: "--foreground", className: "bg-foreground", label: "body text" },
  { token: "--card", className: "bg-card", label: "raised surface" },
  { token: "--popover", className: "bg-popover", label: "overlay surface" },
  { token: "--muted", className: "bg-muted", label: "recessed fill" },
  { token: "--muted-foreground", className: "bg-muted-foreground", label: "secondary text" },
  { token: "--border", className: "bg-border", label: "hairlines" },
  { token: "--input", className: "bg-input", label: "field border" },
];

const accentTokens: Array<{ token: string; className: string; label: string }> = [
  { token: "--primary", className: "bg-primary", label: "brand action" },
  { token: "--primary-foreground", className: "bg-primary-foreground", label: "on brand" },
  { token: "--secondary", className: "bg-secondary", label: "quiet action" },
  { token: "--accent", className: "bg-accent", label: "hover tint" },
  { token: "--destructive", className: "bg-destructive", label: "danger" },
  { token: "--ring", className: "bg-ring", label: "focus ring" },
  { token: "--surface-inverse", className: "bg-surface-inverse", label: "dark band / footer" },
  {
    token: "--surface-inverse-foreground",
    className: "bg-surface-inverse-foreground",
    label: "on dark band",
  },
];

const chartTokens = [1, 2, 3, 4, 5].map((n) => ({
  token: `--chart-${n}`,
  className: `bg-chart-${n}`,
  label: `series ${n}`,
}));

const typeScale: Array<{ label: string; className: string }> = [
  { label: "text-5xl / bold — page hero", className: "text-5xl font-bold tracking-tight" },
  { label: "text-4xl / bold — section heading", className: "text-4xl font-bold tracking-tight" },
  { label: "text-3xl / bold — module heading", className: "text-3xl font-bold tracking-tight" },
  { label: "text-2xl / semibold — card heading", className: "text-2xl font-semibold" },
  { label: "text-xl / semibold — sub-heading", className: "text-xl font-semibold" },
  { label: "text-lg / medium — lead copy", className: "text-lg font-medium" },
  { label: "text-base — body copy", className: "text-base" },
  { label: "text-sm / muted — supporting copy", className: "text-sm text-muted-foreground" },
  {
    label: "text-xs / uppercase / tracked — metadata label",
    className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
  },
];

function Foundations() {
  return (
    <SpecimenGroup
      id="foundations"
      title="Foundations"
      summary="Every colour is an oklch custom property defined in app/globals.css and re-exported into Tailwind through the @theme block, so a theme swap needs no component changes. Fonts and radius come through the same path."
    >
      <Specimen
        name="Surface & text tokens"
        source="app/globals.css — :root / .dark"
        description="Neutral ramp. Swap these and the whole site follows; nothing hard-codes a grey."
        fields={surfaceTokens.map((t) => t.token)}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {surfaceTokens.map((t) => (
            <Swatch key={t.token} token={t.token} className={t.className} label={t.label} />
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Accent & status tokens"
        source="app/globals.css — :root / .dark"
        description="Brand and status colours. Each has a paired *-foreground token that is guaranteed to be legible on it."
        fields={accentTokens.map((t) => t.token)}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {accentTokens.map((t) => (
            <Swatch key={t.token} token={t.token} className={t.className} label={t.label} />
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Chart palette"
        source="app/globals.css — :root / .dark"
        description="Categorical series colours, ordered for adjacent-pair contrast."
        fields={chartTokens.map((t) => t.token)}
      >
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {chartTokens.map((t) => (
            <Swatch key={t.token} token={t.token} className={t.className} label={t.label} />
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Type scale"
        source="app/globals.css — @layer base"
        description="Headings pick up --heading-weight and --heading-letter-spacing from the active theme, so weight and tracking are themable rather than per-component."
        fields={["--resolved-font-sans", "--heading-weight", "--heading-letter-spacing", "--body-size"]}
      >
        <div className="space-y-4">
          {typeScale.map((step) => (
            <div key={step.label} className="border-b border-border pb-3 last:border-b-0">
              <p className={step.className}>The quick brown fox</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{step.label}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Font families"
        source="app/globals.css — @theme inline"
        description="Three families resolve from theme JSON via themeToCSS, so a demo can be re-skinned without touching components."
        fields={["font-sans", "font-serif", "font-mono"]}
      >
        <div className="space-y-4">
          {[
            { cls: "font-sans", token: "--font-sans → --resolved-font-sans" },
            { cls: "font-serif", token: "--font-serif → --resolved-font-serif" },
            { cls: "font-mono", token: "--font-mono → --resolved-font-mono" },
          ].map((f) => (
            <div key={f.cls}>
              <p className={`${f.cls} text-2xl`}>Sphinx of black quartz, judge my vow</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{f.token}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Radius scale"
        source="app/globals.css — @theme inline"
        description="All four steps derive from a single --radius value (0.5rem by default), so corner softness is one knob."
        fields={["--radius-sm", "--radius-md", "--radius-lg", "--radius-xl"]}
      >
        <div className="flex flex-wrap gap-6">
          {[
            { cls: "rounded-sm", token: "--radius-sm  (radius − 4px)" },
            { cls: "rounded-md", token: "--radius-md  (radius − 2px)" },
            { cls: "rounded-lg", token: "--radius-lg  (radius)" },
            { cls: "rounded-xl", token: "--radius-xl  (radius + 4px)" },
          ].map((r) => (
            <div key={r.cls}>
              <div className={`size-20 border border-border bg-muted ${r.cls}`} />
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">{r.token}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Rich text prose"
        source="features/contentful/richtext.tsx — baseRichTextOptions"
        description="The single renderer every rich text field passes through. Marks, headings, lists, quotes, rules and hyperlinks all get their styling here rather than per-component."
        fields={["bold", "italic", "underline", "code", "heading-2/3", "lists", "blockquote", "hr", "hyperlink"]}
      >
        <div className="prose dark:prose-invert max-w-none">
          {documentToReactComponents(fx.longFormDocument, baseRichTextOptions)}
        </div>
      </Specimen>
    </SpecimenGroup>
  );
}

/* -------------------------------------------------------------------------- */
/* Section modules                                                            */
/* -------------------------------------------------------------------------- */

const dataBackedNote = (endpoint: string) =>
  `Content for this module is fetched at runtime from ${endpoint}. On this page the placeholder entry supplies only the framing, so the body may render empty or as skeletons.`;

function SectionModules() {
  return (
    <SpecimenGroup
      id="sections"
      title="Page sections"
      summary={`Everything registered in features/contentful/component-maps/sections.ts — ${
        Object.keys(sectionsComponentMap).length
      } content types. These are the blocks an editor stacks in a landing page, campaign or product story. Each specimen below is rendered through that map with the same spread props a real page uses.`}
    >
     

      {/* heroModule */}
      <SectionSpecimen
        name="Hero module"
        contentType="heroModule"
        variant="size: Large, contrast: Light on dark"
        source="features/contentful/components/hero-module/"
        description="The editorial hero. Text position is stored as a 0–1 fraction (textAnchor) and the image carries its own focal point, so one entry composes correctly at any aspect ratio. trackingName is required — it keys the analytics event."
        fields={[
          "headline",
          "subCopy",
          "image → imageWithFocalPoint",
          "textAnchor",
          "textContrast",
          "size",
          "buttons",
          "trackingName",
        ]}
        entry={fx.heroModuleEntry("ph-hero-module-large", { size: "Large" })}
      />
      {fx.heroContrasts.slice(1).map((contrast) => (
        <SectionSpecimen
          key={contrast}
          name="Hero module"
          contentType="heroModule"
          variant={`contrast: ${contrast}`}
          source="features/contentful/components/hero-module/"
          fields={["textContrast", "size"]}
          entry={fx.heroModuleEntry(`ph-hero-module-${contrast}`, {
            size: "Small",
            textContrast: contrast,
          })}
        />
      ))}

      {/* cta */}
      {fx.ctaBackgrounds.map((background) => (
        <SectionSpecimen
          key={background}
          name="CTA"
          contentType="cta"
          variant={`background: ${background}`}
          source="features/contentful/components/cta/"
          description={
            background === "Default"
              ? "Split copy/image band with one or two buttons. backgroundColor picks a token pair; imagePlacement flips the halves."
              : undefined
          }
          fields={["title", "body", "images", "actionButtons", "backgroundColor", "variant", "imagePlacement"]}
          entry={fx.ctaEntry(`ph-cta-${background}`, {
            backgroundColor: background,
            imagePlacement: background === "Secondary" ? "Left" : "Right",
          })}
        />
      ))}
      <SectionSpecimen
        name="CTA"
        contentType="cta"
        variant="variant: Smooth"
        source="features/contentful/components/cta/"
        fields={["variant"]}
        entry={fx.ctaEntry("ph-cta-smooth", { variant: "Smooth", backgroundColor: "Primary" })}
      />

      {/* alert */}
      {fx.alertVariants.map((variant) => (
        <SectionSpecimen
          key={variant}
          name="Alert"
          contentType="alert"
          variant={`variant: ${variant}`}
          source="features/contentful/components/alert/"
          description={
            variant === "info"
              ? "Editor-authored notice band. Content is rich text, so it can carry a link. Only the info variant below is dismissible."
              : undefined
          }
          fields={["title", "content", "variant", "dismissible", "showIcon", "actionButton"]}
          entry={fx.alertEntry(variant)}
        />
      ))}

      {/* faqModule */}
      {fx.faqLayouts.map((layout) => (
        <SectionSpecimen
          key={layout}
          name="FAQ module"
          contentType="faqModule"
          variant={`layout: ${layout}`}
          source="features/contentful/components/faq-module/"
          description={
            layout === "accordion"
              ? "Question set built from linked faqItem entries. Accordion and two-column collapse; list stays open and groups by category. With enableStructuredData on, it also emits a JSON-LD FAQPage."
              : undefined
          }
          fields={["title", "subtitle", "items → faqItem[]", "layout", "allowMultipleOpen", "enableStructuredData", "actionButton"]}
          entry={fx.faqModuleEntry(layout)}
        />
      ))}

      {/* multiItemModule */}
      {fx.multiItemLayouts.map((layout) => (
        <SectionSpecimen
          key={layout}
          name="Multi-item module"
          contentType="multiItemModule"
          variant={`layout: ${layout}`}
          source="features/contentful/components/multi-item-module/"
          description={
            layout === "grid"
              ? "The workhorse collection module. The card is chosen from each item's content type (heroModule, blogPost, landingPage, logo, campaign, callout, cta, generalTopic), so one module covers carousels, grids, logo strips and value props."
              : undefined
          }
          fields={["title", "subtitle", "items", "layout", "columns", "autoplay", "showArrows", "showDots", "backgroundTheme", "actionButton"]}
          entry={fx.multiItemModuleEntry(layout)}
        />
      ))}

      {/* richContentModule */}
      {fx.richContentLayouts.map((layout) => (
        <SectionSpecimen
          key={layout}
          name="Rich content module"
          contentType="richContentModule"
          variant={`layout: ${layout}`}
          source="features/contentful/components/rich-content-module/"
          description={
            layout === "full-width"
              ? "Long-form prose with one optional supporting image. The place for editorial copy that needs headings and lists rather than a bespoke section."
              : undefined
          }
          fields={["title", "body", "image", "imageAlignment", "layout"]}
          entry={fx.richContentModuleEntry(layout)}
        />
      ))}

      {/* productCatalog */}
      <SectionSpecimen
        name="Product catalog"
        contentType="productCatalog"
        variant="selectionMode: single"
        source="features/contentful/components/product-catalog/"
        description="Commerce block driven by a JSON field written by the product-picker app. Single mode renders a CTA-style split; multiple renders a price-bearing carousel; category mode fetches its products at runtime."
        fields={["title", "body", "products (JSON)", "cta"]}
        entry={fx.productCatalogEntry("single")}
      />
      <SectionSpecimen
        name="Product catalog"
        contentType="productCatalog"
        variant="selectionMode: multiple"
        source="features/contentful/components/product-catalog/"
        fields={["products.selectedProducts"]}
        entry={fx.productCatalogEntry("multiple")}
      />

      {/* formEmbed */}
      <SectionSpecimen
        name="Form embed"
        contentType="formEmbed"
        source="features/contentful/components/form-embed/"
        description="Renders a form definition selected in Contentful by an app. Field types, widths, options and conditional logic all come from the JSON — the component owns layout and validation only. Submission posts to /api/integrations/forms, so this specimen is safe to look at but not to submit."
        fields={["title", "introCopy", "form (JSON)"]}
        entry={fx.formEmbedEntry}
      />

      {/* interactiveMap */}
      <SectionSpecimen
        name="Interactive map"
        contentType="interactiveMap"
        source="features/contentful/components/interactive-map/"
        description="Leaflet map over keyless OpenStreetMap tiles, loaded client-side via next/dynamic. Points are linked mapPoint entries with a type that picks the marker."
        fields={["title", "description", "mapStyle", "points → mapPoint[]", "defaultCenter", "defaultZoom", "enableClustering", "showRouteLines"]}
        entry={fx.interactiveMapEntry}
      />

      {/* personalizedSection */}
      <SectionSpecimen
        name="Personalized section"
        contentType="personalizedSection"
        source="features/contentful/components/personalized-section/"
        description="A wrapper whose baseline entry is any other section. With Ninetailed experiences attached it swaps that baseline per audience; with none attached — as here — it renders the baseline verbatim."
        fields={["baseline → any section", "nt_experiences"]}
        entry={fx.personalizedSectionEntry}
      />

       {/* heroBanner */}
       {fx.heroBannerVariants.map((variant) => (
        <SectionSpecimen
          key={variant}
          name="Hero banner"
          contentType="heroBanner"
          variant={`variant: ${variant}`}
          source="features/contentful/components/hero-banner/"
          description={
            variant === "Primary"
              ? "Full-bleed page opener. Four variants change the composition only — the fields are identical, so an editor can restyle without re-authoring."
              : undefined
          }
          fields={["headline", "body", "heroImage", "variant", "actionButtons"]}
          entry={fx.heroBannerEntry(variant)}
        />
      ))}

      {/* Data-backed */}
      <SectionSpecimen
        name="Shelf module"
        contentType="shelfModule"
        source="features/contentful/components/shelf-module/"
        description="Query-driven shelf. The shelfApp JSON holds a search query and a 1–24 result limit rather than hand-picked items, so the row stays current without editorial upkeep."
        fields={["title", "subtitle", "shelfApp (JSON: query, limit, advanced)"]}
        note={dataBackedNote("/api/catalog/search")}
        entry={fx.shelfModuleEntry}
      />
      <SectionSpecimen
        name="Property listings"
        contentType="propertyListings"
        source="features/contentful/components/property-listings/"
        description="Editorial framing around live PMS inventory: each card pairs a Contentful pmsProperty entry with rates fetched per property at request time."
        fields={["title", "subtitle", "body", "properties → pmsProperty[]", "layout", "columns", "ctaLabel", "backgroundTheme"]}
        note={dataBackedNote("the PMS integration, once per linked property")}
        entry={fx.propertyListingsEntry}
      />
      <SectionSpecimen
        name="Knowledge base group"
        contentType="kbGroup"
        source="features/kb/kb-group-section.tsx"
        description="Lists knowledge-base articles for a group. Article links are resolved from the search index at runtime rather than stored as references."
        fields={["name", "slug", "description"]}
        note={dataBackedNote("the knowledge-base search index")}
        entry={fx.kbGroupEntry}
      />
    </SpecimenGroup>
  );
}

/* -------------------------------------------------------------------------- */
/* Blocks — reusable entries that appear inside sections and rich text         */
/* -------------------------------------------------------------------------- */

function Blocks() {
  return (
    <SpecimenGroup
      id="blocks"
      title="Blocks & inline entries"
      summary="Entries that are never a section on their own: buttons, media wrappers, and the entries that can be embedded inside a rich text field."
    >
      <Specimen
        name="Base button"
        contentType="baseButton"
        source="features/contentful/components/base-button/"
        description="Every call to action on the site. The href is derived from the linked target entry by extractUrlFromTarget, so editors pick a page rather than typing a path — and internal links stay locale-correct automatically."
        fields={["label", "target", "variant", "size", "color", "openInNewTab", "marketOverride"]}
      >
        <div className="space-y-6">
          {fx.buttonSizes.map((size) => (
            <div key={size}>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                size: {size}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {fx.buttonVariants.map((variant) => (
                  <BaseButtonWrapper
                    key={`${size}-${variant}`}
                    {...fx.baseButton(`ph-btn-${size}-${variant}`, variant, variant, size)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="FAQ item"
        contentType="faqItem"
        source="features/contentful/components/faq-module/faq-module-section.tsx"
        description="One question and a rich text answer, with an optional button. Items are authored standalone so the same question can appear in more than one FAQ module."
        fields={["question", "answer", "category", "actionButton"]}
        bleed
      >
        {/* Rendered through the module in list layout — a single faqItem has no
            standalone renderer, which is itself worth showing. */}
        <FaqModuleSection
          entry={
            {
              sys: { id: "ph-faq-single" },
              fields: {
                internalName: "Single FAQ item",
                items: [fx.faqItemEntries[0]],
                layout: "list",
                enableStructuredData: false,
              },
            } as unknown as React.ComponentProps<typeof FaqModuleSection>["entry"]
          }
        />
      </Specimen>

      <Specimen
        name="Callout"
        contentType="callout"
        source="features/contentful/components/frame/things/Callout"
        description="Media plus one idea. Used as a multiItemModule card and as a rich text embed; the `hero` display is the larger treatment."
        fields={["title", "subtitle", "button", "media"]}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              display: default
            </p>
            {thingsComponentMap.callout?.(fx.calloutEntry, "default")}
          </div>
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              display: hero
            </p>
            {thingsComponentMap.callout?.(fx.calloutEntry, "hero")}
          </div>
        </div>
      </Specimen>

      <Specimen
        name="Image wrapper"
        contentType="imageWrapper"
        source="features/contentful/components/frame/things/Image"
        description="Thin wrapper that gives a Contentful asset an entry of its own, so it can be referenced, localised and reused rather than re-uploaded."
        fields={["asset"]}
      >
        <div className="max-w-2xl">
          {thingsComponentMap.imageWrapper?.(fx.imageWrapperEntry, "default")}
        </div>
      </Specimen>

      <Specimen
        name="Pexels image wrapper"
        contentType="pexelsImageWrapper"
        source="features/contentful/components/frame/things/Image"
        description="Stock image chosen through the Pexels app. The full photo payload — every rendition plus attribution — is stored as JSON, so the credit travels with the image."
        fields={["pexelsImage (JSON)", "enableZoom", "enableBlur", "radius"]}
      >
        <div className="max-w-2xl">
          {thingsComponentMap.pexelsImageWrapper?.(fx.pexelsImageWrapperEntry, "default")}
        </div>
      </Specimen>

      <Specimen
        name="Blog post card"
        contentType="blogPost"
        source="features/contentful/components/frame/things/BlogPost"
        description="How an article appears when it is referenced from somewhere else — a fixed-height card with lead image, date and two-line standfirst, linking to /blog/{slug}. The article page itself is a route, not a section component."
        fields={["title", "slug", "publishedDate", "summary", "featuredImage", "author → person"]}
      >
        <div className="max-w-sm">
          {thingsComponentMap.blogPost?.(fx.blogPostEntry, "default")}
        </div>
      </Specimen>

      <Specimen
        name="General topic"
        contentType="generalTopic"
        source="features/contentful/components/multi-item-module/"
        description="A channel-agnostic idea: title, tagline, rich text body and media. Drives value-prop cards on the web and the same content in the mobile app."
        fields={["title", "tagline", "body", "media"]}
        bleed
      >
        {(() => {
          const Component = sectionsComponentMap.multiItemModule;
          return <Component {...(fx.multiItemModuleEntry("value-prop") as unknown as Record<string, unknown>)} />;
        })()}
      </Specimen>

      <Specimen
        name="Logo"
        contentType="logo"
        source="features/contentful/components/multi-item-module/"
        description="A named mark with an optional outbound link, shown as a strip inside a multi-item module."
        fields={["name", "image", "link → externalLink"]}
        bleed
      >
        {(() => {
          const Component = sectionsComponentMap.multiItemModule;
          return <Component {...(fx.multiItemModuleEntry("strip") as unknown as Record<string, unknown>)} />;
        })()}
      </Specimen>

      <Specimen
        name="Person"
        contentType="person"
        source="features/contentful/components/person/"
        description="Author and specialist byline. Embedded in rich text and used as the author reference on blog posts."
        fields={["firstName", "lastName", "avatar", "bio", "website", "linkedinProfileUrl"]}
      >
        <div className="max-w-2xl">{renderEmbeddedEntry(fx.personEntry, { locale: "en-US" })}</div>
      </Specimen>

      <Specimen
        name="Code snippet"
        contentType="codeSnippet"
        source="features/contentful/components/code-snippet/"
        description="Syntax-highlighted block for developer-facing pages. Embedded in rich text rather than placed as a section."
        fields={["codeBlock", "language"]}
      >
        <div className="max-w-2xl">{renderEmbeddedEntry(fx.codeSnippetEntry, { locale: "en-US" })}</div>
      </Specimen>

      <Specimen
        name="External link"
        contentType="externalLink"
        source="lib/utils.ts — extractUrlFromTarget"
        description="An outbound URL as an entry, so one link can be reused and changed in one place. The optional icon field renders a social glyph."
        fields={["title", "url", "optionalIcon"]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <BaseButtonWrapper
            {...fx.baseButton("ph-btn-external", "Open contentful.com", "Outline", "Medium", true)}
          />
          <span className="font-mono text-xs text-muted-foreground">
            target → externalLink → fields.url
          </span>
        </div>
      </Specimen>
    </SpecimenGroup>
  );
}

/* -------------------------------------------------------------------------- */
/* UI primitives                                                              */
/* -------------------------------------------------------------------------- */

function UiPrimitives() {
  return (
    <SpecimenGroup
      id="primitives"
      title="UI primitives"
      summary="The shadcn/ui layer in components/ui. Contentful components compose these rather than styling raw elements, so a token change lands everywhere at once."
    >
      <Specimen
        name="Button"
        source="components/ui/button.tsx"
        description="Six variants × four sizes. baseButton maps its Contentful enums onto these, which is why the two vocabularies differ (Primary → default, Medium → default)."
        fields={["variant", "size", "asChild", "disabled"]}
      >
        <div className="space-y-5">
          {(["default", "secondary", "outline", "ghost", "link", "destructive"] as const).map(
            (variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <code className="w-24 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {variant}
                </code>
                {(["sm", "default", "lg"] as const).map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    {size}
                  </Button>
                ))}
                <Button variant={variant} disabled>
                  disabled
                </Button>
              </div>
            )
          )}
        </div>
      </Specimen>

      <Specimen
        name="Badge"
        source="components/ui/badge.tsx"
        description="Compact status and metadata label."
        fields={["variant"]}
      >
        <div className="flex flex-wrap gap-3">
          {(["default", "secondary", "outline", "destructive"] as const).map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Alert"
        source="components/ui/alert.tsx"
        description="Inline notice primitive. The Contentful alert section composes this."
        fields={["variant", "AlertTitle", "AlertDescription"]}
      >
        <div className="space-y-4">
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              The default variant sits on the card surface with a hairline border.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              The destructive variant tints border and text with the destructive token.
            </AlertDescription>
          </Alert>
        </div>
      </Specimen>

      <Specimen
        name="Card"
        source="components/ui/card.tsx"
        description="Container with header, content, footer and an action slot that right-aligns into the header row."
        fields={["CardHeader", "CardTitle", "CardDescription", "CardAction", "CardContent", "CardFooter"]}
      >
        <div className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>One line describing what this card holds.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm">
                  Action
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Content sits on the card surface, which is a distinct token from the page ground.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Confirm</Button>
            </CardFooter>
          </Card>
        </div>
      </Specimen>

      <Specimen
        name="Avatar"
        source="components/ui/avatar.tsx"
        description="Image with a text fallback for when the asset is missing or still loading."
        fields={["AvatarImage", "AvatarFallback"]}
      >
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="https://picsum.photos/seed/avatar/128/128" alt="Ada Placeholder" />
            <AvatarFallback>AP</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="" alt="" />
            <AvatarFallback>AP</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">image, then fallback</span>
        </div>
      </Specimen>

      <Specimen
        name="Form controls"
        source="components/ui/{input,label,select}.tsx"
        description="The field primitives the form embed composes. Focus states come from --ring, so they follow the theme."
        fields={["Input", "Label", "Select"]}
      >
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ds-email">Email</Label>
            <Input id="ds-email" type="email" placeholder="ada@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-disabled">Disabled</Label>
            <Input id="ds-disabled" placeholder="Not editable" disabled />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ds-role">Role</Label>
            <Select>
              <SelectTrigger id="ds-role">
                <SelectValue placeholder="Pick one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Specimen>

      <Specimen
        name="Separator"
        source="components/ui/separator.tsx"
        description="One-pixel rule in either orientation, at the border token."
        fields={["orientation", "decorative"]}
      >
        <div className="max-w-md">
          <p className="text-sm">Above</p>
          <Separator className="my-4" />
          <p className="text-sm">Below</p>
          <div className="mt-6 flex h-10 items-center gap-4 text-sm">
            <span>Left</span>
            <Separator orientation="vertical" />
            <span>Right</span>
          </div>
        </div>
      </Specimen>

      <Specimen
        name="Skeleton"
        source="components/ui/skeleton.tsx"
        description="Loading placeholder. Data-backed sections show these while their fetch is in flight."
        fields={["className"]}
      >
        <div className="max-w-md space-y-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Specimen>

      <Specimen
        name="Overlays"
        source="components/ui/{dialog,sheet,dropdown-menu,tooltip}.tsx"
        description="Radix-backed overlays. All four share the popover surface token and the same radius scale, so they read as one family."
        fields={["Dialog", "Sheet", "DropdownMenu", "Tooltip"]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogDescription>
                  Centred modal on the popover surface, with a scrim behind it.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary">Cancel</Button>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet title</SheetTitle>
                <SheetDescription>
                  Edge-anchored panel — the mobile navigation uses this.
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Short label, no interactive content</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Specimen>
    </SpecimenGroup>
  );
}

/* -------------------------------------------------------------------------- */
/* Page shell                                                                 */
/* -------------------------------------------------------------------------- */

const navGroups: Array<{ id: string; label: string; count: string }> = [
  { id: "foundations", label: "Foundations", count: "tokens, type, radius, prose" },
  { id: "sections", label: "Page sections", count: `${Object.keys(sectionsComponentMap).length} content types` },
  { id: "blocks", label: "Blocks & inline entries", count: "buttons, media, embeds" },
  { id: "primitives", label: "UI primitives", count: "components/ui" },
];

export default function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            /design/system
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">Design system</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Every component this site renders, shown with placeholder content and labelled with its
            Contentful content type and source path. Sections are rendered through the real component
            map, so what you see here is what a page gets.
          </p>

          <nav className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {navGroups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-accent"
              >
                <span className="block text-sm font-medium">{group.label}</span>
                <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                  {group.count}
                </span>
              </a>
            ))}
          </nav>

          <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">Placeholder data.</strong> Nothing on this
            page is fetched from Contentful — the entries are hand-built fixtures in{" "}
            <code className="font-mono text-xs">app/design/system/fixtures.ts</code>. Images come from
            a placeholder service, and a few modules whose content arrives from a runtime API are
            marked as such.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-6 py-16">
        <Foundations />
        <SectionModules />
        <Blocks />
        <UiPrimitives />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
          Section registrations live in{" "}
          <code className="font-mono text-xs">features/contentful/component-maps/sections.ts</code>.
          Add a content type there and it appears on every page type — and here, once a fixture is
          added.
        </div>
      </footer>
    </div>
  );
}

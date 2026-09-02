/**
 * Placeholder Contentful entries for the /design/system showcase.
 *
 * These are hand-built runtime shapes, not fetched data. Three rules matter:
 *
 * 1. Every entry carries `sys.contentType.sys.id`. Several components dispatch on
 *    it (`multiItemModule` picks a card by item content type) and `extractUrlFromTarget`
 *    reads it to build button hrefs.
 * 2. Asset `file.url` values are **protocol-relative** (`//host/path`). Components
 *    prefix `https:` unconditionally (multiItemModule, richContentModule), so an
 *    absolute URL would come out as `https:https://…`. Plain-string image fields
 *    (productCatalog JSON, pexels JSON) take a full `https://` URL instead.
 * 3. No entry sets `nt_experiences`. That makes each `Personalized*` wrapper fall
 *    straight through to its plain wrapper, so no Ninetailed `Experience` is mounted
 *    and the specimens render deterministically.
 */
import type { Document } from "@contentful/rich-text-types";
import type {
  IAlert,
  IBaseButton,
  ICallout,
  ICodeSnippet,
  ICta,
  IExternalUrl,
  IFaqItem,
  IFaqModule,
  IFormEmbed,
  IGeneralTopic,
  IHeroBanner,
  IHeroModule,
  IImageWrapper,
  IInteractiveMap,
  IKbGroup,
  ILogo,
  IMultiItemModule,
  IPersonalizedSection,
  IPexelsImageWrapper,
  IPerson,
  IProductCatalog,
  IPropertyListings,
  IShelfModule,
} from "@/features/contentful/type";

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

/** Wraps fields in the minimum `sys` shape the components read. */
function entry(id: string, contentTypeId: string, fields: unknown) {
  return {
    sys: {
      id,
      type: "Entry",
      contentType: { sys: { type: "Link", linkType: "ContentType", id: contentTypeId } },
    },
    fields,
  };
}

/** Protocol-relative placeholder asset, matching Contentful's own `//images.ctfassets.net/…`. */
function asset(id: string, seed: string, width = 1600, height = 900, title = "Placeholder image") {
  return {
    sys: { id, type: "Asset" },
    fields: {
      title,
      description: `Placeholder ${width}×${height} image`,
      file: {
        url: `//picsum.photos/seed/${seed}/${width}/${height}`,
        fileName: `${seed}.jpg`,
        contentType: "image/jpeg",
        details: { size: 180_000, image: { width, height } },
      },
    },
  };
}

function text(value: string, marks: string[] = []) {
  return { nodeType: "text", value, marks: marks.map((type) => ({ type })), data: {} };
}

function paragraph(value: string) {
  return { nodeType: "paragraph", data: {}, content: [text(value)] };
}

/** Minimal rich text document from one or more paragraphs. */
export function richText(...paragraphs: string[]): Document {
  return {
    nodeType: "document",
    data: {},
    content: paragraphs.map(paragraph),
  } as unknown as Document;
}

/** Exercises every mark and block type `baseRichTextOptions` styles. */
export const longFormDocument: Document = {
  nodeType: "document",
  data: {},
  content: [
    {
      nodeType: "paragraph",
      data: {},
      content: [
        text("Rich text renders through "),
        text("baseRichTextOptions", ["code"]),
        text(", so "),
        text("bold", ["bold"]),
        text(", "),
        text("italic", ["italic"]),
        text(" and "),
        text("underline", ["underline"]),
        text(" marks all pick up the shared prose styles."),
      ],
    },
    { nodeType: "heading-2", data: {}, content: [text("A heading two")] },
    paragraph(
      "Body copy sits at the muted foreground token so it recedes behind headings without losing contrast."
    ),
    { nodeType: "heading-3", data: {}, content: [text("A heading three")] },
    {
      nodeType: "unordered-list",
      data: {},
      content: [
        { nodeType: "list-item", data: {}, content: [paragraph("An unordered list item")] },
        { nodeType: "list-item", data: {}, content: [paragraph("A second item, slightly longer, to show wrapping")] },
      ],
    },
    {
      nodeType: "ordered-list",
      data: {},
      content: [
        { nodeType: "list-item", data: {}, content: [paragraph("First ordered item")] },
        { nodeType: "list-item", data: {}, content: [paragraph("Second ordered item")] },
      ],
    },
    {
      nodeType: "blockquote",
      data: {},
      content: [paragraph("A pull quote, styled with a primary-tinted left border and muted fill.")],
    },
    { nodeType: "hr", data: {}, content: [] },
    {
      nodeType: "paragraph",
      data: {},
      content: [
        text("Links inherit the primary colour — "),
        {
          nodeType: "hyperlink",
          data: { uri: "https://www.contentful.com" },
          content: [text("contentful.com")],
        },
        text("."),
      ],
    },
  ],
} as unknown as Document;

/* -------------------------------------------------------------------------- */
/* Shared leaf entries                                                        */
/* -------------------------------------------------------------------------- */

export const externalUrlEntry = entry("ph-external-url", "externalLink", {
  internalTitle: "Placeholder external link",
  title: "Contentful",
  url: "https://www.contentful.com",
}) as unknown as IExternalUrl;

/** Button targets must be resolvable by `extractUrlFromTarget`. */
const landingPageTarget = entry("ph-landing-page-target", "landingPage", {
  internalTitle: "Design system landing page",
  title: "Design system",
  slug: "design-system",
});

const blogPostTarget = entry("ph-blog-post-target", "blogPost", {
  internalTitle: "Placeholder article",
  title: "How we keep a design system honest",
  slug: "keeping-a-design-system-honest",
});

/* -------------------------------------------------------------------------- */
/* baseButton                                                                 */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "Primary" | "Secondary" | "Destructive" | "Ghost" | "Outline";
type ButtonSize = "Small" | "Medium" | "Large";

export function baseButton(
  id: string,
  label: string,
  variant: ButtonVariant = "Primary",
  size: ButtonSize = "Medium",
  openInNewTab = false
): IBaseButton {
  return entry(id, "baseButton", {
    internalTitle: `${variant} / ${size} button`,
    label,
    // Vary the target kind across the matrix so the specimen page also
    // exercises the three branches of `extractUrlFromTarget` that buttons hit
    // most: external URL, landing page slug, and blog post slug.
    target:
      variant === "Ghost"
        ? externalUrlEntry
        : variant === "Outline"
          ? blogPostTarget
          : landingPageTarget,
    openInNewTab,
    color: "Default",
    size,
    variant,
  }) as unknown as IBaseButton;
}

export const buttonVariants: ButtonVariant[] = [
  "Primary",
  "Secondary",
  "Outline",
  "Ghost",
  "Destructive",
];
export const buttonSizes: ButtonSize[] = ["Small", "Medium", "Large"];

const primaryButton = baseButton("ph-btn-primary", "Get started", "Primary", "Medium");
const secondaryButton = baseButton("ph-btn-secondary", "Learn more", "Secondary", "Medium");
const buttonPair = [primaryButton, secondaryButton];

/* -------------------------------------------------------------------------- */
/* heroBanner                                                                 */
/* -------------------------------------------------------------------------- */

export type HeroBannerVariant = "Primary" | "Centered" | "With Background Image" | "Right Aligned";

export const heroBannerVariants: HeroBannerVariant[] = [
  "Primary",
  "Centered",
  "With Background Image",
  "Right Aligned",
];

export function heroBannerEntry(variant: HeroBannerVariant): IHeroBanner {
  return entry(`ph-hero-banner-${variant.replace(/\s+/g, "-").toLowerCase()}`, "heroBanner", {
    internalTitle: `Hero banner — ${variant}`,
    // `IHeroBanner.fields.headline` is typed `Symbol`, but the wrapper passes it
    // straight to `documentToReactComponents`, so at runtime it has to be a
    // rich text Document. The component wins — a string crashes it.
    headline: richText("A headline that carries the page"),
    body: "Supporting copy sits under the headline and runs two lines at most, so the composition stays calm at every breakpoint.",
    heroImage: asset("ph-asset-hero-banner", "hero-banner", 1920, 1080, "Hero banner backdrop"),
    variant,
    actionButtons: buttonPair,
  }) as unknown as IHeroBanner;
}

/* -------------------------------------------------------------------------- */
/* heroModule                                                                 */
/* -------------------------------------------------------------------------- */

const imageWithFocalPointEntry = entry("ph-image-focal-point", "imageWithFocalPoint", {
  title: "Hero module backdrop",
  image: asset("ph-asset-hero-module", "hero-module", 2400, 1000, "Hero module backdrop"),
  focalPoint: { focalPoint: { x: 0.35, y: 0.45 } },
});

export type HeroSize = "Small" | "Medium" | "Large";
export type HeroContrast =
  | "Light on dark"
  | "Dark on light"
  | "Light (no scrim)"
  | "Dark (no scrim)"
  | "Transparent"
  | "Dark Transparent";

export const heroSizes: HeroSize[] = ["Small", "Medium", "Large"];
export const heroContrasts: HeroContrast[] = [
  "Light on dark",
  "Dark on light",
  "Light (no scrim)",
  "Transparent",
];

export function heroModuleEntry(
  id: string,
  { size = "Medium", textContrast = "Light on dark" }: { size?: HeroSize; textContrast?: HeroContrast } = {}
): IHeroModule {
  return entry(id, "heroModule", {
    internalTitle: `Hero module — ${size} / ${textContrast}`,
    headline: "Editorial hero with an anchored text block",
    subCopy:
      "The Content Anchor app stores the text position as a 0–1 fraction, so the same entry composes on any aspect ratio.",
    image: imageWithFocalPointEntry,
    textAnchor: { x: 0.08, y: 0.5, version: 1 },
    textContrast,
    size,
    buttons: [primaryButton],
    // Required in the content model — the components read it for analytics.
    trackingName: "design-system-hero",
    metricEventName: "hero_cta_click",
  }) as unknown as IHeroModule;
}

/* -------------------------------------------------------------------------- */
/* cta                                                                        */
/* -------------------------------------------------------------------------- */

export type CtaVariant = "Simple" | "Smooth";
export type CtaBackground = "Primary" | "Secondary" | "Default" | "None";

export const ctaVariants: CtaVariant[] = ["Simple", "Smooth"];
export const ctaBackgrounds: CtaBackground[] = ["Default", "Primary", "Secondary", "None"];

export function ctaEntry(
  id: string,
  {
    variant = "Simple",
    backgroundColor = "Default",
    imagePlacement = "Right",
  }: { variant?: CtaVariant; backgroundColor?: CtaBackground; imagePlacement?: "Left" | "Right" } = {}
): ICta {
  return entry(id, "cta", {
    internalTitle: `CTA — ${variant} / ${backgroundColor}`,
    title: "Ready to put this to work?",
    body: "Two short sentences is the sweet spot. Anything longer and the CTA starts competing with the section above it.",
    images: [asset(`ph-asset-cta-${id}`, `cta-${id}`, 1200, 900, "CTA supporting image")],
    actionButtons: buttonPair,
    backgroundColor,
    variant,
    imagePlacement,
    metricEventName: "cta_click",
  }) as unknown as ICta;
}

/* -------------------------------------------------------------------------- */
/* alert                                                                      */
/* -------------------------------------------------------------------------- */

export type AlertVariant = "info" | "warning" | "success" | "error" | "default";

export const alertVariants: AlertVariant[] = ["info", "success", "warning", "error", "default"];

const alertCopy: Record<AlertVariant, { title: string; body: string }> = {
  info: { title: "Scheduled maintenance", body: "The catalogue is read-only between 02:00 and 04:00 UTC on Sunday." },
  success: { title: "Changes published", body: "Your edits are live in every locale that inherits from en-US." },
  warning: { title: "Two locales are incomplete", body: "da-DK and nb-NO are missing translations for four fields." },
  error: { title: "Publish failed", body: "One required reference is still in draft. Publish it first, then retry." },
  default: { title: "A neutral notice", body: "Use the default variant when the message carries no status." },
};

export function alertEntry(variant: AlertVariant): IAlert {
  return entry(`ph-alert-${variant}`, "alert", {
    internalName: `Alert — ${variant}`,
    title: alertCopy[variant].title,
    content: richText(alertCopy[variant].body),
    variant,
    dismissible: variant === "info",
    showIcon: true,
    actionButton: variant === "error" ? baseButton("ph-btn-alert", "View details", "Outline", "Small") : undefined,
  }) as unknown as IAlert;
}

/* -------------------------------------------------------------------------- */
/* faqItem / faqModule                                                        */
/* -------------------------------------------------------------------------- */

const faqSource: Array<{ question: string; answer: Document; category: string }> = [
  {
    question: "How do I add a new section type to a landing page?",
    answer: richText(
      "Create the content type, add a React component under features/contentful/components, then register it in the sections component map keyed by content type id.",
      "The map is the only wiring step — the landing page renders whatever it finds there."
    ),
    category: "Content modelling",
  },
  {
    question: "Which layouts does the FAQ module support?",
    answer: richText(
      "Accordion (one column, collapsible), two-column (collapsible, balanced across two columns) and list (always expanded, grouped by category)."
    ),
    category: "Content modelling",
  },
  {
    question: "Do the questions appear in search results?",
    answer: richText(
      "When enableStructuredData is on, the module emits a JSON-LD FAQPage alongside the markup, which is what search engines read for rich results."
    ),
    category: "SEO",
  },
  {
    question: "Can an answer contain links and lists?",
    answer: longFormDocument,
    category: "SEO",
  },
];

export const faqItemEntries: IFaqItem[] = faqSource.map(
  (item, index) =>
    entry(`ph-faq-item-${index}`, "faqItem", {
      internalName: `FAQ item ${index + 1}`,
      question: item.question,
      answer: item.answer,
      category: item.category,
      actionButton: index === 0 ? baseButton("ph-btn-faq", "Read the guide", "Ghost", "Small") : undefined,
    }) as unknown as IFaqItem
);

export type FaqLayout = "accordion" | "two-column" | "list";

export const faqLayouts: FaqLayout[] = ["accordion", "two-column", "list"];

export function faqModuleEntry(layout: FaqLayout): IFaqModule {
  return entry(`ph-faq-module-${layout}`, "faqModule", {
    internalName: `FAQ module — ${layout}`,
    title: "Frequently asked questions",
    subtitle: "Four questions, each answered in rich text so links and lists survive.",
    items: faqItemEntries,
    layout,
    allowMultipleOpen: layout === "two-column",
    enableStructuredData: true,
    actionButton: baseButton(`ph-btn-faq-${layout}`, "Contact support", "Secondary", "Medium"),
  }) as unknown as IFaqModule;
}

/* -------------------------------------------------------------------------- */
/* Blocks used inside multiItemModule and rich text                           */
/* -------------------------------------------------------------------------- */

export const logoEntries: ILogo[] = ["monogram", "wordmark", "emblem", "seal", "crest", "sigil"].map(
  (name, index) =>
    entry(`ph-logo-${index}`, "logo", {
      internalName: `Logo ${index + 1}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      image: asset(`ph-asset-logo-${index}`, `logo-${index}`, 400, 200, `${name} logo`),
      link: externalUrlEntry,
    }) as unknown as ILogo
);

export const generalTopicEntries: IGeneralTopic[] = [
  {
    title: "One entry, every surface",
    tagline: "Reuse",
    body: "A generalTopic drives the web hero and the mobile app card from a single set of fields.",
  },
  {
    title: "Anchored, not hard-coded",
    tagline: "Composition",
    body: "Text position is stored as a fraction of the frame, so one entry survives every aspect ratio.",
  },
  {
    title: "Tokens all the way down",
    tagline: "Theming",
    body: "Colour, radius and type come from CSS custom properties, so a theme swap needs no component changes.",
  },
].map(
  (topic, index) =>
    entry(`ph-general-topic-${index}`, "generalTopic", {
      internalName: `General topic ${index + 1}`,
      title: topic.title,
      tagline: topic.tagline,
      body: richText(topic.body),
      media: asset(`ph-asset-topic-${index}`, `topic-${index}`, 800, 800, topic.title),
    }) as unknown as IGeneralTopic
);

export const calloutEntry = entry("ph-callout", "callout", {
  internalTitle: "Placeholder callout",
  title: richText("A callout carries one idea"),
  subtitle: richText("Supporting line, kept to a single sentence so the media stays the focus."),
  button: baseButton("ph-btn-callout", "See how", "Outline", "Medium"),
  media: asset("ph-asset-callout", "callout", 1200, 800, "Callout media"),
}) as unknown as ICallout;

export const imageWrapperEntry = entry("ph-image-wrapper", "imageWrapper", {
  internalTitle: "Placeholder image wrapper",
  asset: asset("ph-asset-image-wrapper", "image-wrapper", 1600, 1000, "Wrapped image"),
}) as unknown as IImageWrapper;

export const pexelsImageWrapperEntry = entry("ph-pexels-image-wrapper", "pexelsImageWrapper", {
  internalTitle: "Placeholder Pexels image",
  // Plain-string JSON field — needs an absolute URL, unlike Contentful assets.
  pexelsImage: {
    photographer: "Placeholder Photographer",
    photographer_url: "https://www.pexels.com",
    image: "https://picsum.photos/seed/pexels/1600/1000",
    src: {
      original: "https://picsum.photos/seed/pexels/2400/1600",
      large2x: "https://picsum.photos/seed/pexels/1920/1280",
      large: "https://picsum.photos/seed/pexels/1200/800",
      medium: "https://picsum.photos/seed/pexels/800/533",
      small: "https://picsum.photos/seed/pexels/400/267",
      portrait: "https://picsum.photos/seed/pexels/800/1200",
      landscape: "https://picsum.photos/seed/pexels/1200/628",
      tiny: "https://picsum.photos/seed/pexels/280/200",
    },
    alt: "Placeholder photograph",
    avg_color: "#7c7c7c",
    url: "https://www.pexels.com",
    attribution: "Photo via Pexels",
    photographer_attribution: "Placeholder Photographer / Pexels",
    width: 2400,
    height: 1600,
  },
  enableZoom: true,
  enableBlur: false,
  radius: "Large",
}) as unknown as IPexelsImageWrapper;

export const personEntry = entry("ph-person", "person", {
  internalTitle: "Placeholder person",
  firstName: "Ada",
  lastName: "Placeholder",
  avatar: asset("ph-asset-avatar", "avatar", 400, 400, "Ada Placeholder"),
  bio: "Design systems lead. Writes about tokens, spacing scales, and the cost of a one-off component.",
  website: externalUrlEntry,
  linkedinProfileUrl: externalUrlEntry,
}) as unknown as IPerson;

export const codeSnippetEntry = entry("ph-code-snippet", "codeSnippet", {
  internalTitle: "Placeholder code snippet",
  language: "tsx",
  codeBlock: `// Register a section so landing pages can render it.
export const sectionsComponentMap: Record<string, FC<any>> = {
  heroBanner: PersonalizedHeroBanner,
  faqModule: PersonalizedFaqModule,
};`,
}) as unknown as ICodeSnippet;

export const blogPostEntry = entry("ph-blog-post", "blogPost", {
  internalTitle: "Placeholder article",
  title: "How we keep a design system honest",
  slug: "keeping-a-design-system-honest",
  publishedDate: "2026-05-04T09:00:00.000Z",
  summary: richText("A short standfirst, two lines at most, used on cards and in the share preview."),
  body: longFormDocument,
  featuredImage: asset("ph-asset-blog", "blog-post", 1600, 1000, "Article lead image"),
  author: personEntry,
}) as unknown as unknown;

/* -------------------------------------------------------------------------- */
/* multiItemModule                                                            */
/* -------------------------------------------------------------------------- */

export type MultiItemLayout = "carousel" | "grid" | "strip" | "list" | "value-prop";

export const multiItemLayouts: MultiItemLayout[] = ["grid", "carousel", "list", "strip", "value-prop"];

const multiItemHeroes = [0, 1, 2].map((index) =>
  entry(`ph-mim-hero-${index}`, "heroModule", {
    internalTitle: `Carousel slide ${index + 1}`,
    headline: ["Autumn collection", "New arrivals", "Editor's picks"][index],
    subCopy: "One line of supporting copy, sized to survive the narrowest card.",
    image: entry(`ph-mim-focal-${index}`, "imageWithFocalPoint", {
      title: `Slide ${index + 1}`,
      image: asset(`ph-asset-mim-${index}`, `mim-${index}`, 1600, 900, `Slide ${index + 1}`),
      focalPoint: { focalPoint: { x: 0.5, y: 0.4 } },
    }),
    textAnchor: { x: 0.1, y: 0.6, version: 1 },
    textContrast: "Light on dark",
    size: "Medium",
    buttons: [baseButton(`ph-btn-mim-${index}`, "Shop now", "Primary", "Small")],
    trackingName: `design-system-slide-${index}`,
  })
);

export function multiItemModuleEntry(layout: MultiItemLayout): IMultiItemModule {
  const isLogoStrip = layout === "strip";
  const isValueProp = layout === "value-prop";

  const items = isLogoStrip ? logoEntries : isValueProp ? generalTopicEntries : multiItemHeroes;

  return entry(`ph-multi-item-${layout}`, "multiItemModule", {
    internalName: `Multi-item module — ${layout}`,
    title: isLogoStrip ? "Trusted by" : isValueProp ? "Why teams choose it" : "Featured",
    subtitle: isLogoStrip ? undefined : "One module, five layouts — the item content type decides the card.",
    items,
    layout,
    columns: 3,
    autoplay: layout === "carousel",
    autoplayDelayMs: 5000,
    showArrows: true,
    showDots: true,
    backgroundTheme: isValueProp ? "alt" : "default",
    actionButton: isLogoStrip ? undefined : baseButton(`ph-btn-mim-${layout}`, "View all", "Ghost", "Medium"),
    metricEventName: "carousel_item_click",
  }) as unknown as IMultiItemModule;
}

/* -------------------------------------------------------------------------- */
/* richContentModule                                                          */
/* -------------------------------------------------------------------------- */

export type RichContentLayout = "full-width" | "two-column-left" | "two-column-right";

export const richContentLayouts: RichContentLayout[] = [
  "full-width",
  "two-column-left",
  "two-column-right",
];

export function richContentModuleEntry(layout: RichContentLayout) {
  return entry(`ph-rich-content-${layout}`, "richContentModule", {
    internalTitle: `Rich content module — ${layout}`,
    title: "Long-form copy with one supporting image",
    body: longFormDocument,
    image: asset(`ph-asset-rich-${layout}`, `rich-${layout}`, 1400, 1000, "Supporting image"),
    imageAlignment: layout === "full-width" ? "right" : "center",
    layout,
  });
}

/* -------------------------------------------------------------------------- */
/* Data-backed modules                                                        */
/* -------------------------------------------------------------------------- */

export const formEmbedEntry = entry("ph-form-embed", "formEmbed", {
  internalTitle: "Placeholder form",
  title: "Join the design system mailing list",
  introCopy: "One email a month covering token changes, deprecations, and new modules.",
  form: {
    selectedForm: {
      id: "design-system-signup",
      slug: "design-system-signup",
      name: "Design system signup",
      title: "Join the design system mailing list",
      description: "Placeholder form definition — nothing is submitted from this page.",
      successMessage: "You're on the list.",
      submitButtonText: "Subscribe",
      fields: [
        { id: "firstName", type: "text", label: "First name", required: true, placeholder: "Ada", width: "half" },
        { id: "lastName", type: "text", label: "Last name", required: false, placeholder: "Placeholder", width: "half" },
        { id: "email", type: "email", label: "Email", required: true, placeholder: "ada@example.com", width: "full" },
        {
          id: "role",
          type: "select",
          label: "Role",
          required: false,
          placeholder: "Pick one",
          width: "half",
          options: [
            { value: "design", label: "Design" },
            { value: "engineering", label: "Engineering" },
            { value: "content", label: "Content" },
          ],
        },
        {
          id: "cadence",
          type: "radio",
          label: "How often?",
          required: false,
          width: "half",
          options: [
            { value: "monthly", label: "Monthly" },
            { value: "quarterly", label: "Quarterly" },
          ],
        },
        {
          id: "notes",
          type: "textarea",
          label: "Anything you'd like covered?",
          required: false,
          placeholder: "Optional",
          width: "full",
          helpText: "Free text, 500 characters or fewer.",
        },
        { id: "consent", type: "consent", label: "I agree to receive these emails.", required: true, width: "full" },
      ],
    },
  },
}) as unknown as IFormEmbed;

const placeholderProducts = [
  { id: "p-1", title: "Ceramic pour-over set", price: 48, sku: "CER-001" },
  { id: "p-2", title: "Burr grinder, matte black", price: 129, sku: "GRD-014" },
  { id: "p-3", title: "Single-origin subscription", price: 24, sku: "SUB-003" },
  { id: "p-4", title: "Insulated travel flask", price: 32, sku: "FLK-009" },
].map((product, index) => ({
  ...product,
  currency: "GBP",
  // Plain-string JSON field — absolute URL.
  image: `https://picsum.photos/seed/product-${index}/800/800`,
  category: "Brewing",
}));

export function productCatalogEntry(selectionMode: "single" | "multiple"): IProductCatalog {
  return entry(`ph-product-catalog-${selectionMode}`, "productCatalog", {
    internalTitle: `Product catalog — ${selectionMode}`,
    title: selectionMode === "single" ? "Our best seller" : "Shop the collection",
    body:
      selectionMode === "single"
        ? "A single product renders as a CTA-style split, with the image opposite the copy."
        : "Multiple products render as a price-bearing grid.",
    products:
      selectionMode === "single"
        ? { selectionMode: "single", selectedProduct: placeholderProducts[0] }
        : { selectionMode: "multiple", selectedProducts: placeholderProducts },
    cta: baseButton(`ph-btn-catalog-${selectionMode}`, "View product", "Primary", "Medium"),
  }) as unknown as IProductCatalog;
}

export const shelfModuleEntry = entry("ph-shelf-module", "shelfModule", {
  internalTitle: "Shelf module",
  title: "From the library",
  subtitle: "Results come live from /api/catalog/search, so this specimen needs the dev server running.",
  shelfApp: { query: "coffee", limit: 6, advanced: { subject: "coffee" } },
}) as unknown as IShelfModule;

export const kbGroupEntry = entry("ph-kb-group", "kbGroup", {
  name: "Getting started",
  slug: "getting-started",
  description:
    "Groups knowledge-base articles by slug. Article links are resolved at runtime from the search index.",
}) as unknown as IKbGroup;

const pmsPropertyEntries = [0, 1, 2].map((index) =>
  entry(`ph-pms-property-${index}`, "pmsProperty", {
    internalName: `Property ${index + 1}`,
    propertyId: `prop-${index + 1}`,
    slug: `placeholder-property-${index + 1}`,
    editorialTitle: ["Harbour townhouse", "Garden apartment", "Loft above the bakery"][index],
    editorialIntro: richText("Editorial intro copy, shown above whatever the PMS returns for this property."),
    gallery: [asset(`ph-asset-property-${index}`, `property-${index}`, 1200, 800, `Property ${index + 1}`)],
  })
);

export const propertyListingsEntry = entry("ph-property-listings", "propertyListings", {
  internalName: "Property listings",
  title: "Places to stay",
  subtitle: "Editorial framing around live PMS inventory.",
  body: "Each card merges a Contentful pmsProperty entry with rates fetched from the PMS at request time.",
  properties: pmsPropertyEntries,
  layout: "grid",
  columns: 3,
  ctaLabel: "See all stays",
  ctaUrl: "/properties",
  backgroundTheme: "default",
}) as unknown as IPropertyListings;

const mapPointEntries: Array<{ title: string; type: string; lat: number; lon: number }> = [
  { title: "King's Cross", type: "Station", lat: 51.5308, lon: -0.1238 },
  { title: "British Library", type: "Building", lat: 51.5299, lon: -0.1276 },
  { title: "Regent's Park", type: "Park", lat: 51.5313, lon: -0.1570 },
  { title: "Granary Square", type: "Restaurant", lat: 51.5352, lon: -0.1256 },
];

export const interactiveMapEntry = entry("ph-interactive-map", "interactiveMap", {
  internalTitle: "Interactive map",
  title: "Around the neighbourhood",
  description: richText("Leaflet map with clustered points, rendered client-side from mapPoint entries."),
  mapStyle: "light",
  animation: "fadeIn",
  isActive: true,
  defaultZoom: 13,
  defaultCenter: { lat: 51.5313, lon: -0.1276 },
  enableClustering: true,
  showRouteLines: false,
  points: mapPointEntries.map((point, index) =>
    entry(`ph-map-point-${index}`, "mapPoint", {
      internalTitle: point.title,
      title: point.title,
      pointType: point.type,
      location: { lat: point.lat, lon: point.lon },
      summary: richText(`${point.title} — a placeholder point of interest.`),
    })
  ),
}) as unknown as IInteractiveMap;

export const personalizedSectionEntry = entry("ph-personalized-section", "personalizedSection", {
  internalTitle: "Personalized section",
  baseline: ctaEntry("ph-personalized-baseline", { variant: "Simple", backgroundColor: "Secondary" }),
}) as unknown as IPersonalizedSection;

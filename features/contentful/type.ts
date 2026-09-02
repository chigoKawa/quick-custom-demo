/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entry, EntryFields, Asset, EntrySkeletonType } from "contentful";
// Type-only: `SiteSkeleton` lives next to `SiteSettingsSkeleton`, which it
// references. `import type` is erased at compile time, so this pulls no
// server-side module into a client bundle.
import type { SiteSkeleton } from "@/lib/site-settings";

type JsonObject = { [key: string]: any };

export interface IMicrocopy extends Entry {
  fields: {
    key: EntryFields.Symbol;
    value: EntryFields.Symbol;
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type MicrocopySkeleton = {
  contentTypeId: "microcopy";
  fields: IMicrocopy["fields"];
};

export interface IExternalUrl extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title: EntryFields.Symbol;
    url: EntryFields.Symbol;
    optionalIcon?: EntryFields.Symbol<
      "Twitter" | "Instagram" | "Facebook" | "TikTok" | "LinkedIn" | "Github"
    >;
  };
}

export type CtaSkeleton = {
  contentTypeId: "cta";
  fields: ICta["fields"];
};

export interface IBaseButton extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    label: EntryFields.Symbol;
    target: IExternalUrl | ILandingPage | IBlogPostPage | ICategoryPage | IProductStory | IPmsPropertyEntry | IProductCategory | ICampaign | IAuction | ILotReference;
    openInNewTab?: EntryFields.Boolean;
    color: EntryFields.Symbol<
      "Default" | "Primary" | "Secondary" | "Success" | "Danger" | "Warning"
    >;
    size: EntryFields.Symbol<"Small" | "Medium" | "Large">;
    variant: EntryFields.Symbol<
      "Primary" | "Secondary" | "Destructive" | "Ghost" | "Outline"
    >;
    /** Optional per-market overrides for this button (e.g. label). Managed by the Market Override Helper app. */
    marketOverride?: EntryFields.Object<JsonObject>;
  };
}

export interface ISeo extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title: EntryFields.Symbol;
    description: EntryFields.Symbol;
    ogImage: Asset;
    noIndex: EntryFields.Boolean;
    noFollow: EntryFields.Boolean;
  };
}

export interface ICta extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    images: EntryFields.Array<Asset>;
    body?: EntryFields.Text;
    actionButtons: EntryFields.Array<IBaseButton>;
    backgroundColor: EntryFields.Symbol<
      "Primary" | "Secondary" | "Default" | "None"
    >;
    variant: EntryFields.Symbol<"Simple" | "Smooth">;
    imagePlacement?: EntryFields.Symbol<"Left" | "Right">;
    nt_experiences?: Entry<EntrySkeletonType>[];
    metricEventName?: EntryFields.Symbol;
  };
}

export interface IHeroBanner extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    headline?: EntryFields.Symbol;
    heroImage: Asset;
    body?: EntryFields.Text;
    variant: EntryFields.Symbol<
      "Primary" | "Centered" | "With Background Image" | "Right Aligned"
    >;
    actionButtons: EntryFields.Array<IBaseButton>;
    nt_experiences: Entry<EntrySkeletonType>[];
  };
}
export type HeroBannerSkeleton = {
  contentTypeId: "heroBanner";
  fields: IHeroBanner["fields"];
};

export interface IImageWithFocalPoint extends Entry {
  fields: {
    title: EntryFields.Symbol;
    image: Asset;
    focalPoint: EntryFields.Object<JsonObject>;
  };
}

export type ImageWithFocalPointSkeleton = {
  contentTypeId: "imageWithFocalPoint";
  fields: IImageWithFocalPoint["fields"];
};

export type TextContrastOption =
  | "Light on dark"
  | "Dark on light"
  | "Light (no scrim)"
  | "Dark (no scrim)"
  | "Transparent"
  | "Dark Transparent";

export interface TextAnchorValue extends JsonObject {
  /** Horizontal position as a 0–1 fraction of the banner width, origin left. */
  x: number;
  /** Vertical position as a 0–1 fraction of the banner height, origin top. */
  y: number;
  version: 1;
}

export type HeroSizeOption = "Small" | "Medium" | "Large";

export interface IHeroModule extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    headline?: EntryFields.Symbol;
    subCopy?: EntryFields.Text;
    /** Optional reference to a shared generalTopic. When set, its title/body
     *  override headline/subCopy. Enables a single piece of content to drive
     *  web hero + mobile app hero from one entry. */
    topic?: IGeneralTopic;
    image?: EntryFields.EntryLink<ImageWithFocalPointSkeleton>;
    /** Managed by the Content Anchor app. Replaces imagePlacement. */
    textAnchor?: EntryFields.Object<TextAnchorValue>;
    /** Controls text colour and background scrim behind the text block. */
    textContrast?: EntryFields.Symbol<TextContrastOption>;
    /** Controls the banner aspect ratio. Small=4:1, Medium=3:1 (default), Large=2:1. */
    size?: EntryFields.Symbol<HeroSizeOption>;
    buttons?: EntryFields.Array<IBaseButton>;
    trackingName: EntryFields.Symbol;
    nt_experiences?: Entry<EntrySkeletonType>[];
    metricEventName?: EntryFields.Symbol;
    /** JSON delta of per-market field overrides. Managed by the Market Override Helper app. */
    marketOverride?: EntryFields.Object<JsonObject>;
  };
}

export type HeroModuleSkeleton = {
  contentTypeId: "heroModule";
  fields: IHeroModule["fields"];
};

export interface IShelfModule extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    subtitle?: EntryFields.Symbol;
    shelfApp: EntryFields.Object<JsonObject>;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type ShelfModuleSkeleton = {
  contentTypeId: "shelfModule";
  fields: IShelfModule["fields"];
};

// 🔹 Define the Landing Page Skeleton
export type LandingPageSkeleton = {
  contentTypeId: "landingPage";
  fields: ILandingPage["fields"];
};

export interface ILandingPage extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    title: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    sections?: EntryFields.Array<
      EntryFields.EntryLink<
        | CtaSkeleton
        | HeroModuleSkeleton
        | ShelfModuleSkeleton
        | AlertSkeleton
        | ProductCatalogSkeleton
        | FormEmbedSkeleton
        | CalloutSkeleton
        | KbGroupSkeleton
        | FaqModuleSkeleton
        | MultiItemModuleSkeleton
        | PropertyListingsSkeleton
        | InteractiveMapSkeleton
        | PersonalizedSectionSkeleton
      >
    >;
    seoMetadata?: ISeo;
    parent?: EntryFields.EntryLink<LandingPageSkeleton>;
    fullPath?: EntryFields.Symbol;
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export interface IPerson extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    firstName: EntryFields.Symbol;
    lastName?: EntryFields.Symbol;
    avatar?: Asset;
    bio?: EntryFields.Text;
    website?: IExternalUrl;
    twitterProfileUrl?: IExternalUrl;
    linkedinProfileUrl?: IExternalUrl;
  };
  isInline?: boolean; // This is a custom flag, not part of the content model
}
export interface ICodeSnippet extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    codeBlock: EntryFields.Text;
    language: EntryFields.Symbol;
  };
}
export interface IBlogPostPage extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    publishedDate?: EntryFields.Date;
    summary?: EntryFields.RichText;
    body: EntryFields.RichText;
    featuredImage: Asset;
    author?: IPerson;
    seoMetadata?: ISeo;
    parent?: EntryFields.EntryLink<LandingPageSkeleton | BlogPostPageSkeleton>;
    fullPath?: EntryFields.Symbol;
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type BlogPostPageSkeleton = {
  contentTypeId: "blogPost";
  fields: IBlogPostPage["fields"];
};

export interface ICategoryPage extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    defaultShelf?: EntryFields.EntryLink<ShelfModuleSkeleton>;
    heroBanner?: EntryFields.EntryLink<HeroBannerSkeleton>;
    sections?: EntryFields.Array<
      EntryFields.EntryLink<
        CtaSkeleton | HeroModuleSkeleton | ShelfModuleSkeleton | HeroBannerSkeleton | AlertSkeleton
      >
    >;
    content?: EntryFields.Array<Entry<EntrySkeletonType>>;
    seoMetadata?: ISeo;
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type CategoryPageSkeleton = {
  contentTypeId: "categoryPage";
  fields: ICategoryPage["fields"];
};

// -----------------------------
// New content types: Frame model
// -----------------------------

export interface IFrameHeader extends Entry {
  fields: {
    internalTitle?: EntryFields.Symbol;
    headline: EntryFields.RichText;
    subline?: EntryFields.RichText;
    eyebrow?: EntryFields.Symbol;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type FrameHeaderSkeleton = {
  contentTypeId: "frameHeader";
  fields: IFrameHeader["fields"];
};

// Minimal placeholders for image wrappers used in Frame.things
export interface IImageWrapper extends Entry {
  fields: {
    internalTitle?: EntryFields.Symbol;
    asset?: Asset;
  };
}

export type ImageWrapperSkeleton = {
  contentTypeId: "imageWrapper";
  fields: IImageWrapper["fields"];
};

export interface IPexelsPhotoData extends JsonObject {
  photographer: string;
  photographer_url: string;
  image: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
  avg_color: string;
  url: string;
  attribution: string;
  photographer_attribution: string;
  width: number;
  height?: number;
}

export interface IPexelsImageWrapper extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    pexelsImage: EntryFields.Object<IPexelsPhotoData>;
    enableZoom?: EntryFields.Boolean;
    enableBlur?: EntryFields.Boolean;
    radius?: EntryFields.Symbol<"None" | "Small" | "Medium" | "Large" | "Full">;
  };
}

export type PexelsImageWrapperSkeleton = {
  contentTypeId: "pexelsImageWrapper";
  fields: IPexelsImageWrapper["fields"];
};

export interface ICallout extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title?: EntryFields.RichText;
    subtitle?: EntryFields.RichText;
    button?: IBaseButton;
    media?: Asset;
  };
}

export type CalloutSkeleton = {
  contentTypeId: "callout";
  fields: ICallout["fields"];
};

export interface IFrame extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    frameHeader?: EntryFields.EntryLink<FrameHeaderSkeleton>;
    layout: EntryFields.Symbol<
      "single" | "duplex" | "hero" | "grid" | "carousel" | "list"
    >;
    theme: EntryFields.Symbol<"light" | "dark" | "brand">;
    backgroundColor: EntryFields.Symbol<
      "primary" | "secondary" | "accent" | "neutral" | "transparent"
    >;
    backgroundMedia?: Asset;
    things?: EntryFields.Array<
      EntryFields.EntryLink<
        | ImageWrapperSkeleton
        | PexelsImageWrapperSkeleton
        | CalloutSkeleton
        | BlogPostPageSkeleton
      >
    >;
    gap?: EntryFields.Symbol<"sm" | "md" | "lg" | "xl">;
    padding?: EntryFields.Symbol<"none" | "sm" | "md" | "lg" | "xl" | "xxl">;
    alignment: EntryFields.Symbol<"left" | "right" | "center">;
    dimBackground?: EntryFields.Symbol<"10" | "20" | "30" | "40" | "50">;
    tintColor?: EntryFields.Symbol<
      "none" | "primary" | "secondary" | "accent" | "black"
    >;
  };
}

export type FrameSkeleton = {
  contentTypeId: "frame";
  fields: IFrame["fields"];
};

export interface IAlert extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    content: EntryFields.RichText;
    actionButton?: IBaseButton;
    variant?: EntryFields.Symbol<"info" | "warning" | "success" | "error" | "default">;
    dismissible?: EntryFields.Boolean;
    showIcon?: EntryFields.Boolean;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type AlertSkeleton = {
  contentTypeId: "alert";
  fields: IAlert["fields"];
};

export interface IProductCatalog extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title: EntryFields.Symbol;
    body?: EntryFields.Text;
    products: EntryFields.Object<JsonObject>;
    cta?: IBaseButton;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type ProductCatalogSkeleton = {
  contentTypeId: "productCatalog";
  fields: IProductCatalog["fields"];
};

export interface IFormEmbed extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    introCopy?: EntryFields.Text;
    form: EntryFields.Object<JsonObject>;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type FormEmbedSkeleton = {
  contentTypeId: "formEmbed";
  fields: IFormEmbed["fields"];
};

// -----------------------------
// FAQ content types
// -----------------------------

export interface IFaqItem extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    question: EntryFields.Symbol;
    answer: EntryFields.RichText;
    /** Optional grouping label, e.g. "Shipping" — used to group items in the list layout. */
    category?: EntryFields.Symbol;
    actionButton?: IBaseButton;
  };
}

export type FaqItemSkeleton = {
  contentTypeId: "faqItem";
  fields: IFaqItem["fields"];
};

export interface IFaqModule extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    subtitle?: EntryFields.Symbol;
    items: EntryFields.Array<EntryFields.EntryLink<FaqItemSkeleton>>;
    layout: EntryFields.Symbol<"accordion" | "two-column" | "list">;
    /** Accordion only — when false, opening one item closes the others. */
    allowMultipleOpen?: EntryFields.Boolean;
    /** Emit a JSON-LD FAQPage script alongside the rendered section. */
    enableStructuredData?: EntryFields.Boolean;
    actionButton?: IBaseButton;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type FaqModuleSkeleton = {
  contentTypeId: "faqModule";
  fields: IFaqModule["fields"];
};

export interface IKbGroup extends Entry {
  fields: {
    name: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    description?: EntryFields.Text;
  };
}

export type KbGroupSkeleton = {
  contentTypeId: "kbGroup";
  fields: IKbGroup["fields"];
};

export interface ILogo extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    name?: EntryFields.Symbol;
    image: Asset;
    link?: IExternalUrl;
  };
}

export type LogoSkeleton = {
  contentTypeId: "logo";
  fields: ILogo["fields"];
};

export interface IMultiItemModule extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    subtitle?: EntryFields.Symbol;
    items: EntryFields.Array<
      EntryFields.EntryLink<
        HeroModuleSkeleton | BlogPostPageSkeleton | LandingPageSkeleton | LogoSkeleton | CampaignSkeleton | CalloutSkeleton | CtaSkeleton | GeneralTopicSkeleton
      >
    >;
    layout: EntryFields.Symbol<"carousel" | "grid" | "strip" | "list" | "value-prop">;
    columns?: EntryFields.Integer;
    autoplay?: EntryFields.Boolean;
    autoplayDelayMs?: EntryFields.Integer;
    showArrows?: EntryFields.Boolean;
    showDots?: EntryFields.Boolean;
    backgroundTheme?: EntryFields.Symbol<"default" | "brand" | "alt" | "none">;
    actionButton?: IBaseButton;
    metricEventName?: EntryFields.Symbol;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type MultiItemModuleSkeleton = {
  contentTypeId: "multiItemModule";
  fields: IMultiItemModule["fields"];
};

// -----------------------------
// Product Story content type
// -----------------------------

export interface IProductStory extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    primaryProduct: EntryFields.Object<JsonObject>;
    /**
     * Optional override for the product name returned by the commerce API.
     * Localized — each locale stores its own override. Empty means "use the
     * API value". Further per-market overrides live in `marketOverride`.
     */
    productName?: EntryFields.Symbol;
    /**
     * Per-market overrides for whitelisted fields on this story. Managed by
     * the Market Override Helper app. Localized so editors can vary US-Spanish
     * from generic Spanish, etc.
     */
    marketOverride?: EntryFields.Object<JsonObject>;
    /** @deprecated use topSections / bottomSections */
    additionalProducts?: EntryFields.Object<JsonObject>;
    heroModule?: EntryFields.EntryLink<
      HeroBannerSkeleton | HeroModuleSkeleton
    >;
    /** @deprecated use images (direct Asset array) */
    gallery?: EntryFields.Array<EntryFields.EntryLink<ImageWithFocalPointSkeleton>>;
    images?: EntryFields.Array<EntryFields.AssetLink>;
    description?: EntryFields.RichText;
    topSections?: EntryFields.Array<
      EntryFields.EntryLink<
        | CtaSkeleton
        | HeroModuleSkeleton
        | ShelfModuleSkeleton
        | ProductCatalogSkeleton
        | FormEmbedSkeleton
        | FaqModuleSkeleton
        | MultiItemModuleSkeleton
      >
    >;
    bottomSections?: EntryFields.Array<
      EntryFields.EntryLink<
        | CtaSkeleton
        | HeroModuleSkeleton
        | ShelfModuleSkeleton
        | ProductCatalogSkeleton
        | FormEmbedSkeleton
        | KbGroupSkeleton
        | FaqModuleSkeleton
        | MultiItemModuleSkeleton
      >
    >;
    storyAngle?: EntryFields.Array<EntryFields.Symbol>;
    seoMetadata?: ISeo;
    nt_experiences?: Entry<EntrySkeletonType>[];
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type ProductStorySkeleton = {
  contentTypeId: "productStory";
  fields: IProductStory["fields"];
};

/**
 * General Topic — a versatile content type usable in many contexts
 * (offers, FAQs, callouts, tooltips, etc.).
 * Fields: internalName, title, body (RichText), media (image/video Asset), tagline (≤80 chars).
 */
export interface IGeneralTopic extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    title: EntryFields.Symbol;
    body?: EntryFields.RichText;
    media?: Asset;
    tagline?: EntryFields.Symbol;
  };
}

export type GeneralTopicSkeleton = {
  contentTypeId: "generalTopic";
  fields: IGeneralTopic["fields"];
};

/**
 * Property Listings — a curated section module combining multiple pmsProperty entries
 * with editorial framing (title, subtitle, body). Supports grid / carousel / list layouts
 * with an optional CTA. Designed for landing page sections.
 */
export interface IPropertyListings extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    subtitle?: EntryFields.Symbol;
    body?: EntryFields.Text;
    properties: EntryFields.Array<EntryFields.EntryLink<PmsPropertyEntrySkeleton>>;
    layout?: EntryFields.Symbol<"grid" | "carousel" | "list">;
    columns?: EntryFields.Integer;
    ctaLabel?: EntryFields.Symbol;
    ctaUrl?: EntryFields.Symbol;
    backgroundTheme?: EntryFields.Symbol<"default" | "brand" | "dark" | "none">;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type PropertyListingsSkeleton = {
  contentTypeId: "propertyListings";
  fields: IPropertyListings["fields"];
};

export interface IPmsPropertyEntry extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    propertyId: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    editorialTitle?: EntryFields.Symbol;
    editorialIntro?: EntryFields.RichText;
    /** Optional editorial hero — overrides the default PMS hero image when set. */
    hero?: EntryFields.EntryLink<HeroModuleSkeleton>;
    /** Optional editorial gallery — overrides the PMS gallery image URLs when set. */
    gallery?: EntryFields.Array<Asset>;
    /** Optional curated offers — rendered instead of (or in addition to) the PMS offers. */
    offers?: EntryFields.Array<EntryFields.EntryLink<GeneralTopicSkeleton>>;
    bodySections?: EntryFields.Array<EntryFields.EntryLink<EntrySkeletonType>>;
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type PmsPropertyEntrySkeleton = {
  contentTypeId: "pmsProperty";
  fields: IPmsPropertyEntry["fields"];
};

// -----------------------------
// Interactive Map content types
// -----------------------------

export interface IMapPoint extends Entry<any> {
  fields: {
    internalTitle: EntryFields.Symbol;
    title: EntryFields.Symbol;
    pointType: EntryFields.Symbol<
      "Station" | "Building" | "Airport" | "Hospital" | "School" | "Park" | "Restaurant" | "Hotel"
    >;
    location: { lat: number; lon: number };
    summary?: EntryFields.RichText;
  };
}

export type MapPointSkeleton = {
  contentTypeId: "mapPoint";
  fields: IMapPoint["fields"];
};

export interface IInteractiveMap extends Entry<any> {
  fields: {
    internalTitle: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    description?: EntryFields.RichText;
    mapStyle: EntryFields.Symbol<"standard" | "light" | "dark">;
    animation: EntryFields.Symbol<"none" | "fadeIn" | "slideUp">;
    isActive: EntryFields.Boolean;
    defaultZoom?: EntryFields.Integer;
    defaultCenter?: { lat: number; lon: number };
    enableClustering?: EntryFields.Boolean;
    showRouteLines?: EntryFields.Boolean;
    points: EntryFields.Array<EntryFields.EntryLink<MapPointSkeleton>>;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type InteractiveMapSkeleton = {
  contentTypeId: "interactiveMap";
  fields: IInteractiveMap["fields"];
};

// -----------------------------
// Payment Methods content types
// -----------------------------

export interface IPaymentMethod extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    label: EntryFields.Symbol;
    category: EntryFields.Symbol<"card" | "digitalWallet" | "payLater" | "localPayment">;
    provider?: EntryFields.Symbol;
    icon?: Asset;
    description?: EntryFields.Symbol;
  };
}

export type PaymentMethodSkeleton = {
  contentTypeId: "paymentMethod";
  fields: IPaymentMethod["fields"];
};

export interface IPaymentMethodsByMarket extends Entry<any> {
  fields: {
    internalTitle: EntryFields.Symbol;
    market: Entry<any>;
    acceptedCardSchemes?: EntryFields.Array<EntryFields.EntryLink<PaymentMethodSkeleton>>;
    digitalWallets?: EntryFields.Array<EntryFields.EntryLink<PaymentMethodSkeleton>>;
    payLaterAndInstallments?: EntryFields.Array<EntryFields.EntryLink<PaymentMethodSkeleton>>;
    localPaymentMethods?: EntryFields.Array<EntryFields.EntryLink<PaymentMethodSkeleton>>;
    status: EntryFields.Symbol<"draft" | "active" | "deprecated">;
  };
}

export type PaymentMethodsByMarketSkeleton = {
  contentTypeId: "paymentMethodsByMarket";
  fields: IPaymentMethodsByMarket["fields"];
};

export interface IPaymentMethodsSnippet extends Entry<any> {
  fields: {
    internalTitle: EntryFields.Symbol;
    marketsConfig: EntryFields.Array<EntryFields.EntryLink<PaymentMethodsByMarketSkeleton>>;
    displayMode: EntryFields.Symbol<"currentMarketOnly" | "allMarkets" | "currentMarketWithFallback">;
    fallbackMessage?: EntryFields.Symbol;
  };
}

export type PaymentMethodsSnippetSkeleton = {
  contentTypeId: "paymentMethodsSnippet";
  fields: IPaymentMethodsSnippet["fields"];
};

// -----------------------------
// Market Override content type
// -----------------------------

export interface IMarketOverride extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    article?: Entry<any>;
    market: Entry<any>;
    overrideLabel?: EntryFields.Symbol;
    overrideBody?: EntryFields.RichText;
    overrideIntro?: EntryFields.RichText;
    active: EntryFields.Boolean;
  };
}

export type MarketOverrideSkeleton = {
  contentTypeId: "marketOverride";
  fields: IMarketOverride["fields"];
};

// -----------------------------
// Market Content Block
// -----------------------------

export interface IMarketContentBlock extends Entry<any> {
  fields: {
    internalTitle: EntryFields.Symbol;
    displayMode: EntryFields.Symbol<"showForMarkets" | "hideForMarkets">;
    targetMarkets: EntryFields.Array<Entry<any>>;
    content: EntryFields.RichText;
  };
}

export type MarketContentBlockSkeleton = {
  contentTypeId: "marketContentBlock";
  fields: IMarketContentBlock["fields"];
};

// -----------------------------
// Product Category
// -----------------------------

export interface IProductCategory extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    title: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    commerceCategoryId: EntryFields.Symbol;
    description?: EntryFields.Text;
    heroImage?: Asset;
    sections?: Entry<any>[];
    seoMetadata?: Entry<any>;
    nt_experiences?: Entry<any>[];
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type ProductCategorySkeleton = {
  contentTypeId: "productCategory";
  fields: IProductCategory["fields"];
};

// -----------------------------
// Campaign
// -----------------------------

export interface ICampaign extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    name: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    validFrom?: EntryFields.Date;
    validTo?: EntryFields.Date;
    heroComponent?: Entry<any>;
    promoTileComponent?: Entry<any>;
    promoTitle?: EntryFields.Symbol;
    topSections?: Entry<any>[];
    targetCategories?: IProductCategory[];
    targetProducts?: EntryFields.Object<JsonObject>;
    bottomSections?: Entry<any>[];
    seoMetadata?: Entry<any>;
    nt_experiences?: Entry<any>[];
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type CampaignSkeleton = {
  contentTypeId: "campaign";
  fields: ICampaign["fields"];
};

// -----------------------------
// Email Layout
// -----------------------------

export interface IEmailLayout extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    logo?: ILogo;
    brandColor?: EntryFields.Symbol;
    companyName?: EntryFields.Symbol;
    socialLinks?: IExternalUrl[];
    footerText?: EntryFields.RichText;
    footerLinks?: IBaseButton[];
  };
}

export type EmailLayoutSkeleton = {
  contentTypeId: "emailLayout";
  fields: IEmailLayout["fields"];
};

// -----------------------------
// Notification Template
// -----------------------------

export interface INotificationTemplate extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    key: EntryFields.Symbol;
    slug: EntryFields.Symbol;
    channel: EntryFields.Symbol<"email" | "sms" | "in-app">;
    subject: EntryFields.Symbol;
    preheader?: EntryFields.Symbol;
    bodyRichText: EntryFields.RichText;
    audience?: EntryFields.Symbol<"all" | "mer-member" | "non-member">;
    emailLayout?: IEmailLayout;
    sampleData?: EntryFields.Object<JsonObject>;
  };
}

export type NotificationTemplateSkeleton = {
  contentTypeId: "notificationTemplate";
  fields: INotificationTemplate["fields"];
};

// -----------------------------
// Social Variant
// -----------------------------

export type SocialPlatform =
  | "instagram_feed"
  | "instagram_story"
  | "tiktok"
  | "x"
  | "facebook"
  | "linkedin"
  | "pinterest";

export type SocialVariantStatus = "draft" | "generated" | "approved" | "posted";

export interface ISocialVariant extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    source: Entry<any>;
    platform: EntryFields.Symbol<SocialPlatform>;
    caption?: EntryFields.Text;
    hashtags?: EntryFields.Array<EntryFields.Symbol>;
    language?: EntryFields.Symbol;
    status: EntryFields.Symbol<SocialVariantStatus>;
    scheduledAt?: EntryFields.Date;
    externalPostId?: EntryFields.Text;
  };
}

export type SocialVariantSkeleton = {
  contentTypeId: "socialVariant";
  fields: ISocialVariant["fields"];
};

// -----------------------------
// Christie's Demo: Auction & Lot Reference
// -----------------------------

export interface IAuction extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    externalAuctionId: EntryFields.Object;
    overrideTitle?: EntryFields.Symbol;
    overrideSummary?: EntryFields.Text;
    overrideSaleType?: EntryFields.Symbol<"Evening" | "Day" | "Online">;
    images?: Asset[];
    topSections?: Entry<any>[];
    bottomSections?: Entry<any>[];
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type AuctionSkeleton = {
  contentTypeId: "auction";
  fields: IAuction["fields"];
};

export interface ILotReference extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    externalLotId: EntryFields.Symbol;
    label?: EntryFields.Symbol;
    promoTitle?: EntryFields.Symbol;
    promoCopy?: EntryFields.Text;
    featured?: EntryFields.Boolean;
    gallery?: Asset[];
  };
}

export type LotReferenceSkeleton = {
  contentTypeId: "lotReference";
  fields: ILotReference["fields"];
};

// -----------------------------
// Personalized Multi Variant Section
// -----------------------------

export interface IPersonalizedSection extends Entry<any> {
  fields: {
    internalTitle: EntryFields.Symbol;
    baseline: Entry<any>;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type PersonalizedSectionSkeleton = {
  contentTypeId: "personalizedSection";
  fields: IPersonalizedSection["fields"];
};

// -----------------------------
// Mobile app content model
// -----------------------------

export type AppWidgetType =
  | "latestTransactions"
  | "accountSummary"
  | "spendingByCategory"
  | "exchangeRates"
  | "savingsGoal"
  | "cashbackProgress"
  | "rateComparison"
  | "cardControls"
  | "investmentSnapshot"
  | "billsDue";

export type AppModuleType =
  | "heroCard"
  | "promoBanner"
  | "quickActions"
  | "featureTiles"
  | "articleList"
  | "faq"
  | "supportCTA"
  | "banner"
  | "widget"
  | "notificationList";

export interface IAppWidget extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    widgetType: EntryFields.Symbol<AppWidgetType>;
    title?: EntryFields.Symbol;
    emptyStateCopy?: EntryFields.Text;
    microcopySet?: EntryFields.Array<IMicrocopy>;
    config?: EntryFields.Object<JsonObject>;
    dataSource?: EntryFields.Symbol<"mock" | "api">;
  };
}

export type AppWidgetSkeleton = {
  contentTypeId: "appWidget";
  fields: IAppWidget["fields"];
};

export interface IAppModule extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    moduleType: EntryFields.Symbol<AppModuleType>;
    topic?: IGeneralTopic;
    topics?: EntryFields.Array<IGeneralTopic>;
    articles?: Entry<EntrySkeletonType>[];
    kbCategories?: Entry<EntrySkeletonType>[];
    buttons?: EntryFields.Array<IBaseButton>;
    widget?: IAppWidget;
    notifications?: Entry<EntrySkeletonType>[];
    variant?: EntryFields.Symbol<"default" | "emphasized" | "compact">;
    emphasis?: EntryFields.Symbol<
      "none" | "accent" | "brand" | "danger" | "success" | "warning"
    >;
    imageStyle?: EntryFields.Symbol<"square" | "wide" | "round" | "none">;
    ctaStyle?: EntryFields.Symbol<"primary" | "secondary" | "ghost" | "link">;
    icon?: EntryFields.Symbol;
    microcopySet?: EntryFields.Array<IMicrocopy>;
    nt_experiences?: Entry<EntrySkeletonType>[];
  };
}

export type AppModuleSkeleton = {
  contentTypeId: "appModule";
  fields: IAppModule["fields"];
};

export interface IAppNavItem extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    labelMicrocopy?: IMicrocopy;
    fallbackLabel: EntryFields.Symbol;
    icon?: EntryFields.Symbol;
    screen?: IAppScreen;
    order?: EntryFields.Integer;
  };
}

export type AppNavItemSkeleton = {
  contentTypeId: "appNavItem";
  fields: IAppNavItem["fields"];
};

export interface IAppNavigation extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    items?: EntryFields.Array<IAppNavItem>;
  };
}

export type AppNavigationSkeleton = {
  contentTypeId: "appNavigation";
  fields: IAppNavigation["fields"];
};

export interface IAppScreen extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    screenKey: EntryFields.Symbol;
    title?: EntryFields.Symbol;
    platform?: EntryFields.Symbol<"both" | "ios" | "android">;
    modules?: EntryFields.Array<IAppModule>;
    flags?: EntryFields.Array<IAppFlag>;
    navigation?: IAppNavigation;
    nt_experiences?: Entry<EntrySkeletonType>[];
    minAppVersion?: EntryFields.Symbol;
  };
}

export type AppScreenSkeleton = {
  contentTypeId: "appScreen";
  fields: IAppScreen["fields"];
};

export type AppFlagSeverity = "info" | "success" | "warning" | "error" | "promo";

export interface IAppFlag extends Entry<any> {
  fields: {
    internalName: EntryFields.Symbol;
    /** UPPER_SNAKE identifier the code can branch on (e.g. MAINTENANCE_2026_06). */
    code: EntryFields.Symbol;
    /** Ninetailed Custom Variable Flag key. The mock app calls
     *  `useFlag(flagKey, defaultValue)` and renders the bar when the
     *  resolved value is truthy. In Ninetailed: create an Experience →
     *  Custom Flag (Boolean) → enter this key → set baseline=false and
     *  variants=true for the target audiences. */
    flagKey: EntryFields.Symbol;
    /** Fallback value used while Ninetailed is loading or the flag is
     *  not defined. Typically `false` (hide the bar). */
    defaultValue?: EntryFields.Boolean;
    severity: EntryFields.Symbol<AppFlagSeverity>;
    title: EntryFields.Symbol;
    body?: EntryFields.Text;
    dismissable?: EntryFields.Boolean;
    validFrom?: EntryFields.Date;
    validTo?: EntryFields.Date;
    button?: IBaseButton;
  };
}

export type AppFlagSkeleton = {
  contentTypeId: "appFlag";
  fields: IAppFlag["fields"];
};

// -----------------------------
// Redirect
// -----------------------------

export type RedirectStatus = "active" | "disabled";
export type RedirectStatusCode = 301 | 302 | 307 | 308;

/**
 * An editor-managed URL redirect.
 *
 * Exactly one source (`fromPath` OR `fromEntry`) and exactly one destination
 * (`toEntry` OR `toExternalUrl`) must be set — Contentful validations cannot
 * express that, so it is enforced in `lib/redirects.ts` when building the map.
 */
export interface IRedirect extends Entry {
  fields: {
    internalName: EntryFields.Symbol;
    fromPath?: EntryFields.Symbol;
    fromEntry?: Entry;
    toEntry?: Entry;
    toExternalUrl?: EntryFields.Symbol;
    statusCode: EntryFields.Integer;
    status: EntryFields.Symbol<RedirectStatus>;
    notes?: EntryFields.Text;
    /**
     * Which brand (site) owns this entry. Optional and unset in single-site
     * demos; read by the query filter in lib/site-scope.ts, never by a
     * component.
     */
    site?: EntryFields.EntryLink<SiteSkeleton>;
  };
}

export type RedirectSkeleton = {
  contentTypeId: "redirect";
  fields: IRedirect["fields"];
};

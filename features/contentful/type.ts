/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entry, EntryFields, Asset, EntrySkeletonType } from "contentful";

type JsonObject = { [key: string]: any };

export interface IMicrocopy extends Entry {
  fields: {
    key: EntryFields.Symbol;
    value: EntryFields.Symbol;
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
    target: IExternalUrl | ILandingPage | IBlogPostPage | ICategoryPage | IProductStory | IPmsPropertyEntry;
    openInNewTab?: EntryFields.Boolean;
    color: EntryFields.Symbol<
      "Default" | "Primary" | "Secondary" | "Success" | "Danger" | "Warning"
    >;
    size: EntryFields.Symbol<"Small" | "Medium" | "Large">;
    variant: EntryFields.Symbol<
      "Primary" | "Secondary" | "Destructive" | "Ghost" | "Outline"
    >;
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

export interface IHeroModule extends Entry {
  fields: {
    internalTitle: EntryFields.Symbol;
    headline?: EntryFields.Symbol;
    subCopy?: EntryFields.Text;
    image?: EntryFields.EntryLink<ImageWithFocalPointSkeleton>;
    imagePlacement?: EntryFields.Symbol<"Left" | "Right">;
    buttons?: EntryFields.Array<IBaseButton>;
    trackingName: EntryFields.Symbol;
    nt_experiences?: Entry<EntrySkeletonType>[];
    metricEventName?: EntryFields.Symbol;
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
        | MultiItemModuleSkeleton
        | PropertyListingsSkeleton
      >
    >;
    seoMetadata?: ISeo;
    parent?: EntryFields.EntryLink<LandingPageSkeleton>;
    fullPath?: EntryFields.Symbol;
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
        HeroModuleSkeleton | BlogPostPageSkeleton | LandingPageSkeleton | LogoSkeleton
      >
    >;
    layout: EntryFields.Symbol<"carousel" | "grid" | "strip" | "list">;
    columns?: EntryFields.Integer;
    autoplay?: EntryFields.Boolean;
    autoplayDelayMs?: EntryFields.Integer;
    showArrows?: EntryFields.Boolean;
    showDots?: EntryFields.Boolean;
    backgroundTheme?: EntryFields.Symbol<"default" | "brand" | "alt" | "none">;
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
    additionalProducts?: EntryFields.Object<JsonObject>;
    heroModule?: EntryFields.EntryLink<
      HeroBannerSkeleton | HeroModuleSkeleton
    >;
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
        | MultiItemModuleSkeleton
      >
    >;
    storyAngle?: EntryFields.Array<EntryFields.Symbol>;
    seoMetadata?: ISeo;
    nt_experiences?: Entry<EntrySkeletonType>[];
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
  };
}

export type PmsPropertyEntrySkeleton = {
  contentTypeId: "pmsProperty";
  fields: IPmsPropertyEntry["fields"];
};

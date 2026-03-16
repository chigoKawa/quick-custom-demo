import type { FC } from "react";
import MobileHeroBanner from "./mobile-hero-banner";
import MobileHeroModule from "./mobile-hero-module";
import MobileCta from "./mobile-cta";
import MobileAlert from "./mobile-alert";
import MobileShelfModule from "./mobile-shelf-module";
import MobileProductCatalog from "./mobile-product-catalog";
import MobileFormEmbed from "./mobile-form-embed";
import MobileRichContent from "./mobile-rich-content";
import MobileMultiItemModule from "./mobile-multi-item-module";
import MobileKbGroup from "./mobile-kb-group";

/**
 * Mobile-optimized component map for landing page sections.
 * Each component renders baseline content (no Ninetailed personalization)
 * in a layout designed for ~390px mobile viewport.
 */
export const mobileSectionsComponentMap: Record<string, FC<any>> = {
  heroBanner: MobileHeroBanner,
  heroModule: MobileHeroModule,
  cta: MobileCta,
  alert: MobileAlert,
  shelfModule: MobileShelfModule,
  productCatalog: MobileProductCatalog,
  formEmbed: MobileFormEmbed,
  richContentModule: MobileRichContent,
  multiItemModule: MobileMultiItemModule,
  kbGroup: MobileKbGroup,
};

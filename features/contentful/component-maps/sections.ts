import type { FC } from "react";
import type { IHeroBanner, ICta, IHeroModule, IShelfModule, IAlert, IProductCatalog, IFormEmbed, IKbGroup, IMultiItemModule } from "../type";
import PersonalizedHeroBanner from "../components/hero-banner/personalized-hero-banner";
import PersonalizedCta from "../components/cta/personalized-cta";
import PersonalizedHeroModule from "../components/hero-module/personalized-hero-module";
import PersonalizedShelfModule from "../components/shelf-module/personalized-shelf-module";
import PersonalizedAlert from "../components/alert/personalized-alert";
import PersonalizedProductCatalog from "../components/product-catalog/personalized-product-catalog";
import PersonalizedFormEmbed from "../components/form-embed/personalized-form-embed";
import KbGroupSection from "../../kb/kb-group-section";
import RichContentModuleWrapper from "../components/rich-content-module/rich-content-module-wrapper";
import PersonalizedMultiItemModule from "../components/multi-item-module/personalized-multi-item-module";
import PersonalizedPropertyListings from "../components/property-listings/personalized-property-listings";
import PersonalizedInteractiveMap from "../components/interactive-map/personalized-interactive-map";
import PersonalizedSection from "../components/personalized-section/personalized-section";
import PersonalizedFaqModule from "../components/faq-module/personalized-faq-module";

// Centralized component map for landing page sections
export const sectionsComponentMap: Record<string, FC<any>> = {
  heroBanner: PersonalizedHeroBanner,
  heroModule: PersonalizedHeroModule,
  cta: PersonalizedCta,
  shelfModule: PersonalizedShelfModule,
  alert: PersonalizedAlert,
  productCatalog: PersonalizedProductCatalog,
  formEmbed: PersonalizedFormEmbed,
  kbGroup: KbGroupSection as unknown as FC<IKbGroup>,
  richContentModule: RichContentModuleWrapper,
  multiItemModule: PersonalizedMultiItemModule,
  propertyListings: PersonalizedPropertyListings,
  interactiveMap: PersonalizedInteractiveMap,
  personalizedSection: PersonalizedSection,
  faqModule: PersonalizedFaqModule,
} as const;

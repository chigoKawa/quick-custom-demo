/**
 * Rebrand rabobank Contentful environment from Metro Bank demo → Rabobank.
 *
 * Run: node -r dotenv/config scripts/seed-rabobank-demo.mjs
 *
 * Updates site settings (theme + logo), landing pages, nav, footer, heroes,
 * and replaces richContentModule sections with multiItemModule grids.
 */
import "dotenv/config";
import contentfulManagement from "contentful-management";

const SPACE_ID = "ace0ba6p9v98";
const ENV_ID = "rabobank";
const EN = "en-US";

const TOKEN =
  process.env.CONTENTFUL_MANAGEMENT_TOKEN ||
  process.env.CTF_MANAGEMENT_TOKEN;

if (!TOKEN) {
  console.error("Missing CONTENTFUL_MANAGEMENT_TOKEN");
  process.exit(1);
}

/** Existing entry IDs in the rabobank environment */
const EXISTING = {
  siteSettings: "4ztHcledfu8ov9Fn8vYWZU",
  homePage: "4fCfHLeXvsWb5C8dgAgm0k",
  personalPage: "4zIfX6HiIY0QWCoOeQAizh",
  businessPage: "6f2vis9NDlcFV2MJjQuZXE",
  securityPage: "1KkK0ji2BZvq2PN76uLsGG",
  helpPage: "1Fd8ksZuMeU4wL5hkJDX45",
  homeSeo: "2HjgAQrvx7jlfJ2nVe4zJu",
  personalSeo: "6kHHsiy3rP4SQxn3zwe7ym",
  businessSeo: "1YELUu1a09qoBsg6Nc44C7",
  securitySeo: "5MVk9IrQqa4HDblEwG0PZY",
  helpSeo: "2wvTyOhx0cZ16ETZoH9Tm1",
  headerNav: "72UkohCORrl3gKgGd3UDsa",
  homeHero: "1xdsettCtqHBkZCZvPKMr5",
  homeStrip: "7nSwkpN5S6sZBsJkWl7T4k",
  homeCta: "67bOElv6wZg9evIDis2Lif",
  securityHero: "6E5y86eIhdafkcyoMPgw2k",
  helpCta: "581x6KoTXfMLKvElMUwNzO",
  stripTopic: "6tyao9x3v4wXq4wnySLeY7",
  navPersonal: "1S40pec7cKKXZc0zzJwc5x",
  navBusiness: "2LkgLoAe4IW8OZjyrRxeLt",
  navSecurity: "15QoW3UJaYKWKvRgeUlvBj",
  navHelp: "2N8qb0mt2V0NUCKdSUCZCE",
  footerFeatures: [
    "32pD13OrW8ACjK5UUqTjku",
    "2ydgmz71gFhP8oXidD7Wnb",
    "5ggiH0zrjnf3371UiNFoh6",
    "26vk8SSvj8jC1VtIHpAPR5",
  ],
  /** richContentModule shared by home / personal / business — replaced in page sections */
  legacyRcm: "517hucGYeldEewHx77qaZz",
  /** richContentModule on help + security — replaced in page sections */
  legacyRcmSecurity: "4lLyQsqv4BVVeU0eEas1HC",
};

const LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Rabobank_logo.svg/512px-Rabobank_logo.svg.png";

const IMAGES = {
  hero:
    "https://images.pexels.com/photos/2132345/pexels-photo-2132345.jpeg?auto=compress&cs=tinysrgb&w=1600",
  wholesale:
    "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200",
  sustainability:
    "https://images.pexels.com/photos/356049/pexels-photo-356049.jpeg?auto=compress&cs=tinysrgb&w=1200",
  investors:
    "https://images.pexels.com/photos/53621/calculator-calculation-insurance-finance-53621.jpeg?auto=compress&cs=tinysrgb&w=1200",
  knowledge:
    "https://images.pexels.com/photos/5668777/pexels-photo-5668777.jpeg?auto=compress&cs=tinysrgb&w=1200",
  reports:
    "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1200",
  security:
    "https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=1200",
  cooperative:
    "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1200",
  personal:
    "https://images.pexels.com/photos/4386436/pexels-photo-4386436.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

const RABOBANK_THEME = {
  fonts: { mono: "fira-code", sans: "inter", serif: "lora" },
  colors: {
    card: "#ffffff",
    ring: "#2C3696",
    muted: "#EEF1F8",
    accent: "#F36717",
    border: "#D8DCE8",
    primary: "#2C3696",
    secondary: "#EEF1F8",
    background: "#FFFFFF",
    foreground: "#1A1A2E",
    destructive: "#DC2626",
    cardForeground: "#1A1A2E",
    mutedForeground: "#5A6078",
    accentForeground: "#FFFFFF",
    primaryForeground: "#FFFFFF",
    secondaryForeground: "#1A1A2E",
  },
  radius: "0.375rem",
  typography: {
    bodySize: "1rem",
    lineHeight: "1.6",
    headingWeight: "700",
    letterSpacing: "0em",
    headingLetterSpacing: "-0.02em",
  },
};

function link(id) {
  return { sys: { type: "Link", linkType: "Entry", id } };
}

function assetLink(id) {
  return { sys: { type: "Link", linkType: "Asset", id } };
}

async function createAsset(env, { title, url, fileName, contentType = "image/jpeg" }) {
  const asset = await env.createAsset({
    fields: {
      title: { [EN]: title },
      description: { [EN]: title },
      file: { [EN]: { contentType, fileName, upload: url } },
    },
  });
  const processed = await asset.processForAllLocales();
  return (await processed.publish()).sys.id;
}

async function createEntry(env, contentTypeId, fields) {
  const entry = await env.createEntry(contentTypeId, { fields });
  return (await entry.publish()).sys.id;
}

async function updateEntry(env, entryId, fields) {
  const entry = await env.getEntry(entryId);
  for (const [fieldId, locales] of Object.entries(fields)) {
    entry.fields[fieldId] = entry.fields[fieldId] || {};
    for (const [locale, value] of Object.entries(locales)) {
      entry.fields[fieldId][locale] = value;
    }
  }
  const updated = await entry.update();
  return (await updated.publish()).sys.id;
}

async function createImageWithFocal(env, title, assetId) {
  return createEntry(env, "imageWithFocalPoint", {
    title: { [EN]: title },
    image: { [EN]: assetLink(assetId) },
    focalPoint: { [EN]: { x: 0.5, y: 0.4, version: 1 } },
  });
}

async function main() {
  const client = contentfulManagement.createClient({ accessToken: TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const env = await space.getEnvironment(ENV_ID);

  console.log("Uploading Rabobank assets...");
  const assetIds = {};
  for (const [key, url] of Object.entries(IMAGES)) {
    assetIds[key] = await createAsset(env, {
      title: `Rabobank – ${key}`,
      url,
      fileName: `rabobank-${key}.jpg`,
    });
    console.log(`  ${key}: ${assetIds[key]}`);
  }

  let logoAssetId;
  try {
    logoAssetId = await createAsset(env, {
      title: "Rabobank logo",
      url: LOGO_URL,
      fileName: "rabobank-logo.png",
      contentType: "image/png",
    });
  } catch {
    logoAssetId = assetIds.hero;
    console.log("  logo: using hero fallback");
  }

  const imageEntryIds = {};
  for (const key of Object.keys(IMAGES)) {
    imageEntryIds[key] = await createImageWithFocal(
      env,
      `Rabobank Image – ${key}`,
      assetIds[key]
    );
  }

  console.log("Creating hero cards for multi-item modules...");
  const pillarHeroes = {};
  const pillarDefs = [
    {
      key: "wholesale",
      internalTitle: "Rabobank – Hero – Wholesale Banking",
      headline: "Wholesale Banking",
      subCopy:
        "Rabobank's global Food & Agri bank and a selective leader in the Energy Transition. Financing that moves food, energy, and trade forward.",
      imageKey: "wholesale",
      size: "Small",
    },
    {
      key: "sustainability",
      internalTitle: "Rabobank – Hero – Sustainability",
      headline: "Sustainability",
      subCopy:
        "Our strategy and approach as a cooperative bank — investing in transitions that benefit clients, communities, and the planet.",
      imageKey: "sustainability",
      size: "Small",
    },
    {
      key: "investors",
      internalTitle: "Rabobank – Hero – Investor Relations",
      headline: "Investor Relations",
      subCopy:
        "Creditworthiness, ESG profile, and financial results for investors who want transparency from a cooperative institution.",
      imageKey: "investors",
      size: "Small",
    },
    {
      key: "knowledge",
      internalTitle: "Rabobank – Hero – Knowledge",
      headline: "Knowledge",
      subCopy:
        "Stay on top of financial and economic developments around the world — research and insights from Rabobank experts.",
      imageKey: "knowledge",
      size: "Small",
    },
    {
      key: "reports",
      internalTitle: "Rabobank – Hero – Results & Reports",
      headline: "Results & Reports",
      subCopy:
        "See how we contribute to society and global transitions — annual results, impact reports, and cooperative outcomes.",
      imageKey: "reports",
      size: "Small",
    },
  ];

  for (const def of pillarDefs) {
    pillarHeroes[def.key] = await createEntry(env, "heroModule", {
      internalTitle: { [EN]: def.internalTitle },
      headline: { [EN]: def.headline },
      subCopy: { [EN]: def.subCopy },
      image: { [EN]: link(imageEntryIds[def.imageKey]) },
      imagePlacement: { [EN]: "Right" },
      textContrast: { [EN]: "Dark on light" },
      size: { [EN]: def.size },
      trackingName: { [EN]: `rabobank_pillar_${def.key}` },
      metricEventName: { [EN]: "hero_cta_clicked" },
    });
  }

  const cooperativeHeroId = await createEntry(env, "heroModule", {
    internalTitle: { [EN]: "Rabobank – Hero – Cooperative Banking" },
    headline: { [EN]: "Built on cooperation" },
    subCopy: {
      [EN]:
        "Rabobank is a cooperative bank with a mission. Whatever you cannot achieve alone, you can achieve together — with your community, your sector, and your bank.",
    },
    image: { [EN]: link(imageEntryIds.cooperative) },
    imagePlacement: { [EN]: "Right" },
    textContrast: { [EN]: "Dark on light" },
    size: { [EN]: "Medium" },
    trackingName: { [EN]: "rabobank_cooperative" },
    metricEventName: { [EN]: "hero_cta_clicked" },
  });

  const securityHeroCards = {};
  for (const [key, copy] of [
    [
      "protection",
      "Secure by design",
      "Multi-layer fraud detection, strong authentication, and continuous monitoring protect your accounts around the clock.",
    ],
    [
      "cooperative",
      "Local experts",
      "Rabobank advisers know your region and sector — real people who understand your business and personal goals.",
    ],
    [
      "digital",
      "Digital you can trust",
      "Bank online and on mobile with the same security standards we apply across our global cooperative network.",
    ],
  ]) {
    securityHeroCards[key] = await createEntry(env, "heroModule", {
      internalTitle: { [EN]: `Rabobank – Hero – Security – ${key}` },
      headline: { [EN]: copy[0] },
      subCopy: { [EN]: copy[1] },
      image: { [EN]: link(imageEntryIds.security) },
      imagePlacement: { [EN]: "Right" },
      textContrast: { [EN]: "Dark on light" },
      size: { [EN]: "Small" },
      trackingName: { [EN]: `rabobank_security_${key}` },
      metricEventName: { [EN]: "hero_cta_clicked" },
    });
  }

  console.log("Creating multi-item modules (replacing rich content)...");
  const homePillarsModuleId = await createEntry(env, "multiItemModule", {
    internalName: { [EN]: "Rabobank – MIM – Homepage pillars" },
    title: { [EN]: "Growing a better world together" },
    subtitle: {
      [EN]:
        "Explore how Rabobank supports clients, communities, and global transitions.",
    },
    items: {
      [EN]: pillarDefs.map((d) => link(pillarHeroes[d.key])),
    },
    layout: { [EN]: "grid" },
    columns: { [EN]: 3 },
    showArrows: { [EN]: false },
    showDots: { [EN]: false },
    backgroundTheme: { [EN]: "default" },
  });

  const cooperativeModuleId = await createEntry(env, "multiItemModule", {
    internalName: { [EN]: "Rabobank – MIM – Cooperative story" },
    title: { [EN]: "A cooperative bank with a mission" },
    subtitle: {
      [EN]:
        "We embrace innovation, growth, and sustainability — and invest in joint solutions that benefit everyone.",
    },
    items: { [EN]: [link(cooperativeHeroId)] },
    layout: { [EN]: "list" },
    columns: { [EN]: 1 },
    showArrows: { [EN]: false },
    showDots: { [EN]: false },
    backgroundTheme: { [EN]: "alt" },
  });

  const securityModuleId = await createEntry(env, "multiItemModule", {
    internalName: { [EN]: "Rabobank – MIM – Security & trust" },
    title: { [EN]: "Banking you can rely on" },
    subtitle: {
      [EN]:
        "Protection, personal service, and digital convenience — the cooperative way.",
    },
    items: {
      [EN]: Object.values(securityHeroCards).map((id) => link(id)),
    },
    layout: { [EN]: "grid" },
    columns: { [EN]: 3 },
    showArrows: { [EN]: false },
    showDots: { [EN]: false },
    backgroundTheme: { [EN]: "default" },
  });

  const personalModuleId = await createEntry(env, "multiItemModule", {
    internalName: { [EN]: "Rabobank – MIM – Personal services" },
    title: { [EN]: "Banking for everyday life" },
    subtitle: {
      [EN]:
        "Accounts, savings, mortgages, and insurance — designed around how you live and work.",
    },
    items: {
      [EN]: [
        link(
          await createEntry(env, "heroModule", {
            internalTitle: { [EN]: "Rabobank – Hero – Personal – Daily banking" },
            headline: { [EN]: "Everyday banking" },
            subCopy: {
              [EN]:
                "Manage payments, cards, and savings in one place — in branch, online, or on the Rabobank app.",
            },
            image: { [EN]: link(imageEntryIds.personal) },
            size: { [EN]: "Small" },
            trackingName: { [EN]: "rabobank_personal_daily" },
            metricEventName: { [EN]: "hero_cta_clicked" },
          })
        ),
        link(
          await createEntry(env, "heroModule", {
            internalTitle: { [EN]: "Rabobank – Hero – Personal – Home & life" },
            headline: { [EN]: "Home & life goals" },
            subCopy: {
              [EN]:
                "Mortgages, insurance, and planning tools to help you build financial confidence for the long term.",
            },
            image: { [EN]: link(imageEntryIds.cooperative) },
            size: { [EN]: "Small" },
            trackingName: { [EN]: "rabobank_personal_home" },
            metricEventName: { [EN]: "hero_cta_clicked" },
          })
        ),
      ],
    },
    layout: { [EN]: "grid" },
    columns: { [EN]: 2 },
    showArrows: { [EN]: false },
    showDots: { [EN]: false },
    backgroundTheme: { [EN]: "default" },
  });

  console.log("Updating heroes, CTAs, and pages...");
  await updateEntry(env, EXISTING.homeHero, {
    internalTitle: { [EN]: "Rabobank – Hero – Homepage" },
    headline: { [EN]: "Growing a better world together" },
    subCopy: {
      [EN]:
        "Rabobank is a cooperative bank with a mission. We embrace innovation, growth, and sustainability — and invest in joint solutions that benefit our clients, their neighbourhoods, and the world.",
    },
    image: { [EN]: link(imageEntryIds.hero) },
    trackingName: { [EN]: "rabobank_hp_hero" },
  });

  await updateEntry(env, EXISTING.securityHero, {
    internalTitle: { [EN]: "Rabobank – Hero – Sustainability & Security" },
    headline: { [EN]: "Secure banking for a sustainable future" },
    subCopy: {
      [EN]:
        "Protect your money with robust security while banking with a cooperative that invests in long-term sustainability for clients and communities.",
    },
    image: { [EN]: link(imageEntryIds.sustainability) },
    trackingName: { [EN]: "rabobank_security_hero" },
  });

  await updateEntry(env, EXISTING.homeCta, {
    internalTitle: { [EN]: "Rabobank – CTA – Homepage" },
    title: { [EN]: "Ready to grow together?" },
    body: {
      [EN]:
        "Discover how Rabobank's cooperative model, global expertise, and local presence can support your personal or business ambitions.",
    },
  });

  await updateEntry(env, EXISTING.helpCta, {
    internalTitle: { [EN]: "Rabobank – CTA – Help" },
    title: { [EN]: "Questions? We're here to help" },
    body: {
      [EN]:
        "Browse knowledge articles, contact your local Rabobank team, or find answers about products, sustainability, and digital banking.",
    },
  });

  await updateEntry(env, EXISTING.stripTopic, {
    internalName: { [EN]: "Rabobank – Notify – Annual results" },
    title: { [EN]: "Rabobank posts strong results for 2025" },
    tagline: { [EN]: "Read our latest annual report and impact highlights." },
    body: {
      [EN]: {
        nodeType: "document",
        data: {},
        content: [
          {
            nodeType: "paragraph",
            data: {},
            content: [
              {
                nodeType: "text",
                value:
                  "Net result of EUR 4,957 million reflects resilient performance across wholesale, retail, and sustainability-focused lending.",
                marks: [],
                data: {},
              },
            ],
          },
        ],
      },
    },
  });

  await updateEntry(env, EXISTING.homeStrip, {
    internalName: { [EN]: "Rabobank – News strip" },
    title: { [EN]: "Latest from Rabobank" },
  });

  const pageUpdates = [
    {
      id: EXISTING.homePage,
      internalTitle: "Rabobank – Homepage",
      title: "Rabobank | Growing a better world together",
      sections: [
        EXISTING.homeHero,
        EXISTING.homeStrip,
        homePillarsModuleId,
        cooperativeModuleId,
        EXISTING.homeCta,
      ],
      seo: EXISTING.homeSeo,
      seoTitle: "Rabobank – Cooperative banking for a better world",
      seoDesc:
        "Rabobank is a cooperative bank investing in innovation, sustainability, and solutions that benefit clients, communities, and the planet.",
    },
    {
      id: EXISTING.personalPage,
      internalTitle: "Rabobank – Personal Banking",
      title: "Personal Banking",
      sections: [EXISTING.homeHero, personalModuleId],
      seo: EXISTING.personalSeo,
      seoTitle: "Personal Banking – Rabobank",
      seoDesc:
        "Everyday accounts, savings, mortgages, and insurance from a cooperative bank that puts clients first.",
    },
    {
      id: EXISTING.businessPage,
      internalTitle: "Rabobank – Wholesale Banking",
      title: "Wholesale Banking",
      sections: [homePillarsModuleId, EXISTING.homeCta],
      seo: EXISTING.businessSeo,
      seoTitle: "Wholesale Banking – Rabobank",
      seoDesc:
        "Global Food & Agri banking and energy transition finance for corporates, institutions, and international trade.",
    },
    {
      id: EXISTING.securityPage,
      internalTitle: "Rabobank – Sustainability & Security",
      title: "Sustainability & Security",
      sections: [EXISTING.securityHero, securityModuleId],
      seo: EXISTING.securitySeo,
      seoTitle: "Sustainability & Security – Rabobank",
      seoDesc:
        "How Rabobank protects your banking and invests in sustainable transitions for clients and society.",
    },
    {
      id: EXISTING.helpPage,
      internalTitle: "Rabobank – Knowledge & Support",
      title: "Knowledge & Support",
      sections: [securityModuleId, EXISTING.helpCta],
      seo: EXISTING.helpSeo,
      seoTitle: "Knowledge & Support – Rabobank",
      seoDesc:
        "Research, insights, and help from Rabobank — financial knowledge and support when you need it.",
    },
  ];

  for (const page of pageUpdates) {
    await updateEntry(env, page.id, {
      internalTitle: { [EN]: page.internalTitle },
      title: { [EN]: page.title },
      sections: { [EN]: page.sections.map((id) => link(id)) },
    });
    await updateEntry(env, page.seo, {
      metaTitle: { [EN]: page.seoTitle },
      metaDescription: { [EN]: page.seoDesc },
    });
  }

  console.log("Updating navigation...");
  await updateEntry(env, EXISTING.headerNav, {
    internalName: { [EN]: "Rabobank – Header Main Navigation" },
  });
  await updateEntry(env, EXISTING.navPersonal, {
    internalName: { [EN]: "Rabobank – Nav – Personal" },
    label: { [EN]: "Personal" },
  });
  await updateEntry(env, EXISTING.navBusiness, {
    internalName: { [EN]: "Rabobank – Nav – Wholesale" },
    label: { [EN]: "Wholesale Banking" },
  });
  await updateEntry(env, EXISTING.navSecurity, {
    internalName: { [EN]: "Rabobank – Nav – Sustainability" },
    label: { [EN]: "Sustainability" },
  });
  await updateEntry(env, EXISTING.navHelp, {
    internalName: { [EN]: "Rabobank – Nav – Knowledge" },
    label: { [EN]: "Knowledge" },
  });

  console.log("Updating footer features...");
  const footerCopy = [
    {
      title: "Cooperative membership",
      description: "Part of a global network built on shared success",
      icon: "shield_check",
    },
    {
      title: "Local expertise",
      description: "Advisers who understand your region and sector",
      icon: "headphones",
    },
    {
      title: "Digital banking",
      description: "Secure app and online services, always within reach",
      icon: "credit-card",
    },
    {
      title: "Sustainable finance",
      description: "Investing in transitions that benefit everyone",
      icon: "truck",
    },
  ];
  for (let i = 0; i < EXISTING.footerFeatures.length; i++) {
    const id = EXISTING.footerFeatures[i];
    const copy = footerCopy[i];
    await updateEntry(env, id, {
      internalName: { [EN]: `Rabobank – Footer – ${copy.title}` },
      title: { [EN]: copy.title },
      description: { [EN]: copy.description },
      icon: { [EN]: copy.icon },
    });
  }

  console.log("Updating site settings...");
  await updateEntry(env, EXISTING.siteSettings, {
    internalName: { [EN]: "Rabobank – Site Settings" },
    logo: { [EN]: assetLink(logoAssetId) },
    logoAlt: { [EN]: "Rabobank" },
    logoLink: { [EN]: "/" },
    footerLegalText: {
      [EN]:
        "© 2026 Rabobank. Cooperative bank. Demo site for illustrative purposes only — not affiliated with Rabobank N.V.",
    },
    themePrimary: { [EN]: "#2C3696" },
    themeBackground: { [EN]: "#FFFFFF" },
    themeForeground: { [EN]: "#1A1A2E" },
    themeSecondary: { [EN]: "#EEF1F8" },
    themeAccent: { [EN]: "#F36717" },
    theme: { [EN]: RABOBANK_THEME },
  });

  console.log("\n✅ Rabobank environment rebranded.");
  console.log("Set NEXT_PUBLIC_CTF_ENVIRONMENT=rabobank to preview locally.");
  console.log("New multi-item modules:", {
    homePillarsModuleId,
    cooperativeModuleId,
    securityModuleId,
    personalModuleId,
  });
  console.log("Legacy RCM entries no longer referenced on pages:", {
    legacyRcm: EXISTING.legacyRcm,
    legacyRcmSecurity: EXISTING.legacyRcmSecurity,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

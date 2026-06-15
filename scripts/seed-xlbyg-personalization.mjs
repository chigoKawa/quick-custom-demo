/**
 * Seed XL-BYG personalization demo content into Contentful (xl-byg environment).
 * Run: node scripts/seed-xlbyg-personalization.mjs
 */
import contentfulManagement from "contentful-management";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPACE_ID = "ace0ba6p9v98";
const ENV_ID = "xl-byg";
const EN = "en-US";
const DA = "da";

const EXISTING = {
  homePage: "4fCfHLeXvsWb5C8dgAgm0k",
  heroControl: "7cLhmTvhMXQGeNhYhZjrzG",
  catalogControl: "4G6A2EqMwi6ODmXWT4bBmg",
  thirdSection: "4NsYHZb0pgaKqqChc78jYd",
};

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../lib/mock-data/products.json"), "utf8")
);
const byId = Object.fromEntries(products.map((p) => [p.id, p]));

function pickProducts(ids) {
  return {
    version: 1,
    selectionMode: "multiple",
    selectedProducts: ids.map((id) => {
      const p = byId[id];
      if (!p) throw new Error(`Missing product ${id}`);
      return {
        id: p.id,
        title: p.title,
        price: p.price,
        image: p.images[0],
        category: p.category,
      };
    }),
  };
}

const PRODUCT_SETS = {
  control: ["xlbyg-2432702", "xlbyg-2440883", "xlbyg-2543303", "xlbyg-2358653"],
  campaign: ["xlbyg-2358653", "xlbyg-2070047", "xlbyg-1611307", "xlbyg-2432702"],
  season: ["xlbyg-2265431", "xlbyg-2543303", "xlbyg-2432699", "xlbyg-2292691"],
  storm: ["xlbyg-1279579", "xlbyg-1490698", "xlbyg-5217168", "xlbyg-1306575"],
};

const HERO_IMAGES = {
  control: byId["xlbyg-2432702"].images[0],
  campaign: byId["xlbyg-2358653"].images[0],
  season: byId["xlbyg-2265431"].images[0],
  storm: byId["xlbyg-1279579"].images[0],
};

const COPY = {
  hero: {
    control: {
      en: {
        headline: "Everything for your summer projects",
        subCopy:
          "Strong prices on this season's most popular materials — tools, garden equipment and building supplies for every DIY project.",
        cta: "Shop seasonal offers",
      },
      da: {
        headline: "Alt til sommerens projekter",
        subCopy:
          "Skarpe priser på sæsonens mest populære materialer — værktøj, haveudstyr og byggematerialer til alle gør-det-selv-projekter.",
        cta: "Se sæsontilbud",
      },
    },
    campaign: {
      en: {
        headline: "Build your dream terrace this summer",
        subCopy:
          "The materials, tools and step-by-step guide — all in one place. Plan your terrace project with XL-BYG.",
        cta: "Plan your terrace",
      },
      da: {
        headline: "Byg drømmeterrassen i sommer",
        subCopy:
          "Materialer, værktøj og trin-for-trin guide — samlet ét sted. Planlæg dit terrasseprojekt med XL-BYG.",
        cta: "Planlæg din terrasse",
      },
    },
    season: {
      en: {
        headline: "Summer projects, ready at your local XL-BYG",
        subCopy:
          "Reserve online, pick up today with Click & Collect. See what's in stock at your nearest store.",
        cta: "See offers at your store",
      },
      da: {
        headline: "Sommerprojekter klar hos dit lokale XL-BYG",
        subCopy:
          "Reservér online og hent samme dag med Click & Collect. Se hvad der er på lager i din nærmeste butik.",
        cta: "Se tilbud i din butik",
      },
    },
    storm: {
      en: {
        headline: "Storm damage? We'll help you act fast",
        subCopy:
          "Repair materials in stock at your local XL-BYG — collect today and get your home protected.",
        cta: "Get repair materials",
      },
      da: {
        headline: "Stormskade? Vi hjælper dig hurtigt på vej",
        subCopy:
          "Reparationsmaterialer på lager i dit lokale XL-BYG — hent i dag og få hjemmet sikret.",
        cta: "Find reparationsmaterialer",
      },
    },
  },
  catalog: {
    control: {
      en: {
        title: "Most popular guides this week",
        body: 'Featured guide: "5 projects to start this summer" — plus trending products other DIYers are buying right now.',
      },
      da: {
        title: "Mest populære guider denne uge",
        body: 'Udvalgt guide: "5 projekter du kan starte i sommer" — plus trending produkter andre gør-det-selv-folk køber lige nu.',
      },
    },
    campaign: {
      en: {
        title: "Your terrace, step by step",
        body: 'Watch our WEBfilm "Build a terrace in a weekend" and add the full materials list to your cart in one click.',
      },
      da: {
        title: "Din terrasse, trin for trin",
        body: 'Se vores WEBfilm "Byg en terrasse på en weekend" og læg hele materialelisten i kurven med ét klik.',
      },
    },
    season: {
      en: {
        title: "Popular in your region right now",
        body: 'Guide: "Get your garden summer-ready" — seasonal picks weighted for local stock and Click & Collect availability.',
      },
      da: {
        title: "Populært i din region lige nu",
        body: 'Guide: "Gør haven sommerklar" — sæsonens udvalg tilpasset lokalt lager og Click & Collect.',
      },
    },
    storm: {
      en: {
        title: "Protect your home now",
        body: 'Guide: "Secure your roof before the next storm" — emergency repair materials ready for same-day collection.',
      },
      da: {
        title: "Beskyt dit hjem nu",
        body: 'Guide: "Sikr dit tag før næste storm" — akut reparationsmateriale klar til afhentning samme dag.',
      },
    },
  },
};

function utmCampaignRule(value, operator = "contains") {
  return {
    any: [
      {
        all: [
          {
            type: "page",
            count: "1",
            key: "",
            operator: "greaterThanInclusive",
            value: "",
            conditions: [
              {
                key: {
                  id: "context_campaign_name",
                  value: "context_campaign_name",
                  key: "context_campaign_name",
                  category: {
                    name: "utm_parameter",
                    label: "UTM Parameter",
                    type: "string",
                  },
                  label: "Campaign Name",
                  useOnce: true,
                },
                operator,
                value,
              },
            ],
          },
        ],
      },
    ],
  };
}

function utmSourceCampaignRule(source, campaignContains) {
  return {
    any: [
      {
        all: [
          {
            type: "page",
            count: "1",
            key: "",
            operator: "greaterThanInclusive",
            value: "",
            conditions: [
              {
                key: {
                  id: "context_campaign_source",
                  value: "context_campaign_source",
                  key: "context_campaign_source",
                  category: {
                    name: "utm_parameter",
                    label: "UTM Parameter",
                    type: "string",
                  },
                  label: "Campaign Source",
                  useOnce: true,
                },
                operator: "equal",
                value: source,
              },
              {
                key: {
                  id: "context_campaign_name",
                  value: "context_campaign_name",
                  key: "context_campaign_name",
                  category: {
                    name: "utm_parameter",
                    label: "UTM Parameter",
                    type: "string",
                  },
                  label: "Campaign Name",
                  useOnce: true,
                },
                operator: "contains",
                value: campaignContains,
              },
            ],
          },
        ],
      },
    ],
  };
}

async function createAsset(env, { title, url, fileName }) {
  const asset = await env.createAsset({
    fields: {
      title: { [EN]: title },
      file: {
        [EN]: {
          contentType: "image/webp",
          fileName,
          upload: url,
        },
      },
    },
  });
  const processed = await asset.processForAllLocales();
  const published = await processed.publish();
  return published.sys.id;
}

async function createEntry(env, contentTypeId, fields) {
  const entry = await env.createEntry(contentTypeId, { fields });
  const published = await entry.publish();
  return published.sys.id;
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
  const published = await updated.publish();
  return published.sys.id;
}

function link(id) {
  return { sys: { type: "Link", linkType: "Entry", id } };
}

function experienceConfig(baselineId, variantId) {
  return {
    distribution: [0, 1],
    traffic: 1,
    components: [
      {
        type: "EntryReplacement",
        baseline: { id: baselineId },
        variants: [{ id: variantId, hidden: false }],
      },
    ],
    primaryMetric: null,
  };
}

async function main() {
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  if (!token) throw new Error("CONTENTFUL_MANAGEMENT_TOKEN is not set");

  const client = contentfulManagement.createClient({ accessToken: token });
  const space = await client.getSpace(SPACE_ID);
  const env = await space.getEnvironment(ENV_ID);

  console.log("Uploading hero images...");
  const assetIds = {};
  for (const key of ["control", "campaign", "season", "storm"]) {
    assetIds[key] = await createAsset(env, {
      title: `XL-BYG Hero ${key}`,
      url: HERO_IMAGES[key],
      fileName: `xlbyg-hero-${key}.webp`,
    });
    console.log(`  asset ${key}: ${assetIds[key]}`);
  }

  console.log("Creating imageWithFocalPoint entries...");
  const imageEntryIds = {};
  for (const key of ["control", "campaign", "season", "storm"]) {
    imageEntryIds[key] = await createEntry(env, "imageWithFocalPoint", {
      title: { [EN]: `XL-BYG Hero Image – ${key}` },
      image: { [EN]: { sys: { type: "Link", linkType: "Asset", id: assetIds[key] } } },
      focalPoint: { [EN]: { x: 0.5, y: 0.45 } },
    });
  }

  console.log("Creating external links and buttons...");
  const buttonIds = {};
  for (const key of ["control", "campaign", "season", "storm"]) {
    const copy = COPY.hero[key];
    const extId = await createEntry(env, "externalLink", {
      internalTitle: { [EN]: `XL-BYG Hero CTA Link – ${key}` },
      title: { [EN]: copy.en.cta },
      url: { [EN]: "https://www.xl-byg.dk/" },
    });
    buttonIds[key] = await createEntry(env, "baseButton", {
      internalTitle: { [EN]: `XL-BYG Hero CTA – ${key}` },
      label: { [EN]: copy.en.cta, [DA]: copy.da.cta },
      target: { [EN]: link(extId) },
      size: { [EN]: "Medium" },
      variant: { [EN]: "Primary" },
      openInNewTab: { [EN]: false },
    });
  }

  console.log("Creating hero variants...");
  const heroVariantIds = {};
  for (const key of ["campaign", "season", "storm"]) {
    const copy = COPY.hero[key];
    heroVariantIds[key] = await createEntry(env, "heroModule", {
      internalTitle: { [EN]: `XL-BYG Hero – ${key}` },
      headline: { [EN]: copy.en.headline, [DA]: copy.da.headline },
      subCopy: { [EN]: copy.en.subCopy, [DA]: copy.da.subCopy },
      image: { [EN]: link(imageEntryIds[key]) },
      imagePlacement: { [EN]: "Right" },
      buttons: { [EN]: [link(buttonIds[key])] },
      trackingName: { [EN]: "hero_banner" },
      metricEventName: { [EN]: "hero_cta_clicked" },
    });
  }

  console.log("Updating control hero...");
  const controlHero = COPY.hero.control;
  await updateEntry(env, EXISTING.heroControl, {
    internalTitle: { [EN]: "XL-BYG Hero – Control" },
    headline: { [EN]: controlHero.en.headline, [DA]: controlHero.da.headline },
    subCopy: { [EN]: controlHero.en.subCopy, [DA]: controlHero.da.subCopy },
    image: { [EN]: link(imageEntryIds.control) },
    buttons: { [EN]: [link(buttonIds.control)] },
  });

  console.log("Creating product catalog variants...");
  const catalogVariantIds = {};
  for (const key of ["campaign", "season", "storm"]) {
    const copy = COPY.catalog[key];
    catalogVariantIds[key] = await createEntry(env, "productCatalog", {
      internalTitle: { [EN]: `XL-BYG Project Row – ${key}` },
      title: { [EN]: copy.en.title, [DA]: copy.da.title },
      body: { [EN]: copy.en.body, [DA]: copy.da.body },
      products: { [EN]: pickProducts(PRODUCT_SETS[key]) },
      metricEventName: { [EN]: "add_to_cart" },
    });
  }

  console.log("Updating control product catalog...");
  const controlCatalog = COPY.catalog.control;
  await updateEntry(env, EXISTING.catalogControl, {
    internalTitle: { [EN]: "XL-BYG Project Row – Control" },
    title: { [EN]: controlCatalog.en.title, [DA]: controlCatalog.da.title },
    body: { [EN]: controlCatalog.en.body, [DA]: controlCatalog.da.body },
    products: { [EN]: pickProducts(PRODUCT_SETS.control) },
    metricEventName: { [EN]: "add_to_cart" },
  });

  console.log("Creating audiences...");
  const audienceIds = {};
  audienceIds.campaign = await createEntry(env, "nt_audience", {
    nt_name: { [EN]: "XL-BYG – Campaign-Matched Arrivals" },
    nt_description: {
      [EN]:
        "Anonymous visitors from paid/email campaigns (UTM). Demo: ?utm_source=newsletter&utm_campaign=terrasse-summer",
    },
    nt_rules: {
      [EN]: utmSourceCampaignRule("newsletter", "terrasse"),
    },
    nt_audience_id: { [EN]: "xlbyg-campaign-matched-arrivals" },
    nt_metadata: { [EN]: { type: "origin" } },
  });

  audienceIds.season = await createEntry(env, "nt_audience", {
    nt_name: { [EN]: "XL-BYG – Season & Region Context" },
    nt_description: {
      [EN]:
        "No campaign match — season/region context. Demo: ?utm_campaign=summer-region",
    },
    nt_rules: { [EN]: utmCampaignRule("summer") },
    nt_audience_id: { [EN]: "xlbyg-season-region-context" },
    nt_metadata: { [EN]: { type: "origin" } },
  });

  audienceIds.storm = await createEntry(env, "nt_audience", {
    nt_name: { [EN]: "XL-BYG – Storm Damage Override" },
    nt_description: {
      [EN]:
        "Weather-event urgency override. Demo: ?utm_campaign=storm-damage",
    },
    nt_rules: { [EN]: utmCampaignRule("storm") },
    nt_audience_id: { [EN]: "xlbyg-storm-damage-override" },
    nt_metadata: { [EN]: { type: "origin" } },
  });

  console.log("Creating experiences...");
  const experienceIds = { hero: {}, catalog: {} };

  const experienceDefs = [
    { key: "storm", audience: audienceIds.storm, priority: 1 },
    { key: "campaign", audience: audienceIds.campaign, priority: 2 },
    { key: "season", audience: audienceIds.season, priority: 3 },
  ];

  for (const { key, audience } of experienceDefs) {
    experienceIds.hero[key] = await createEntry(env, "nt_experience", {
      nt_name: { [EN]: `XL-BYG Hero – ${key}` },
      nt_description: {
        [EN]: `Personalized hero for ${key} audience on XL-BYG homepage.`,
      },
      nt_type: { [EN]: "nt_personalization" },
      nt_config: {
        [EN]: experienceConfig(EXISTING.heroControl, heroVariantIds[key]),
      },
      nt_audience: { [EN]: link(audience) },
      nt_variants: { [EN]: [link(heroVariantIds[key])] },
      nt_experience_id: { [EN]: `xlbyg-hero-${key}` },
      nt_metadata: { [EN]: { type: "origin" } },
    });

    experienceIds.catalog[key] = await createEntry(env, "nt_experience", {
      nt_name: { [EN]: `XL-BYG Project Row – ${key}` },
      nt_description: {
        [EN]: `Personalized project row for ${key} audience on XL-BYG homepage.`,
      },
      nt_type: { [EN]: "nt_personalization" },
      nt_config: {
        [EN]: experienceConfig(EXISTING.catalogControl, catalogVariantIds[key]),
      },
      nt_audience: { [EN]: link(audience) },
      nt_variants: { [EN]: [link(catalogVariantIds[key])] },
      nt_experience_id: { [EN]: `xlbyg-catalog-${key}` },
      nt_metadata: { [EN]: { type: "origin" } },
    });
  }

  console.log("Linking experiences to baseline sections...");
  await updateEntry(env, EXISTING.heroControl, {
    nt_experiences: {
      [EN]: [
        link(experienceIds.hero.storm),
        link(experienceIds.hero.campaign),
        link(experienceIds.hero.season),
      ],
    },
  });

  await updateEntry(env, EXISTING.catalogControl, {
    nt_experiences: {
      [EN]: [
        link(experienceIds.catalog.storm),
        link(experienceIds.catalog.campaign),
        link(experienceIds.catalog.season),
      ],
    },
  });

  console.log("Updating homepage...");
  await updateEntry(env, EXISTING.homePage, {
    internalTitle: { [EN]: "XL-BYG – Home" },
    title: {
      [EN]: "XL-BYG – Everything for house and garden",
      [DA]: "XL-BYG – Alt til hus og have",
    },
  });

  console.log("\nDone! Demo URL params:");
  console.log("  Campaign:  ?utm_source=newsletter&utm_campaign=terrasse-summer");
  console.log("  Season:    ?utm_campaign=summer-region");
  console.log("  Storm:     ?utm_campaign=storm-damage");
  console.log("\nEntry IDs:", JSON.stringify({ audienceIds, heroVariantIds, catalogVariantIds, experienceIds }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

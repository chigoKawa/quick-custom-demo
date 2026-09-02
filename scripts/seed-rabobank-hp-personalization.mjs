/**
 * Homepage personalization for Rabobank young-audience demos.
 *
 * Creates EntryReplacement variants + nt_experience for each homepage section,
 * wired to the two existing audiences:
 *   - Social-first young starters (TikTok / Instagram / utm_campaign=social)
 *   - Young life-stage planners (savings / first-home / utm_campaign=savings)
 *
 * Run: CTF_MANAGEMENT_TOKEN=... node scripts/seed-rabobank-hp-personalization.mjs
 */
import contentfulManagement from "contentful-management";

const SPACE_ID = "ace0ba6p9v98";
const ENV_ID = "master";
const EN = "en-US";

const TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN || process.env.CTF_MANAGEMENT_TOKEN;
if (!TOKEN) {
  console.error("Set CONTENTFUL_MANAGEMENT_TOKEN or CTF_MANAGEMENT_TOKEN");
  process.exit(1);
}

const BASELINE = {
  hero: "1xdsettCtqHBkZCZvPKMr5",
  pillars: "2QVSrOjlZPL4LolSNNCswD",
  insights: "7nSwkpN5S6sZBsJkWl7T4k",
  cta: "67bOElv6wZg9evIDis2Lif",
};

const AUDIENCE = {
  social: "79YOhbi4KIeVyvVOZGQnYj",
  planner: "2Y4enrrkwAjGBmUDo8z4IC",
};

const PAGES = {
  personal: "4zIfX6HiIY0QWCoOeQAizh",
  help: "1Fd8ksZuMeU4wL5hkJDX45",
};

const BLOG_ITEMS = [
  "1HB4nLCkjMfHpKxbbGmxUd",
  "1tnZPKoq0ld3iBRI78hkbq",
  "UdA6nqVoKuZ9ofM5zYvtA",
  "2Q5bsr1m5BcM4sxGykstzE",
];

const IMAGES = {
  socialHero: "https://images.pexels.com/photos/7947531/pexels-photo-7947531.jpeg?auto=compress&cs=tinysrgb&w=1600",
  socialTile1: "https://images.pexels.com/photos/8878732/pexels-photo-8878732.jpeg?auto=compress&cs=tinysrgb&w=1200",
  socialTile2: "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200",
  socialTile3: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=1200",
  socialCta: "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1200",
  plannerHero: "https://images.pexels.com/photos/8293778/pexels-photo-8293778.jpeg?auto=compress&cs=tinysrgb&w=1600",
  plannerTile1: "https://images.pexels.com/photos/3949178/pexels-photo-3949178.jpeg?auto=compress&cs=tinysrgb&w=1200",
  plannerTile2: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200",
  plannerTile3: "https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=1200",
  plannerCta: "https://images.pexels.com/photos/6476582/pexels-photo-6476582.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

const COPY = {
  social: {
    hero: {
      headline: "Banking that fits your life",
      subCopy:
        "Open an account in minutes, manage money from your phone, and take your first confident steps — no jargon, no fuss.",
      primary: "Get started",
      secondary: "See how it works",
    },
    pillars: {
      title: "Start here",
      subtitle: "Everything you need for your first steps — simple, fast, and built for mobile.",
      tiles: [
        { title: "Open in minutes", tagline: "Set up your account digitally — quick, clear, and on your terms." },
        { title: "App-first banking", tagline: "Pay, save, and stay in control — all from your phone." },
        { title: "Build confidence", tagline: "Straightforward tools and tips as you find your footing with money." },
      ],
    },
    insights: {
      title: "Tips for getting started",
      subtitle: "Short reads to help you feel confident — from your first account to your first savings goal.",
    },
    cta: {
      title: "Ready to take the first step?",
      body: "Join thousands of young Rabobank clients who bank simply, on their terms — from your phone, in minutes.",
      primary: "Get started",
      secondary: "Talk to us",
    },
  },
  planner: {
    hero: {
      headline: "Plan today. Grow tomorrow.",
      subCopy:
        "Whether you're building savings, planning your first home, or mapping your next milestone — Rabobank helps you turn goals into a clear plan.",
      primary: "Start saving smart",
      secondary: "Explore your options",
    },
    pillars: {
      title: "Build toward what's next",
      subtitle: "From your first savings goal to your first home — structured support at every life stage.",
      tiles: [
        { title: "Smart saving", tagline: "Set goals, track progress, and watch your plan take shape." },
        { title: "First home", tagline: "Mortgages and guidance tailored for first-time buyers." },
        { title: "Financial planning", tagline: "Tools and advice for life's bigger decisions — on your timeline." },
      ],
    },
    insights: {
      title: "Guides for your next milestone",
      subtitle: "Practical insights on saving, home ownership, and building long-term financial confidence.",
    },
    cta: {
      title: "Your goals deserve a plan",
      body: "Let's build a savings and home plan that fits your life stage — from your first salary to your first keys.",
      primary: "Start saving smart",
      secondary: "Book a consultation",
    },
  },
};

function link(id) {
  return { sys: { type: "Link", linkType: "Entry", id } };
}

function assetLink(id) {
  return { sys: { type: "Link", linkType: "Asset", id } };
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

async function createAsset(env, { title, url, fileName }) {
  const asset = await env.createAsset({
    fields: {
      title: { [EN]: title },
      description: { [EN]: title },
      file: { [EN]: { contentType: "image/jpeg", fileName, upload: url } },
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

async function appendExperiences(env, entryId, newExpIds) {
  const entry = await env.getEntry(entryId);
  const existing = entry.fields.nt_experiences?.[EN] ?? [];
  const existingIds = new Set(existing.map((l) => l.sys.id));
  const merged = [...existing];
  for (const id of newExpIds) {
    if (!existingIds.has(id)) merged.push(link(id));
  }
  entry.fields.nt_experiences = { [EN]: merged };
  const updated = await entry.update();
  return (await updated.publish()).sys.id;
}

async function createImageEntry(env, title, assetId) {
  return createEntry(env, "imageWithFocalPoint", {
    title: { [EN]: title },
    image: { [EN]: assetLink(assetId) },
    focalPoint: { [EN]: { x: 0.5, y: 0.45 } },
  });
}

async function createButtons(env, prefix, copy, primaryTarget, secondaryTarget) {
  const primary = await createEntry(env, "baseButton", {
    internalTitle: { [EN]: `${prefix} – ${copy.primary}` },
    label: { [EN]: copy.primary },
    target: { [EN]: link(primaryTarget) },
    size: { [EN]: "Large" },
    variant: { [EN]: "Primary" },
    openInNewTab: { [EN]: false },
  });
  const secondary = await createEntry(env, "baseButton", {
    internalTitle: { [EN]: `${prefix} – ${copy.secondary}` },
    label: { [EN]: copy.secondary },
    target: { [EN]: link(secondaryTarget) },
    size: { [EN]: "Large" },
    variant: { [EN]: "Secondary" },
    openInNewTab: { [EN]: false },
  });
  return [primary, secondary];
}

async function buildAudienceVariants(env, key, copy, imageKeys, tileImageKeys, ctaAssetId) {
  const label = key === "social" ? "Social-first" : "Life-stage";

  console.log(`\n── ${label} ──`);
  const heroAsset = await createAsset(env, {
    title: `Rabobank HP Hero – ${label}`,
    url: IMAGES[imageKeys.hero],
    fileName: `rabobank-hp-hero-${key}.jpg`,
  });
  const heroImage = await createImageEntry(env, `Rabobank – Hero Image – HP ${label}`, heroAsset);
  const [heroPrimary, heroSecondary] = await createButtons(
    env,
    `Rabobank HP Hero – ${label}`,
    copy.hero,
    PAGES.personal,
    PAGES.help
  );
  const heroId = await createEntry(env, "heroModule", {
    internalTitle: { [EN]: `Rabobank – Hero – HP ${label} – ${copy.hero.headline.slice(0, 40)}` },
    headline: { [EN]: copy.hero.headline },
    subCopy: { [EN]: copy.hero.subCopy },
    image: { [EN]: link(heroImage) },
    imagePlacement: { [EN]: "Right" },
    buttons: { [EN]: [link(heroPrimary), link(heroSecondary)] },
    metricEventName: { [EN]: "hero_cta_clicked" },
    trackingName: { [EN]: `rabobank_hp_hero_${key}` },
    size: { [EN]: "Medium" },
    textContrast: { [EN]: "Dark on light" },
  });
  console.log(`  hero variant: ${heroId}`);

  const tileIds = [];
  for (let i = 0; i < 3; i++) {
    const tileCopy = copy.pillars.tiles[i];
    const assetId = await createAsset(env, {
      title: `Rabobank HP Tile ${i + 1} – ${label}`,
      url: IMAGES[tileImageKeys[i]],
      fileName: `rabobank-hp-tile-${key}-${i + 1}.jpg`,
    });
    tileIds.push(
      await createEntry(env, "generalTopic", {
        internalName: { [EN]: `Rabobank – Tile – HP ${label} – ${tileCopy.title}` },
        title: { [EN]: tileCopy.title },
        tagline: { [EN]: tileCopy.tagline },
        media: { [EN]: assetLink(assetId) },
      })
    );
  }
  const pillarsId = await createEntry(env, "multiItemModule", {
    internalName: { [EN]: `Rabobank – MIM – HP Pillars ${label} – ${copy.pillars.title}` },
    title: { [EN]: copy.pillars.title },
    subtitle: { [EN]: copy.pillars.subtitle },
    items: { [EN]: tileIds.map(link) },
    layout: { [EN]: "grid" },
    columns: { [EN]: 3 },
    autoplay: { [EN]: false },
    autoplayDelayMs: { [EN]: 5000 },
    showArrows: { [EN]: false },
    showDots: { [EN]: false },
    backgroundTheme: { [EN]: "default" },
  });
  console.log(`  pillars variant: ${pillarsId}`);

  const insightsId = await createEntry(env, "multiItemModule", {
    internalName: { [EN]: `Rabobank – MIM – HP Insights ${label} – ${copy.insights.title}` },
    title: { [EN]: copy.insights.title },
    subtitle: { [EN]: copy.insights.subtitle },
    items: { [EN]: BLOG_ITEMS.map(link) },
    layout: { [EN]: "grid" },
    columns: { [EN]: 4 },
    autoplay: { [EN]: false },
    autoplayDelayMs: { [EN]: 5000 },
    showArrows: { [EN]: false },
    showDots: { [EN]: false },
    backgroundTheme: { [EN]: "alt" },
  });
  console.log(`  insights variant: ${insightsId}`);

  const [ctaPrimary, ctaSecondary] = await createButtons(
    env,
    `Rabobank HP CTA – ${label}`,
    copy.cta,
    PAGES.personal,
    PAGES.help
  );
  const ctaId = await createEntry(env, "cta", {
    internalTitle: { [EN]: `Rabobank – CTA – HP ${label} – ${copy.cta.title}` },
    title: { [EN]: copy.cta.title },
    body: { [EN]: copy.cta.body },
    actionButtons: { [EN]: [link(ctaPrimary), link(ctaSecondary)] },
    backgroundColor: { [EN]: "Primary" },
    images: { [EN]: [assetLink(ctaAssetId)] },
    imagePlacement: { [EN]: "Right" },
    variant: { [EN]: "Smooth" },
  });
  console.log(`  cta variant: ${ctaId}`);

  return { heroId, pillarsId, insightsId, ctaId };
}

async function createExperiences(env, audienceKey, audienceId, variants) {
  const label = audienceKey === "social" ? "Social-first young starters" : "Young life-stage planners";
  const expIds = {};

  for (const section of ["hero", "pillars", "insights", "cta"]) {
    const baselineId = BASELINE[section];
    const variantId = variants[`${section}Id`];
    expIds[section] = await createEntry(env, "nt_experience", {
      nt_name: { [EN]: `Rabobank – HP ${section} – ${label}` },
      nt_description: {
        [EN]:
          audienceKey === "social"
            ? `Homepage ${section} variant for visitors from TikTok, Instagram, or social paid campaigns — lighter tone, first-step focus.`
            : `Homepage ${section} variant for visitors from savings or first-home campaigns — goal-oriented planning tone.`,
      },
      nt_type: { [EN]: "nt_personalization" },
      nt_config: { [EN]: experienceConfig(baselineId, variantId) },
      nt_audience: { [EN]: link(audienceId) },
      nt_variants: { [EN]: [link(variantId)] },
      nt_experience_id: { [EN]: `rabobank-hp-${section}-${audienceKey}` },
      nt_metadata: { [EN]: { type: "origin" } },
    });
    console.log(`  experience ${section}: ${expIds[section]}`);
  }
  return expIds;
}

async function main() {
  const client = contentfulManagement.createClient({ accessToken: TOKEN });
  const space = await client.getSpace(SPACE_ID);
  const env = await space.getEnvironment(ENV_ID);

  console.log("Uploading CTA images...");
  const socialCtaAsset = await createAsset(env, {
    title: "Rabobank HP CTA – Social-first",
    url: IMAGES.socialCta,
    fileName: "rabobank-hp-cta-social.jpg",
  });
  const plannerCtaAsset = await createAsset(env, {
    title: "Rabobank HP CTA – Life-stage",
    url: IMAGES.plannerCta,
    fileName: "rabobank-hp-cta-planner.jpg",
  });

  const socialVariants = await buildAudienceVariants(
    env,
    "social",
    COPY.social,
    { hero: "socialHero" },
    ["socialTile1", "socialTile2", "socialTile3"],
    socialCtaAsset
  );

  const plannerVariants = await buildAudienceVariants(
    env,
    "planner",
    COPY.planner,
    { hero: "plannerHero" },
    ["plannerTile1", "plannerTile2", "plannerTile3"],
    plannerCtaAsset
  );

  console.log("\nCreating experiences...");
  const socialExp = await createExperiences(env, "social", AUDIENCE.social, socialVariants);
  const plannerExp = await createExperiences(env, "planner", AUDIENCE.planner, plannerVariants);

  console.log("\nLinking experiences to baseline sections...");
  for (const section of ["hero", "pillars", "insights", "cta"]) {
    await appendExperiences(env, BASELINE[section], [socialExp[section], plannerExp[section]]);
    console.log(`  linked ${section} baseline ${BASELINE[section]}`);
  }

  console.log("\n✓ Done. Demo URLs:");
  console.log("  Social-first:  /?utm_source=TikTok&utm_campaign=social");
  console.log("  Social-first:  /?utm_source=instagram&utm_campaign=social");
  console.log("  Life-stage:    /?utm_campaign=savings");
  console.log("  Life-stage:    /?savings (path contains 'savings' on audience rules)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

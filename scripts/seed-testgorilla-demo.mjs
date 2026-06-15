/**
 * Seed TestGorilla personalized demo into Contentful (testGorilla environment).
 * Run: node scripts/seed-testgorilla-demo.mjs
 */
import contentfulManagement from "contentful-management";

const SPACE_ID = "ace0ba6p9v98";
const ENV_ID = "testGorilla";
const EN = "en-US";

const EXISTING = {
  homePage: "4fCfHLeXvsWb5C8dgAgm0k",
  heroBaseline: "7cLhmTvhMXQGeNhYhZjrzG",
  homeSeo: "2HjgAQrvx7jlfJ2nVe4zJu",
  siteSettings: "4ztHcledfu8ov9Fn8vYWZU",
  audienceSmb: "3PzPZcp0oLAr1SbMt05DI1",
  audienceEnterprise: "4rkWwwCmt6fQxt42D94ZC5",
};

const HERO_IMAGES = {
  control:
    "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1600",
  smb: "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1600",
  enterprise:
    "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1600",
  pricing:
    "https://images.pexels.com/photos/7376/people-office-group-team.jpg?auto=compress&cs=tinysrgb&w=1600",
};

const LOGO_URL =
  "https://www.testgorilla.com/hubfs/TestGorilla%20Logo.svg";

function richDoc(paragraphs) {
  return {
    nodeType: "document",
    data: {},
    content: paragraphs.map((text) => ({
      nodeType: "paragraph",
      data: {},
      content: [{ nodeType: "text", value: text, marks: [], data: {} }],
    })),
  };
}

function link(id) {
  return { sys: { type: "Link", linkType: "Entry", id } };
}

function assetLink(id) {
  return { sys: { type: "Link", linkType: "Asset", id } };
}

function personalizationConfig(baselineId, variantId) {
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

function experimentConfig(baselineId, variantIds, weights) {
  return {
    distribution: weights,
    traffic: 1,
    components: [
      {
        type: "EntryReplacement",
        baseline: { id: baselineId },
        variants: variantIds.map((id) => ({ id, hidden: false })),
      },
    ],
    primaryMetric: null,
  };
}

async function createAsset(env, { title, url, fileName, contentType = "image/jpeg" }) {
  const asset = await env.createAsset({
    fields: {
      title: { [EN]: title },
      description: { [EN]: title },
      file: {
        [EN]: { contentType, fileName, upload: url },
      },
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

async function main() {
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  if (!token) throw new Error("CONTENTFUL_MANAGEMENT_TOKEN is not set");

  const client = contentfulManagement.createClient({ accessToken: token });
  const space = await client.getSpace(SPACE_ID);
  const env = await space.getEnvironment(ENV_ID);

  const created = { assets: [], entries: [] };

  console.log("Publishing SMB audience if needed...");
  const smbAudience = await env.getEntry(EXISTING.audienceSmb);
  if (!smbAudience.sys.publishedVersion) {
    await smbAudience.publish();
  }

  console.log("Uploading assets...");
  const assetIds = {};
  for (const [key, url] of Object.entries(HERO_IMAGES)) {
    assetIds[key] = await createAsset(env, {
      title: `TestGorilla – ${key} hero`,
      url,
      fileName: `testgorilla-hero-${key}.jpg`,
    });
    created.assets.push(assetIds[key]);
    console.log(`  ${key}: ${assetIds[key]}`);
  }

  let logoAssetId;
  try {
    logoAssetId = await createAsset(env, {
      title: "TestGorilla logo",
      url: LOGO_URL,
      fileName: "testgorilla-logo.svg",
      contentType: "image/svg+xml",
    });
    created.assets.push(logoAssetId);
  } catch {
    logoAssetId = assetIds.control;
    console.log("  logo: using hero asset fallback");
  }

  console.log("Creating imageWithFocalPoint entries...");
  const imageIds = {};
  for (const key of Object.keys(HERO_IMAGES)) {
    imageIds[key] = await createEntry(env, "imageWithFocalPoint", {
      title: { [EN]: `TestGorilla Hero Image – ${key}` },
      image: { [EN]: assetLink(assetIds[key]) },
      focalPoint: { [EN]: { x: 0.5, y: 0.4, version: 1 } },
    });
    created.entries.push(imageIds[key]);
  }

  console.log("Creating supporting landing pages + SEO...");
  const pageIds = {};
  const pageDefs = [
    {
      key: "pricing",
      slug: "pricing",
      title: "Pricing",
      seoTitle: "TestGorilla Pricing – Plans for every hiring team",
      seoDesc:
        "Transparent plans for occasional hiring and enterprise-scale teams. Start free or talk to sales about volume pricing and ATS integrations.",
      headline: "Plans that scale with how you hire",
      subCopy:
        "From a free tier for your first roles to enterprise packages with ATS sync, dedicated support, and unlimited assessments.",
    },
    {
      key: "assessments",
      slug: "assessments",
      title: "Assessments",
      seoTitle: "Skills Assessments – TestGorilla",
      seoDesc:
        "350+ scientifically validated tests plus AI-assisted scoring. Build fair shortlists in minutes, not weeks.",
      headline: "Let skills do the talking",
      subCopy:
        "Pick role-relevant tests, add custom questions, and auto-score responses so recruiters focus on finalists—not resume keywords.",
    },
    {
      key: "sourcing",
      slug: "sourcing",
      title: "Sourcing",
      seoTitle: "TestGorilla Sourcing – 2M+ skills-tested talent",
      seoDesc:
        "Discover pre-assessed candidates from a global talent pool and invite them straight into your hiring workflow.",
      headline: "Source skills-tested talent at scale",
      subCopy:
        "Search 2M+ candidates who have already demonstrated ability. Reduce time-to-shortlist and improve quality of hire.",
    },
    {
      key: "book-demo",
      slug: "book-demo",
      title: "Book a demo",
      seoTitle: "Book a TestGorilla demo",
      seoDesc:
        "See how skills-based hiring, ATS integrations, and AI screening fit your high-volume hiring program.",
      headline: "See TestGorilla on your hiring stack",
      subCopy:
        "Walk through assessments, sourcing, and analytics with a product specialist—tailored to your ATS and volume.",
    },
  ];

  for (const p of pageDefs) {
    const seoId = await createEntry(env, "seo", {
      internalTitle: { [EN]: `TestGorilla – SEO – ${p.title}` },
      title: { [EN]: p.seoTitle },
      description: { [EN]: p.seoDesc },
      noindex: { [EN]: false },
      nofollow: { [EN]: false },
    });
    created.entries.push(seoId);

    const subHeroId = await createEntry(env, "heroModule", {
      internalTitle: { [EN]: `TestGorilla – ${p.title} – Hero` },
      headline: { [EN]: p.headline },
      subCopy: { [EN]: p.subCopy },
      image: { [EN]: link(imageIds.control) },
      imagePlacement: { [EN]: "Right" },
      trackingName: { [EN]: "hero_banner" },
      metricEventName: { [EN]: "hero_cta_clicked" },
      size: { [EN]: "Small" },
      textContrast: { [EN]: "Dark on light" },
    });
    created.entries.push(subHeroId);

    pageIds[p.key] = await createEntry(env, "landingPage", {
      internalTitle: { [EN]: `TestGorilla – ${p.title}` },
      title: { [EN]: p.title },
      slug: { [EN]: p.slug },
      sections: { [EN]: [link(subHeroId)] },
      seoMetadata: { [EN]: link(seoId) },
    });
    created.entries.push(pageIds[p.key]);
  }

  console.log("Creating navigation buttons...");
  const buttonIds = {};
  const buttonDefs = [
    { key: "startFree", label: "Start free", page: "assessments", variant: "Primary" },
    { key: "seePricing", label: "See pricing", page: "pricing", variant: "Secondary" },
    { key: "bookDemo", label: "Book a demo", page: "book-demo", variant: "Primary" },
    { key: "exploreEnterprise", label: "Explore enterprise", page: "sourcing", variant: "Secondary" },
    { key: "tryFree", label: "Try for free", page: "assessments", variant: "Primary" },
  ];
  for (const b of buttonDefs) {
    buttonIds[b.key] = await createEntry(env, "baseButton", {
      internalTitle: { [EN]: `TestGorilla – ${b.label}` },
      label: { [EN]: b.label },
      target: { [EN]: link(pageIds[b.page]) },
      size: { [EN]: "Medium" },
      variant: { [EN]: b.variant },
      openInNewTab: { [EN]: false },
    });
    created.entries.push(buttonIds[b.key]);
  }

  console.log("Creating hero modules...");
  const heroIds = {};

  heroIds.control = EXISTING.heroBaseline;
  await updateEntry(env, heroIds.control, {
    internalTitle: { [EN]: "TestGorilla – Home Hero – Control" },
    headline: { [EN]: "Hire for real skills, not polished resumes" },
    subCopy: {
      [EN]:
        "De-risk every hire with science-backed assessments. Measure how candidates think, solve, and perform—so AI-generated CVs never become your shortlist.",
    },
    image: { [EN]: link(imageIds.control) },
    buttons: {
      [EN]: [link(buttonIds.tryFree), link(buttonIds.seePricing)],
    },
    textContrast: { [EN]: "Light on dark" },
    size: { [EN]: "Large" },
    textAnchor: { [EN]: { x: 0.08, y: 0.75, version: 1 } },
    nt_experiences: { [EN]: [] },
  });

  heroIds.smb = await createEntry(env, "heroModule", {
    internalTitle: { [EN]: "TestGorilla – Home Hero – SMB self-serve" },
    headline: { [EN]: "Start free in 5 minutes — no credit card" },
    subCopy: {
      [EN]:
        "Spin up your first assessment today. Teams like MedX and Opinion Stage hire faster without annual lock-in—pay only when you need more seats.",
    },
    image: { [EN]: link(imageIds.smb) },
    buttons: {
      [EN]: [link(buttonIds.startFree), link(buttonIds.seePricing)],
    },
    trackingName: { [EN]: "hero_banner" },
    metricEventName: { [EN]: "hero_cta_clicked" },
    size: { [EN]: "Large" },
    textContrast: { [EN]: "Light on dark" },
    textAnchor: { [EN]: { x: 0.08, y: 0.75, version: 1 } },
  });
  created.entries.push(heroIds.smb);

  heroIds.smbBookDemo = await createEntry(env, "heroModule", {
    internalTitle: { [EN]: "TestGorilla – Home Hero – SMB A/B Book demo" },
    headline: { [EN]: "Start free in 5 minutes — no credit card" },
    subCopy: {
      [EN]:
        "Not sure which plan fits? Talk to our team—or explore pricing built for occasional hiring with no long-term contract.",
    },
    image: { [EN]: link(imageIds.smb) },
    buttons: {
      [EN]: [link(buttonIds.bookDemo), link(buttonIds.seePricing)],
    },
    trackingName: { [EN]: "hero_banner" },
    metricEventName: { [EN]: "hero_cta_clicked" },
    size: { [EN]: "Large" },
    textContrast: { [EN]: "Light on dark" },
    textAnchor: { [EN]: { x: 0.08, y: 0.75, version: 1 } },
  });
  created.entries.push(heroIds.smbBookDemo);

  heroIds.enterprise = await createEntry(env, "heroModule", {
    internalTitle: { [EN]: "TestGorilla – Home Hero – Enterprise evaluator" },
    headline: { [EN]: "Hire at scale, without the resume pile" },
    subCopy: {
      [EN]:
        "Revolut cut time-to-hire 40%. Dyninno made 2,000 hires with skills-based testing. Connect your ATS and source from 2M+ pre-assessed candidates.",
    },
    image: { [EN]: link(imageIds.enterprise) },
    buttons: {
      [EN]: [link(buttonIds.bookDemo), link(buttonIds.exploreEnterprise)],
    },
    trackingName: { [EN]: "hero_banner" },
    metricEventName: { [EN]: "hero_cta_clicked" },
    size: { [EN]: "Large" },
    textContrast: { [EN]: "Light on dark" },
    textAnchor: { [EN]: { x: 0.08, y: 0.75, version: 1 } },
  });
  created.entries.push(heroIds.enterprise);

  console.log("Creating value prop + final CTA sections...");
  const valuePropId = await createEntry(env, "richContentModule", {
    internalTitle: { [EN]: "TestGorilla – Value proposition" },
    title: { [EN]: "Where skills meet their match" },
    body: {
      [EN]: richDoc([
        "More than 1.5 million candidates are assessed on TestGorilla every year—giving talent teams signal that resumes cannot.",
        "Choose from 350+ scientifically designed tests, add AI video interviews and resume scoring, and shortlist on ability—not keywords.",
        "2 in 3 companies report fewer mis-hires; teams routinely see up to 80% lower cost and time-to-hire when they hire on skills.",
      ]),
    },
    layout: { [EN]: "full-width" },
  });
  created.entries.push(valuePropId);

  const valuePropEnterpriseId = await createEntry(env, "richContentModule", {
    internalTitle: { [EN]: "TestGorilla – Value prop – Enterprise ATS" },
    title: { [EN]: "ATS integrations + sourcing built for volume" },
    body: {
      [EN]: richDoc([
        "Sync with Greenhouse, Lever, Workday, and 50+ ATS partners so assessments and scores flow into workflows recruiters already use.",
        "TestGorilla Sourcing surfaces 2M+ skills-tested candidates—invite them into assessments without rebuilding your stack.",
        "Enterprise teams get dedicated onboarding, security reviews, and ROI reporting tied to time-to-hire and quality-of-hire metrics.",
      ]),
    },
    layout: { [EN]: "full-width" },
  });
  created.entries.push(valuePropEnterpriseId);

  const finalCtaId = await createEntry(env, "cta", {
    internalTitle: { [EN]: "TestGorilla – Final CTA" },
    title: { [EN]: "Ready to hire on skills?" },
    body: {
      [EN]:
        "Join thousands of companies using TestGorilla to make fairer, faster hiring decisions—from your first role to your next thousand.",
    },
    actionButtons: {
      [EN]: [link(buttonIds.startFree), link(buttonIds.bookDemo)],
    },
    backgroundColor: { [EN]: "Primary" },
    variant: { [EN]: "Simple" },
    imagePlacement: { [EN]: "Right" },
    metricEventName: { [EN]: "demo_request_submitted" },
  });
  created.entries.push(finalCtaId);

  console.log("Creating pricing page heroes for enterprise A/B...");
  const pricingHeroControlId = await createEntry(env, "heroModule", {
    internalTitle: { [EN]: "TestGorilla – Pricing Hero – Control" },
    headline: { [EN]: "Plans that scale with how you hire" },
    subCopy: {
      [EN]:
        "Start free for occasional roles or talk to us about enterprise packages with ATS sync, security, and volume pricing.",
    },
    image: { [EN]: link(imageIds.pricing) },
    buttons: {
      [EN]: [link(buttonIds.tryFree), link(buttonIds.bookDemo)],
    },
    trackingName: { [EN]: "hero_banner" },
    metricEventName: { [EN]: "hero_cta_clicked" },
    size: { [EN]: "Medium" },
    textContrast: { [EN]: "Dark on light" },
  });
  created.entries.push(pricingHeroControlId);

  const pricingHeroRoiId = await createEntry(env, "heroModule", {
    internalTitle: { [EN]: "TestGorilla – Pricing Hero – ROI led" },
    headline: { [EN]: "Prove ROI before you scale spend" },
    subCopy: {
      [EN]:
        "Model time-to-hire and mis-hire reduction with your volume. Enterprise plans include ATS integrations, sourcing, and customer success aligned to hiring KPIs.",
    },
    image: { [EN]: link(imageIds.enterprise) },
    buttons: {
      [EN]: [link(buttonIds.bookDemo), link(buttonIds.exploreEnterprise)],
    },
    trackingName: { [EN]: "hero_banner" },
    metricEventName: { [EN]: "hero_cta_clicked" },
    size: { [EN]: "Medium" },
    textContrast: { [EN]: "Dark on light" },
  });
  created.entries.push(pricingHeroRoiId);

  const pricingSeoId = await createEntry(env, "seo", {
    internalTitle: { [EN]: "TestGorilla – SEO – Pricing (refresh)" },
    title: { [EN]: "TestGorilla Pricing – Skills-based hiring plans" },
    description: {
      [EN]:
        "Compare free, team, and enterprise plans. Skills assessments, AI screening, and sourcing—priced for SMB self-serve and high-volume hiring.",
    },
    noindex: { [EN]: false },
    nofollow: { [EN]: false },
  });
  created.entries.push(pricingSeoId);

  await updateEntry(env, pageIds.pricing, {
    sections: { [EN]: [link(pricingHeroControlId)] },
    seoMetadata: { [EN]: link(pricingSeoId) },
  });

  console.log("Creating Ninetailed experiences...");
  const expIds = {};

  expIds.heroSmb = await createEntry(env, "nt_experience", {
    nt_name: { [EN]: "TestGorilla – Home hero – SMB self-serve" },
    nt_description: {
      [EN]: "Paid SMB traffic: start-fast messaging. Demo: ?utm_campaign=smb",
    },
    nt_type: { [EN]: "nt_personalization" },
    nt_config: {
      [EN]: personalizationConfig(heroIds.control, heroIds.smb),
    },
    nt_audience: { [EN]: link(EXISTING.audienceSmb) },
    nt_variants: { [EN]: [link(heroIds.smb)] },
    nt_experience_id: { [EN]: "tg-home-hero-smb" },
    nt_metadata: { [EN]: { type: "origin" } },
  });
  created.entries.push(expIds.heroSmb);

  expIds.heroEnterprise = await createEntry(env, "nt_experience", {
    nt_name: { [EN]: "TestGorilla – Home hero – Enterprise evaluator" },
    nt_description: {
      [EN]: "High-volume evaluators: scale & ROI hero. Demo: ?utm_campaign=enterprise",
    },
    nt_type: { [EN]: "nt_personalization" },
    nt_config: {
      [EN]: personalizationConfig(heroIds.control, heroIds.enterprise),
    },
    nt_audience: { [EN]: link(EXISTING.audienceEnterprise) },
    nt_variants: { [EN]: [link(heroIds.enterprise)] },
    nt_experience_id: { [EN]: "tg-home-hero-enterprise" },
    nt_metadata: { [EN]: { type: "origin" } },
  });
  created.entries.push(expIds.heroEnterprise);

  expIds.heroSmbAb = await createEntry(env, "nt_experience", {
    nt_name: { [EN]: "TestGorilla – SMB hero CTA – Start free vs Book demo" },
    nt_description: {
      [EN]: "A/B on SMB personalized hero: primary CTA Start free vs Book a demo.",
    },
    nt_type: { [EN]: "nt_experiment" },
    nt_config: {
      [EN]: experimentConfig(heroIds.smb, [heroIds.smbBookDemo], [0.5, 0.5]),
    },
    nt_audience: { [EN]: link(EXISTING.audienceSmb) },
    nt_variants: { [EN]: [link(heroIds.smb), link(heroIds.smbBookDemo)] },
    nt_experience_id: { [EN]: "tg-home-hero-smb-cta-ab" },
    nt_metadata: { [EN]: { type: "origin" } },
  });
  created.entries.push(expIds.heroSmbAb);

  await updateEntry(env, heroIds.smb, {
    nt_experiences: { [EN]: [link(expIds.heroSmbAb)] },
  });

  expIds.valueEnterprise = await createEntry(env, "nt_experience", {
    nt_name: { [EN]: "TestGorilla – Value prop – Enterprise ATS module" },
    nt_description: {
      [EN]: "Enterprise visitors see ATS + sourcing value prop block.",
    },
    nt_type: { [EN]: "nt_personalization" },
    nt_config: {
      [EN]: personalizationConfig(valuePropId, valuePropEnterpriseId),
    },
    nt_audience: { [EN]: link(EXISTING.audienceEnterprise) },
    nt_variants: { [EN]: [link(valuePropEnterpriseId)] },
    nt_experience_id: { [EN]: "tg-home-value-enterprise" },
    nt_metadata: { [EN]: { type: "origin" } },
  });
  created.entries.push(expIds.valueEnterprise);

  expIds.pricingRoiAb = await createEntry(env, "nt_experience", {
    nt_name: { [EN]: "TestGorilla – Pricing hero – ROI vs control" },
    nt_description: {
      [EN]: "Enterprise audience A/B on pricing page hero: ROI-led vs standard.",
    },
    nt_type: { [EN]: "nt_experiment" },
    nt_config: {
      [EN]: experimentConfig(pricingHeroControlId, [pricingHeroRoiId], [0.5, 0.5]),
    },
    nt_audience: { [EN]: link(EXISTING.audienceEnterprise) },
    nt_variants: { [EN]: [link(pricingHeroControlId), link(pricingHeroRoiId)] },
    nt_experience_id: { [EN]: "tg-pricing-hero-roi-ab" },
    nt_metadata: { [EN]: { type: "origin" } },
  });
  created.entries.push(expIds.pricingRoiAb);

  await updateEntry(env, heroIds.control, {
    nt_experiences: {
      [EN]: [link(expIds.heroEnterprise), link(expIds.heroSmb)],
    },
  });

  await updateEntry(env, valuePropId, {
    nt_experiences: { [EN]: [link(expIds.valueEnterprise)] },
  });

  await updateEntry(env, pricingHeroControlId, {
    nt_experiences: { [EN]: [link(expIds.pricingRoiAb)] },
  });

  console.log("Updating homepage + SEO...");
  await updateEntry(env, EXISTING.homeSeo, {
    internalTitle: { [EN]: "TestGorilla – SEO – Home" },
    title: { [EN]: "TestGorilla – AI-Powered Skills Assessments & Talent Sourcing" },
    description: {
      [EN]:
        "Hire on real skills with science-backed assessments, AI screening, and 2M+ sourced candidates. Start free or book a demo for enterprise hiring.",
    },
    noindex: { [EN]: false },
    nofollow: { [EN]: false },
  });

  await updateEntry(env, EXISTING.homePage, {
    internalTitle: { [EN]: "TestGorilla – Home" },
    title: { [EN]: "TestGorilla – Hire for real skills" },
    sections: {
      [EN]: [link(heroIds.control), link(valuePropId), link(finalCtaId)],
    },
  });

  console.log("Creating navigation...");
  const navIds = {};
  const navDefs = [
    { key: "assessments", label: "Assessments", page: "assessments" },
    { key: "sourcing", label: "Sourcing", page: "sourcing" },
    { key: "pricing", label: "Pricing", page: "pricing" },
    { key: "bookDemo", label: "Book a demo", page: "book-demo" },
  ];
  for (const n of navDefs) {
    navIds[n.key] = await createEntry(env, "navLink", {
      internalName: { [EN]: `TestGorilla – Nav – ${n.label}` },
      label: { [EN]: n.label },
      target: { [EN]: link(pageIds[n.page]) },
      openInNewTab: { [EN]: false },
    });
    created.entries.push(navIds[n.key]);
  }

  const headerNavId = await createEntry(env, "headerNavigation", {
    internalName: { [EN]: "TestGorilla – Main navigation" },
    menuIdentifier: { [EN]: "header-main" },
    menuItems: {
      [EN]: [
        link(navIds.assessments),
        link(navIds.sourcing),
        link(navIds.pricing),
        link(navIds.bookDemo),
      ],
    },
  });
  created.entries.push(headerNavId);

  const footerFeatures = [
    {
      title: "Science-backed tests",
      description: "350+ validated assessments",
      icon: "shield_check",
    },
    {
      title: "Hire faster",
      description: "Up to 80% lower time-to-hire",
      icon: "truck",
    },
    {
      title: "Expert support",
      description: "Onboarding for every plan",
      icon: "headphones",
    },
    {
      title: "Flexible billing",
      description: "Start free, scale when ready",
      icon: "credit_card",
    },
  ];
  const footerFeatureIds = [];
  for (const f of footerFeatures) {
    const id = await createEntry(env, "footerFeature", {
      internalName: { [EN]: `TestGorilla – Footer – ${f.title}` },
      title: { [EN]: f.title },
      description: { [EN]: f.description },
      icon: { [EN]: f.icon },
    });
    footerFeatureIds.push(id);
    created.entries.push(id);
  }

  const footerColId = await createEntry(env, "navLinkColumn", {
    internalName: { [EN]: "TestGorilla – Footer – Product" },
    title: { [EN]: "Product" },
    links: {
      [EN]: [
        link(navIds.assessments),
        link(navIds.sourcing),
        link(navIds.pricing),
        link(navIds.bookDemo),
      ],
    },
  });
  created.entries.push(footerColId);

  const topResourcesNav = await createEntry(env, "navLink", {
    internalName: { [EN]: "TestGorilla – Top – Resources" },
    label: { [EN]: "Resources" },
    target: { [EN]: link(pageIds.assessments) },
    openInNewTab: { [EN]: false },
  });
  const topPricingNav = await createEntry(env, "navLink", {
    internalName: { [EN]: "TestGorilla – Top – Pricing" },
    label: { [EN]: "Pricing" },
    target: { [EN]: link(pageIds.pricing) },
    openInNewTab: { [EN]: false },
  });
  const accountStartFree = await createEntry(env, "navLink", {
    internalName: { [EN]: "TestGorilla – Account – Start free" },
    label: { [EN]: "Start free" },
    target: { [EN]: link(pageIds.assessments) },
    openInNewTab: { [EN]: false },
  });
  const accountBookDemo = await createEntry(env, "navLink", {
    internalName: { [EN]: "TestGorilla – Account – Book a demo" },
    label: { [EN]: "Book a demo" },
    target: { [EN]: link(pageIds.bookDemo) },
    openInNewTab: { [EN]: false },
  });
  const promoBookDemo = await createEntry(env, "navLink", {
    internalName: { [EN]: "TestGorilla – Promo – Book a demo" },
    label: { [EN]: "Book a demo" },
    target: { [EN]: link(pageIds.bookDemo) },
    openInNewTab: { [EN]: false },
  });
  created.entries.push(
    topResourcesNav,
    topPricingNav,
    accountStartFree,
    accountBookDemo,
    promoBookDemo
  );

  console.log("Updating site settings (last)...");
  await updateEntry(env, EXISTING.siteSettings, {
    internalName: { [EN]: "TestGorilla – Site Settings" },
    logo: { [EN]: assetLink(logoAssetId) },
    logoAlt: { [EN]: "TestGorilla" },
    logoLink: { [EN]: "/" },
    headerTopLinks: { [EN]: [link(topResourcesNav), link(topPricingNav)] },
    headerAccountLinks: { [EN]: [link(accountStartFree), link(accountBookDemo)] },
    headerPromoLink: { [EN]: link(promoBookDemo) },
    headerMainNavigation: { [EN]: link(headerNavId) },
    footerLinkColumns: { [EN]: [link(footerColId)] },
    footerFeatures: { [EN]: footerFeatureIds.map((id) => link(id)) },
    footerLegalText: {
      [EN]: "© 2026 TestGorilla. Skills-based hiring for teams of every size.",
    },
    themePrimary: { [EN]: "#D64060" },
    themeBackground: { [EN]: "#FFFFFF" },
    themeForeground: { [EN]: "#1B1B2F" },
    themeSecondary: { [EN]: "#F4F0FA" },
    themeAccent: { [EN]: "#46B2A9" },
    nt_experiences: { [EN]: [] },
    theme: {
      [EN]: {
        fonts: { mono: "roboto-mono", sans: "inter", serif: "lora" },
        colors: {
          card: "#ffffff",
          ring: "#D64060",
          muted: "#F4F0FA",
          accent: "#46B2A9",
          border: "#E8E4F0",
          primary: "#D64060",
          secondary: "#F4F0FA",
          background: "#FFFFFF",
          foreground: "#1B1B2F",
          destructive: "#DC2626",
          cardForeground: "#1B1B2F",
          mutedForeground: "#5C5C7A",
          accentForeground: "#ffffff",
          primaryForeground: "#ffffff",
          secondaryForeground: "#1B1B2F",
        },
        radius: "0.5rem",
        typography: {
          bodySize: "1rem",
          lineHeight: "1.6",
          headingWeight: "700",
          letterSpacing: "0em",
          headingLetterSpacing: "-0.02em",
        },
      },
    },
  });

  console.log("\n✅ TestGorilla demo seeded.");
  console.log("Preview UTM params:");
  console.log("  SMB self-serve:     ?utm_campaign=smb");
  console.log("  Enterprise eval:    ?utm_campaign=enterprise");
  console.log("\nCounts:", {
    assets: created.assets.length,
    newEntries: created.entries.length,
  });
  console.log("Page IDs:", pageIds);
  console.log("Experience IDs:", expIds);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

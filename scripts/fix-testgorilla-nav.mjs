/**
 * Fix TestGorilla site chrome: nav targets → landing pages only, clear legacy
 * header links, add Customers + Resources pages (mirrors testgorilla.com IA).
 *
 * Run: node scripts/fix-testgorilla-nav.mjs
 */
import contentfulManagement from "contentful-management";

const SPACE_ID = "ace0ba6p9v98";
const ENV_ID = "testGorilla";
const EN = "en-US";

const EXISTING = {
  siteSettings: "4ztHcledfu8ov9Fn8vYWZU",
  headerNav: "2Y9UgkzQZcR0kplyshtxc8",
  pages: {
    assessments: "1rR4LWREVYy30EdY3Y8j5g",
    sourcing: "5nA6WwuR1iDhUzaH5POpyu",
    pricing: "1HQqW6eYTZDTIPnBEC53ft",
    bookDemo: "gjCl9VTREqeZvaEj5xvWu",
  },
  navLinks: {
    assessments: "7dPdI3nFghpbpQUwvk2xZr",
    sourcing: "6ViwFYUazNC85vLEGO1N7V",
    pricing: "3k1M7MAnBkAu7FxXNnD9vd",
    bookDemo: "3PCJ7octUXr4GmGlb0AHLI",
  },
  controlImage: "5I3bETdYqV0O6cx7suJJED",
  footerCol: "2rb4mb8A3MBxXf2JzthGmu",
};

function link(id) {
  return { sys: { type: "Link", linkType: "Entry", id } };
}

async function upsertEntry(env, entryId, fields) {
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

async function createEntry(env, contentTypeId, fields) {
  const entry = await env.createEntry(contentTypeId, { fields });
  return (await entry.publish()).sys.id;
}

async function main() {
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  if (!token) throw new Error("CONTENTFUL_MANAGEMENT_TOKEN is not set");

  const client = contentfulManagement.createClient({ accessToken: token });
  const space = await client.getSpace(SPACE_ID);
  const env = await space.getEnvironment(ENV_ID);

  console.log("Creating Customers + Resources pages...");
  const extraPages = [
    {
      key: "customers",
      slug: "customers",
      title: "Customers",
      seoTitle: "Customer stories – TestGorilla",
      seoDesc:
        "See how Revolut, Dyninno, MedX, and other teams cut time-to-hire with skills-based assessments.",
      headline: "Teams that hire for skills, not keywords",
      subCopy:
        "From high-growth startups to global enterprises—learn how skills data changed their hiring outcomes.",
    },
    {
      key: "resources",
      slug: "resources",
      title: "Resources",
      seoTitle: "Hiring resources – TestGorilla",
      seoDesc:
        "Guides on skills-based hiring, AI fluency, and building fairer shortlists at scale.",
      headline: "Insights for modern hiring teams",
      subCopy:
        "Playbooks, webinars, and research on assessments, sourcing, and AI—built for talent leaders.",
    },
  ];

  const pageIds = { ...EXISTING.pages };
  const navIds = { ...EXISTING.navLinks };

  for (const p of extraPages) {
    const seoId = await createEntry(env, "seo", {
      internalTitle: { [EN]: `TestGorilla – SEO – ${p.title}` },
      title: { [EN]: p.seoTitle },
      description: { [EN]: p.seoDesc },
      noindex: { [EN]: false },
      nofollow: { [EN]: false },
    });

    const heroId = await createEntry(env, "heroModule", {
      internalTitle: { [EN]: `TestGorilla – ${p.title} – Hero` },
      headline: { [EN]: p.headline },
      subCopy: { [EN]: p.subCopy },
      image: { [EN]: link(EXISTING.controlImage) },
      imagePlacement: { [EN]: "Right" },
      trackingName: { [EN]: "hero_banner" },
      metricEventName: { [EN]: "hero_cta_clicked" },
      size: { [EN]: "Small" },
      textContrast: { [EN]: "Dark on light" },
    });

    pageIds[p.key] = await createEntry(env, "landingPage", {
      internalTitle: { [EN]: `TestGorilla – ${p.title}` },
      title: { [EN]: p.title },
      slug: { [EN]: p.slug },
      sections: { [EN]: [link(heroId)] },
      seoMetadata: { [EN]: link(seoId) },
    });

    navIds[p.key] = await createEntry(env, "navLink", {
      internalName: { [EN]: `TestGorilla – Nav – ${p.title}` },
      label: { [EN]: p.title },
      target: { [EN]: link(pageIds[p.key]) },
      openInNewTab: { [EN]: false },
    });
    console.log(`  ${p.slug}: ${pageIds[p.key]}`);
  }

  console.log("Ensuring main nav links point at landing pages...");
  const mainNavOrder = [
    ["assessments", "Assessments"],
    ["sourcing", "Sourcing"],
    ["customers", "Customers"],
    ["pricing", "Pricing"],
    ["resources", "Resources"],
    ["bookDemo", "Book a demo"],
  ];

  for (const [key, label] of mainNavOrder) {
    if (!navIds[key]) continue;
    await upsertEntry(env, navIds[key], {
      internalName: { [EN]: `TestGorilla – Nav – ${label}` },
      label: { [EN]: label },
      target: { [EN]: link(pageIds[key]) },
      href: { [EN]: undefined },
      openInNewTab: { [EN]: false },
    });
  }

  const menuItemIds = mainNavOrder.map(([key]) => navIds[key]).filter(Boolean);

  await upsertEntry(env, EXISTING.headerNav, {
    internalName: { [EN]: "TestGorilla – Main navigation" },
    menuIdentifier: { [EN]: "header-main" },
    menuItems: { [EN]: menuItemIds.map((id) => link(id)) },
  });

  console.log("Top bar + account links (TestGorilla)...");
  const topResources = await createEntry(env, "navLink", {
    internalName: { [EN]: "TestGorilla – Top – Resources" },
    label: { [EN]: "Resources" },
    target: { [EN]: link(pageIds.resources) },
    openInNewTab: { [EN]: false },
  });
  const topCustomers = await createEntry(env, "navLink", {
    internalName: { [EN]: "TestGorilla – Top – Customers" },
    label: { [EN]: "Customer stories" },
    target: { [EN]: link(pageIds.customers) },
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

  const footerLinkIds = [
    navIds.assessments,
    navIds.sourcing,
    navIds.customers,
    navIds.pricing,
    navIds.resources,
    navIds.bookDemo,
  ].filter(Boolean);

  await upsertEntry(env, EXISTING.footerCol, {
    internalName: { [EN]: "TestGorilla – Footer – Product" },
    title: { [EN]: "Product" },
    links: { [EN]: footerLinkIds.map((id) => link(id)) },
  });

  console.log("Updating site settings...");
  await upsertEntry(env, EXISTING.siteSettings, {
    headerTopLinks: {
      [EN]: [link(topResources), link(topCustomers)],
    },
    headerAccountLinks: {
      [EN]: [link(accountStartFree), link(accountBookDemo)],
    },
    headerPromoLink: { [EN]: link(promoBookDemo) },
    headerMainNavigation: { [EN]: link(EXISTING.headerNav) },
    footerLinkColumns: { [EN]: [link(EXISTING.footerCol)] },
    nt_experiences: { [EN]: [] },
  });

  console.log("\n✅ Nav fix complete. Main nav:", mainNavOrder.map(([, l]) => l).join(" → "));
  console.log("New pages:", { customers: pageIds.customers, resources: pageIds.resources });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

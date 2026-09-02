/**
 * Rabobank Taxonomy — reference data + optional re-seed script.
 *
 * The live scheme `rabobank-taxonomy` (org 6WjTvhKeuC8SPD0S2FPZNZ) was created
 * via Contentful MCP. Taxonomy CMA requires an organization-scoped token;
 * the space CTF_MANAGEMENT_TOKEN is not sufficient for direct REST calls.
 *
 * To re-seed: use Contentful MCP create_concept / create_concept_scheme /
 * update_concept_scheme (addConcept for top facets only), or run from the
 * Taxonomy UI in Contentful web app.
 */
const ORG = "6WjTvhKeuC8SPD0S2FPZNZ";
const EN = "en-US";
const TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN || process.env.CTF_MANAGEMENT_TOKEN;
if (!TOKEN) {
  console.error("Set CTF_MANAGEMENT_TOKEN");
  process.exit(1);
}

const BASE = `https://api.contentful.com/organizations/${ORG}/taxonomy`;
const H = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/vnd.contentful.management.v1+json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, opts = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
    if (res.status === 429) {
      await sleep(1500 * (i + 1));
      continue;
    }
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
    return data;
  }
  throw new Error(`Retries exhausted for ${path}`);
}

/** Top-level facets + children. IDs are stable SKOS-style slugs. */
const TAXONOMY = {
  "rabobank-business-lines": {
    label: "Business Lines",
    definition: "Rabobank Group operating segments and franchise lines.",
    children: {
      "rabobank-retail-netherlands": {
        label: "Retail Netherlands",
        definition: "Domestic retail bank serving private and commercial customers in the Netherlands.",
      },
      "rabobank-wholesale-rural": {
        label: "Wholesale & Rural",
        definition: "Global Food & Agri bank and selective leader in energy transition finance.",
      },
      "rabobank-food-agri": {
        label: "Food & Agri Banking",
        definition: "Financing and advisory across the global food and agriculture value chain.",
      },
      "rabobank-energy-transition": {
        label: "Energy Transition Finance",
        definition: "Sustainable project finance for renewable energy, storage, and transition assets.",
      },
      "rabobank-leasing-dll": {
        label: "Leasing & Vendor Finance (DLL)",
        definition: "Global equipment, technology, and software leasing via DLL.",
      },
      "rabobank-private-banking": {
        label: "Private Banking",
        definition: "Wealth management and private banking for affluent clients.",
      },
      "rabobank-insurance-pensions": {
        label: "Insurance & Pensions",
        definition: "Insurance and pension products for retail and business customers.",
      },
    },
  },
  "rabobank-products-services": {
    label: "Products & Services",
    definition: "Financial products and service propositions offered to customers.",
    children: {
      "rabobank-accounts-payments": {
        label: "Accounts & Payments",
        definition: "Current accounts, debit cards, iDEAL, and everyday payment services.",
      },
      "rabobank-savings-deposits": {
        label: "Savings & Deposits",
        definition: "Savings accounts, term deposits, and goal-based saving (e.g. Spaarpotjes).",
      },
      "rabobank-mortgages-home": {
        label: "Mortgages & Home Finance",
        definition: "Residential mortgages, refinancing, and first-time buyer solutions.",
      },
      "rabobank-consumer-credit": {
        label: "Consumer Credit",
        definition: "Personal loans, overdrafts, and revolving credit for individuals.",
      },
      "rabobank-business-lending": {
        label: "Business & SME Lending",
        definition: "Working capital, investment loans, and credit facilities for businesses.",
      },
      "rabobank-trade-finance": {
        label: "Trade & Commodity Finance",
        definition: "Trade finance, commodity hedging, and international payment solutions.",
      },
      "rabobank-project-finance": {
        label: "Project & Sustainable Finance",
        definition: "Structured and project finance for infrastructure and sustainability.",
      },
      "rabobank-leasing-finance": {
        label: "Leasing & Asset Finance",
        definition: "Equipment, fleet, and technology leasing and vendor finance.",
      },
      "rabobank-investment-wealth": {
        label: "Investment & Wealth Management",
        definition: "Investments, portfolio management, and advisory services.",
      },
      "rabobank-insurance-products": {
        label: "Insurance Products",
        definition: "Non-life, life, and specialty insurance propositions.",
      },
      "rabobank-digital-banking": {
        label: "Digital & Mobile Banking",
        definition: "Rabobank app, online banking, and digital self-service.",
      },
    },
  },
  "rabobank-customer-segments": {
    label: "Customer Segments",
    definition: "Audience and client segments for personalization, content, and propositions.",
    children: {
      "rabobank-segment-private": {
        label: "Private Individuals",
        definition: "Retail banking customers and households.",
      },
      "rabobank-segment-young-starters": {
        label: "Young Starters & Students",
        definition: "First job, first account, and early financial independence.",
      },
      "rabobank-segment-life-stage": {
        label: "Life-stage Planners",
        definition: "Customers planning savings, home ownership, or major life milestones.",
      },
      "rabobank-segment-homeowners": {
        label: "Homeowners & First-time Buyers",
        definition: "Mortgage customers and aspiring homeowners.",
      },
      "rabobank-segment-sme": {
        label: "SMEs & Entrepreneurs",
        definition: "Small and medium enterprises and self-employed professionals.",
      },
      "rabobank-segment-farmers": {
        label: "Farmers & Growers",
        definition: "Agricultural producers and rural entrepreneurs.",
      },
      "rabobank-segment-food-agri-corp": {
        label: "Food & Agri Companies",
        definition: "Processors, traders, and companies in the food value chain.",
      },
      "rabobank-segment-corporate": {
        label: "Corporate & Institutional",
        definition: "Large corporates, financial institutions, and institutional clients.",
      },
      "rabobank-segment-members": {
        label: "Cooperative Members",
        definition: "Local Rabobank cooperative members and participation stakeholders.",
      },
    },
  },
  "rabobank-strategic-themes": {
    label: "Strategic Themes",
    definition: "Purpose-led themes aligned with Rabobank's cooperative mission and ESG agenda.",
    children: {
      "rabobank-theme-better-world": {
        label: "Growing a Better World Together",
        definition: "Rabobank's cooperative purpose and brand narrative.",
      },
      "rabobank-theme-sustainability": {
        label: "Sustainability & ESG",
        definition: "Environmental, social, and governance commitments and reporting.",
      },
      "rabobank-theme-food-transition": {
        label: "Food System Transition",
        definition: "Transition to a sustainable, resilient global food system.",
      },
      "rabobank-theme-climate-energy": {
        label: "Climate & Energy Transition",
        definition: "Climate action, renewable energy, and decarbonisation finance.",
      },
      "rabobank-theme-cooperative": {
        label: "Cooperative Banking Model",
        definition: "Member-owned cooperative structure, local roots, shared value.",
      },
      "rabobank-theme-innovation": {
        label: "Innovation & Digital Transformation",
        definition: "Fintech, data, AI, and digital customer experience.",
      },
      "rabobank-theme-community": {
        label: "Community & Local Impact",
        definition: "Local advisers, community investment, and regional development.",
      },
    },
  },
  "rabobank-content-topics": {
    label: "Content & Communication",
    definition: "CMS content types, editorial themes, and communication categories.",
    children: {
      "rabobank-content-news": {
        label: "News & Press",
        definition: "Press releases, media statements, and corporate news.",
      },
      "rabobank-content-insights": {
        label: "Insights & Research",
        definition: "Thought leadership, market outlooks, and sector research.",
      },
      "rabobank-content-knowledge": {
        label: "Knowledge & Support",
        definition: "Help articles, FAQs, and customer guidance.",
      },
      "rabobank-content-campaigns": {
        label: "Campaigns & Promotions",
        definition: "Marketing campaigns, acquisition, and promotional content.",
      },
      "rabobank-content-reports": {
        label: "Annual & Financial Reports",
        definition: "Annual reports, results, and investor disclosures.",
      },
      "rabobank-content-events": {
        label: "Events & Webinars",
        definition: "Conferences, webinars, and customer events.",
      },
      "rabobank-content-product-info": {
        label: "Product Information",
        definition: "Product pages, rate information, and proposition detail.",
      },
    },
  },
  "rabobank-markets-regions": {
    label: "Markets & Regions",
    definition: "Geographic markets where Rabobank operates or publishes content.",
    children: {
      "rabobank-region-netherlands": {
        label: "Netherlands",
        definition: "Domestic Dutch market — core retail and cooperative network.",
      },
      "rabobank-region-europe": {
        label: "Europe",
        definition: "European operations outside the Netherlands.",
      },
      "rabobank-region-north-america": {
        label: "North America",
        definition: "United States and North American wholesale and rural activities.",
      },
      "rabobank-region-asia-pacific": {
        label: "Asia-Pacific",
        definition: "APAC Food & Agri and trade finance footprint.",
      },
      "rabobank-region-latin-america": {
        label: "Latin America",
        definition: "Latin American agricultural and trade finance markets.",
      },
      "rabobank-region-africa": {
        label: "Africa",
        definition: "African Food & Agri and development finance activities.",
      },
    },
  },
  "rabobank-risk-security": {
    label: "Risk, Security & Compliance",
    definition: "Operational risk, customer protection, and regulatory topics.",
    children: {
      "rabobank-risk-fraud": {
        label: "Fraud Prevention & Scams",
        definition: "Scam awareness, phishing, and payment fraud protection.",
      },
      "rabobank-risk-cyber": {
        label: "Cybersecurity",
        definition: "Digital security, secure login, and threat protection.",
      },
      "rabobank-risk-payment-security": {
        label: "Payment Security",
        definition: "Secure payments, verification, and transaction monitoring.",
      },
      "rabobank-risk-regulatory": {
        label: "Regulatory & Compliance",
        definition: "Banking regulation, conduct, and compliance obligations.",
      },
      "rabobank-risk-kyc": {
        label: "KYC & Customer Verification",
        definition: "Identity verification, onboarding, and due diligence.",
      },
      "rabobank-risk-privacy": {
        label: "Data Privacy & GDPR",
        definition: "Personal data protection and privacy rights.",
      },
      "rabobank-risk-aml": {
        label: "Financial Crime & AML",
        definition: "Anti-money laundering and financial crime prevention.",
      },
    },
  },
  "rabobank-channels": {
    label: "Channels & Experiences",
    definition: "Customer touchpoints and delivery channels.",
    children: {
      "rabobank-channel-app": {
        label: "Rabobank Mobile App",
        definition: "Native mobile banking application experience.",
      },
      "rabobank-channel-online": {
        label: "Online Banking",
        definition: "Web-based banking and self-service portal.",
      },
      "rabobank-channel-branch": {
        label: "Branch & Local Advisers",
        definition: "Physical branches and local relationship managers.",
      },
      "rabobank-channel-service": {
        label: "Customer Service & Help",
        definition: "Contact centre, chat, and support channels.",
      },
      "rabobank-channel-website": {
        label: "Corporate Website",
        definition: "Rabobank.com and public-facing digital properties.",
      },
      "rabobank-channel-partners": {
        label: "Partner & Ecosystem Channels",
        definition: "Third-party integrations, APIs, and partner distribution.",
      },
    },
  },
};

async function createConcept(id, label, definition, broaderId) {
  const body = {
    prefLabel: { [EN]: label },
    definition: { [EN]: definition },
  };
  if (broaderId) {
    body.broader = [{ sys: { type: "Link", linkType: "TaxonomyConcept", id: broaderId } }];
  }
  return api(`/concepts/${id}`, {
    method: "PUT",
    headers: { "X-Contentful-Version": "1" },
    body: JSON.stringify(body),
  }).catch(async () => {
    // Create if not exists — try POST with concept in body
    return api("/concepts", {
      method: "POST",
      body: JSON.stringify({ ...body, sys: { id } }),
    });
  });
}

async function main() {
  // Check if scheme already exists
  try {
    const existing = await api("/concept-schemes/rabobank-taxonomy");
    console.log("Scheme already exists:", existing.prefLabel?.[EN], `(v${existing.sys?.version ?? existing.version})`);
    console.log("Delete manually in Contentful if you want a fresh import.");
    return;
  } catch {
    /* create fresh */
  }

  console.log("Creating top-level concepts…");
  const topIds = [];
  for (const [id, node] of Object.entries(TAXONOMY)) {
    await api("/concepts", {
      method: "POST",
      body: JSON.stringify({
        sys: { id },
        prefLabel: { [EN]: node.label },
        definition: { [EN]: node.definition },
      }),
    });
    topIds.push(id);
    console.log(`  + ${node.label}`);
    await sleep(200);
  }

  console.log("\nCreating sub-concepts…");
  let subCount = 0;
  for (const [parentId, node] of Object.entries(TAXONOMY)) {
    for (const [childId, child] of Object.entries(node.children)) {
      await api("/concepts", {
        method: "POST",
        body: JSON.stringify({
          sys: { id: childId },
          prefLabel: { [EN]: child.label },
          definition: { [EN]: child.definition },
          broader: [{ sys: { type: "Link", linkType: "TaxonomyConcept", id: parentId } }],
        }),
      });
      subCount++;
      if (subCount % 10 === 0) console.log(`  …${subCount} sub-concepts`);
      await sleep(150);
    }
  }
  console.log(`  + ${subCount} sub-concepts total`);

  console.log("\nCreating concept scheme…");
  const scheme = await api("/concept-schemes", {
    method: "POST",
    body: JSON.stringify({
      sys: { id: "rabobank-taxonomy" },
      prefLabel: { [EN]: "Rabobank Taxonomy" },
      definition: {
        [EN]:
          "Master taxonomy for Rabobank digital content — business lines, products, segments, themes, regions, risk, and channels. Aligned with Rabobank Group reporting segments and universal banking classification.",
      },
      scopeNote: {
        [EN]:
          "Use top concepts for primary tagging; apply sub-concepts for precise filtering. Cross-facet tagging is encouraged (e.g. Food & Agri + Asia-Pacific + Insights).",
      },
      topConcepts: topIds.map((id) => ({
        sys: { type: "Link", linkType: "TaxonomyConcept", id },
      })),
    }),
  });

  console.log("\n✓ Rabobank Taxonomy created");
  console.log(`  Scheme ID: rabobank-taxonomy`);
  console.log(`  Top concepts: ${topIds.length}`);
  console.log(`  Sub-concepts: ${subCount}`);
  console.log(`  Total concepts: ${topIds.length + subCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

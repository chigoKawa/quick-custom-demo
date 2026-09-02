/**
 * Seed Metro Bank mobile app demo content into Contentful master.
 *
 * Creates: microcopy, generalTopic, appWidget, appNavItem, appNavigation,
 *          appModule, appScreen entries — then publishes everything.
 *
 * Run: CONTENTFUL_MANAGEMENT_TOKEN=... node scripts/seed-metrobank-app.mjs
 * Or:  node -r dotenv/config scripts/seed-metrobank-app.mjs
 *
 * Idempotent: re-runs upsert by `slug`-style key (microcopy.key, internalName).
 */
import "dotenv/config";
import contentfulManagement from "contentful-management";

const SPACE_ID = "ace0ba6p9v98";
const ENV_ID = "master";
const EN = "en-US";

const TOKEN =
  process.env.CTF_MANAGEMENT_TOKEN ||
  process.env.CONTENTFUL_MANAGEMENT_TOKEN;

if (!TOKEN) {
  console.error(
    "Missing CONTENTFUL_MANAGEMENT_TOKEN. Add it to .env or pass it inline."
  );
  process.exit(1);
}

const client = contentfulManagement.createClient({ accessToken: TOKEN });

// ---------- helpers ----------

function entryLink(id) {
  return { sys: { type: "Link", linkType: "Entry", id } };
}

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

async function findEntryBy(env, contentType, query) {
  const res = await env.getEntries({
    content_type: contentType,
    limit: 1,
    ...query,
  });
  return res.items[0];
}

async function upsertEntry(env, contentType, identityField, identityValue, fields) {
  const existing = await findEntryBy(env, contentType, {
    [`fields.${identityField}`]: identityValue,
  });

  if (existing) {
    // Merge fields and update
    for (const [k, v] of Object.entries(fields)) {
      existing.fields[k] = v;
    }
    const updated = await existing.update();
    if (!updated.isPublished()) await updated.publish();
    else {
      const fresh = await env.getEntry(updated.sys.id);
      await fresh.publish();
    }
    console.log(`✓ updated ${contentType} ${identityValue} → ${updated.sys.id}`);
    return updated.sys.id;
  }

  const created = await env.createEntry(contentType, { fields });
  const published = await created.publish();
  console.log(`+ created ${contentType} ${identityValue} → ${published.sys.id}`);
  return published.sys.id;
}

// ---------- data ----------

// Microcopy keyed by `app.*`. Identity = field `key`.
const MICROCOPY = [
  // Tab bar
  ["app.tab.home", "Home"],
  ["app.tab.help", "Help"],
  ["app.tab.chats", "Chats"],
  ["app.tab.cards", "Cards"],
  ["app.tab.insights", "Insights"],

  // Greeting / home shell
  ["app.greeting.label", "Good morning"],
  ["app.greeting.name", "Hi, Alex"],
  ["app.balance.label", "Available balance"],
  ["app.balance.account", "Current account · 12-34-56"],
  ["app.action.send", "Pay"],
  ["app.action.topup", "Move money"],
  ["app.action.deposit", "Pay in"],

  // Quick actions (Metro Bank style)
  ["app.shortcut.pay", "Pay"],
  ["app.shortcut.cards", "Cards"],
  ["app.shortcut.savings", "Savings"],
  ["app.shortcut.cashback", "Cashback"],
  ["app.shortcut.statements", "Statements"],
  ["app.shortcut.security", "Security"],

  // Section labels
  ["app.shortcuts.label", "Quick actions"],
  ["app.transactions.label", "Recent transactions"],
  ["app.transactions.cta", "See all"],
  ["app.offers.label", "Offers for you"],
  ["app.articles.label", "From Metro Bank"],
  ["app.widgets.label", "Your money"],

  // Widget labels — latestTransactions
  ["app.widget.transactions.title", "Latest transactions"],
  ["app.widget.transactions.empty", "No transactions yet"],
  ["app.widget.transactions.viewAll", "View all"],

  // Widget labels — accountSummary
  ["app.widget.account.title", "Account overview"],
  ["app.widget.account.available", "Available"],
  ["app.widget.account.pending", "Pending"],
  ["app.widget.account.overdraft", "Arranged overdraft"],

  // Widget labels — spendingByCategory
  ["app.widget.spending.title", "Where your money goes"],
  ["app.widget.spending.subtitle", "This month so far"],
  ["app.widget.spending.empty", "Spend a little to see insights here."],

  // Widget labels — savingsGoal
  ["app.widget.savings.title", "Holiday fund"],
  ["app.widget.savings.subtitle", "On track for August"],
  ["app.widget.savings.cta", "Add money"],

  // Help screen
  ["app.help.title", "How can we help?"],
  ["app.help.subtitle", "Find answers in seconds"],
  ["app.search.placeholder", "Search help"],
  ["app.ai.label", "Metro Assist"],
  ["app.ai.placeholder", "Ask about your account, cards, or payments..."],
  ["app.help.categories.label", "Browse topics"],
  ["app.contact.label", "Talk to us"],
  ["app.contact.chat", "Live chat"],
  ["app.contact.chat.sub", "Avg. 2 min response"],
  ["app.contact.email", "Send a message"],
  ["app.contact.email.sub", "Reply within 24h"],
  ["app.contact.call", "Call us"],
  ["app.contact.call.sub", "0345 08 08 500 · 24/7"],

  // Chats / Cases
  ["app.chats.title", "Messages"],
  ["app.chats.tab", "Chats"],
  ["app.cases.tab", "Cases"],
];

// Topics (channel-agnostic): identity = internalName
const TOPICS = {
  heroWelcome: {
    internalName: "metroapp.hero.welcome",
    title: "Banking that doesn't say no",
    tagline: "Open. Fair. Always on.",
    body: richDoc([
      "Tap a card to freeze it, set spending limits, or report it lost — all without leaving the app.",
    ]),
  },
  promoMortgage: {
    internalName: "metroapp.promo.mortgage",
    title: "Mortgages with a human at the end",
    tagline: "Book a Saturday appointment",
    body: richDoc([
      "Our local stores are open 7 days a week. Walk in, sit down, and talk to a real mortgage expert.",
    ]),
  },
  promoCashback: {
    internalName: "metroapp.promo.cashback",
    title: "Earn cashback at your favourite shops",
    tagline: "Up to 15%",
    body: richDoc([
      "Activate offers in the app and earn real cash back into your current account.",
    ]),
  },
  bannerMaintenance: {
    internalName: "metroapp.banner.maintenance",
    title: "Scheduled maintenance Sunday 02:00–04:00",
    tagline: "You may briefly be unable to log in.",
    body: richDoc([
      "We're upgrading our systems. The app and online banking will be unavailable for a short window.",
    ]),
  },
  // Quick-action items (used as topics list)
  qaPay: {
    internalName: "metroapp.qa.pay",
    title: "Pay & transfer",
    tagline: "send",
  },
  qaCards: {
    internalName: "metroapp.qa.cards",
    title: "Cards",
    tagline: "credit-card",
  },
  qaSavings: {
    internalName: "metroapp.qa.savings",
    title: "Savings",
    tagline: "piggy-bank",
  },
  qaCashback: {
    internalName: "metroapp.qa.cashback",
    title: "Cashback",
    tagline: "percent",
  },
  qaStatements: {
    internalName: "metroapp.qa.statements",
    title: "Statements",
    tagline: "file-text",
  },
  qaSecurity: {
    internalName: "metroapp.qa.security",
    title: "Security",
    tagline: "shield-check",
  },
  // Articles (light)
  articleFraud: {
    internalName: "metroapp.article.fraud",
    title: "Spot a scam in 60 seconds",
    tagline: "3 min read",
    body: richDoc([
      "If a message asks for your PIN, OTP, or full password — it's not us. Hang up and call 159.",
    ]),
  },
  articleSwitching: {
    internalName: "metroapp.article.switching",
    title: "Moving to Metro? We'll do the heavy lifting",
    tagline: "Current Account Switch",
    body: richDoc([
      "The Current Account Switch Service moves your direct debits, standing orders, and balance in 7 working days.",
    ]),
  },
  articleStores: {
    internalName: "metroapp.article.stores",
    title: "Find a store near you",
    tagline: "Open 7 days a week",
    body: richDoc([
      "From High Holborn to Manchester Piccadilly, all Metro Bank stores are open 7 days, 362 days a year.",
    ]),
  },
  // FAQ items
  faqLostCard: {
    internalName: "metroapp.faq.lostCard",
    title: "I've lost my card — what do I do?",
    body: richDoc([
      "Tap Cards → Freeze. If you're sure it's lost, choose Report lost. We'll send a new card to your address.",
    ]),
  },
  faqLimits: {
    internalName: "metroapp.faq.limits",
    title: "Can I change my daily limits?",
    body: richDoc([
      "Yes — go to Cards → Limits. You can change ATM and contactless limits temporarily or permanently.",
    ]),
  },
  faqTravel: {
    internalName: "metroapp.faq.travel",
    title: "Will my card work abroad?",
    body: richDoc([
      "Metro Bank debit cards work fee-free across Europe. Outside Europe a 2.99% non-Sterling fee applies.",
    ]),
  },
};

// Widgets: identity = internalName
const WIDGETS = {
  latestTransactions: {
    internalName: "metroapp.widget.latestTransactions",
    widgetType: "latestTransactions",
    title: "Latest transactions",
    emptyStateCopy: "Nothing here yet. Your transactions will show as soon as they happen.",
    config: { limit: 5, currency: "GBP" },
    dataSource: "mock",
  },
  accountSummary: {
    internalName: "metroapp.widget.accountSummary",
    widgetType: "accountSummary",
    title: "Account overview",
    config: { currency: "GBP" },
    dataSource: "mock",
  },
  spending: {
    internalName: "metroapp.widget.spendingByCategory",
    widgetType: "spendingByCategory",
    title: "Where your money goes",
    config: { period: "month" },
    dataSource: "mock",
  },
  savingsGoal: {
    internalName: "metroapp.widget.savingsGoal",
    widgetType: "savingsGoal",
    title: "Holiday fund",
    config: { current: 740, target: 1200, currency: "GBP", deadline: "2026-08-15" },
    dataSource: "mock",
  },
};

// ---------- run ----------

async function main() {
  console.log(`→ Connecting to space ${SPACE_ID} / env ${ENV_ID}`);
  const space = await client.getSpace(SPACE_ID);
  const env = await space.getEnvironment(ENV_ID);

  // 1. Microcopy
  console.log("\n=== Microcopy ===");
  const microcopyIds = {};
  for (const [key, value] of MICROCOPY) {
    const id = await upsertEntry(env, "microcopy", "key", key, {
      key: { [EN]: key },
      value: { [EN]: value },
    });
    microcopyIds[key] = id;
  }

  // Helper: build microcopy link array from a list of keys
  const mcLinks = (keys) => keys.map((k) => entryLink(microcopyIds[k]));

  // 2. Topics
  console.log("\n=== General Topics ===");
  const topicIds = {};
  for (const [k, t] of Object.entries(TOPICS)) {
    const fields = {
      internalName: { [EN]: t.internalName },
      title: { [EN]: t.title },
    };
    if (t.tagline) fields.tagline = { [EN]: t.tagline };
    if (t.body) fields.body = { [EN]: t.body };
    topicIds[k] = await upsertEntry(
      env,
      "generalTopic",
      "internalName",
      t.internalName,
      fields
    );
  }

  // 3. Widgets
  console.log("\n=== App Widgets ===");
  const widgetIds = {};
  for (const [k, w] of Object.entries(WIDGETS)) {
    const fields = {
      internalName: { [EN]: w.internalName },
      widgetType: { [EN]: w.widgetType },
      title: { [EN]: w.title },
      dataSource: { [EN]: w.dataSource },
    };
    if (w.emptyStateCopy) fields.emptyStateCopy = { [EN]: w.emptyStateCopy };
    if (w.config) fields.config = { [EN]: w.config };
    // Attach matching microcopy
    const mcKeys = Object.keys(microcopyIds).filter((key) => {
      if (w.widgetType === "latestTransactions") return key.startsWith("app.widget.transactions.");
      if (w.widgetType === "accountSummary") return key.startsWith("app.widget.account.");
      if (w.widgetType === "spendingByCategory") return key.startsWith("app.widget.spending.");
      if (w.widgetType === "savingsGoal") return key.startsWith("app.widget.savings.");
      return false;
    });
    if (mcKeys.length) fields.microcopySet = { [EN]: mcLinks(mcKeys) };

    widgetIds[k] = await upsertEntry(
      env,
      "appWidget",
      "internalName",
      w.internalName,
      fields
    );
  }

  // 4. Modules
  console.log("\n=== App Modules ===");
  const moduleIds = {};

  // Helper to create/upsert a module
  async function module(internalName, moduleType, extra) {
    const fields = {
      internalName: { [EN]: internalName },
      moduleType: { [EN]: moduleType },
    };
    for (const [k, v] of Object.entries(extra ?? {})) {
      fields[k] = { [EN]: v };
    }
    const id = await upsertEntry(
      env,
      "appModule",
      "internalName",
      internalName,
      fields
    );
    moduleIds[internalName] = id;
    return id;
  }

  // Home screen modules
  await module("metroapp.module.home.hero", "heroCard", {
    topic: entryLink(topicIds.heroWelcome),
    emphasis: "brand",
    variant: "emphasized",
    imageStyle: "wide",
  });

  await module("metroapp.module.home.quickActions", "quickActions", {
    topics: [
      entryLink(topicIds.qaPay),
      entryLink(topicIds.qaCards),
      entryLink(topicIds.qaSavings),
      entryLink(topicIds.qaCashback),
    ],
    microcopySet: mcLinks(["app.shortcuts.label"]),
  });

  await module("metroapp.module.home.accountSummary", "widget", {
    widget: entryLink(widgetIds.accountSummary),
  });

  await module("metroapp.module.home.latestTransactions", "widget", {
    widget: entryLink(widgetIds.latestTransactions),
    microcopySet: mcLinks(["app.transactions.label", "app.transactions.cta"]),
  });

  await module("metroapp.module.home.savingsGoal", "widget", {
    widget: entryLink(widgetIds.savingsGoal),
  });

  await module("metroapp.module.home.spending", "widget", {
    widget: entryLink(widgetIds.spending),
  });

  await module("metroapp.module.home.promoCashback", "promoBanner", {
    topic: entryLink(topicIds.promoCashback),
    emphasis: "accent",
    imageStyle: "wide",
    ctaStyle: "primary",
  });

  // Help screen modules
  await module("metroapp.module.help.hero", "heroCard", {
    topic: entryLink(topicIds.bannerMaintenance),
    emphasis: "warning",
    variant: "compact",
    microcopySet: mcLinks([
      "app.help.title",
      "app.help.subtitle",
      "app.search.placeholder",
      "app.ai.label",
      "app.ai.placeholder",
    ]),
  });

  await module("metroapp.module.help.faq", "faq", {
    topics: [
      entryLink(topicIds.faqLostCard),
      entryLink(topicIds.faqLimits),
      entryLink(topicIds.faqTravel),
    ],
    microcopySet: mcLinks(["app.help.categories.label"]),
  });

  await module("metroapp.module.help.articles", "articleList", {
    topics: [
      entryLink(topicIds.articleFraud),
      entryLink(topicIds.articleSwitching),
      entryLink(topicIds.articleStores),
    ],
    microcopySet: mcLinks(["app.articles.label"]),
  });

  await module("metroapp.module.help.contact", "supportCTA", {
    topic: entryLink(topicIds.heroWelcome),
    microcopySet: mcLinks([
      "app.contact.label",
      "app.contact.chat",
      "app.contact.chat.sub",
      "app.contact.email",
      "app.contact.email.sub",
      "app.contact.call",
      "app.contact.call.sub",
    ]),
  });

  // Chats screen modules
  await module("metroapp.module.chats.notificationList", "notificationList", {
    microcopySet: mcLinks(["app.chats.title", "app.chats.tab", "app.cases.tab"]),
  });

  // 5. Nav items
  console.log("\n=== App Nav Items ===");
  const navItemIds = {};
  async function navItem(name, fallbackLabel, microcopyKey, icon, screenId, order) {
    const fields = {
      internalName: { [EN]: name },
      fallbackLabel: { [EN]: fallbackLabel },
      icon: { [EN]: icon },
      order: { [EN]: order },
    };
    if (microcopyKey && microcopyIds[microcopyKey]) {
      fields.labelMicrocopy = { [EN]: entryLink(microcopyIds[microcopyKey]) };
    }
    if (screenId) {
      fields.screen = { [EN]: entryLink(screenId) };
    }
    const id = await upsertEntry(env, "appNavItem", "internalName", name, fields);
    navItemIds[name] = id;
    return id;
  }

  // Nav items reference appScreen which doesn't exist yet — create without screen refs first.
  await navItem("metroapp.nav.home", "Home", "app.tab.home", "home", null, 0);
  await navItem("metroapp.nav.help", "Help", "app.tab.help", "help", null, 1);
  await navItem("metroapp.nav.chats", "Chats", "app.tab.chats", "chat", null, 2);

  // 6. Navigation
  console.log("\n=== App Navigation ===");
  const navId = await upsertEntry(
    env,
    "appNavigation",
    "internalName",
    "metroapp.nav.main",
    {
      internalName: { [EN]: "metroapp.nav.main" },
      items: {
        [EN]: [
          entryLink(navItemIds["metroapp.nav.home"]),
          entryLink(navItemIds["metroapp.nav.help"]),
          entryLink(navItemIds["metroapp.nav.chats"]),
        ],
      },
    }
  );

  // 7. Screens
  console.log("\n=== App Screens ===");
  const homeScreenId = await upsertEntry(env, "appScreen", "screenKey", "home", {
    internalName: { [EN]: "metroapp.screen.home" },
    screenKey: { [EN]: "home" },
    title: { [EN]: "Home" },
    platform: { [EN]: "both" },
    modules: {
      [EN]: [
        entryLink(moduleIds["metroapp.module.home.hero"]),
        entryLink(moduleIds["metroapp.module.home.quickActions"]),
        entryLink(moduleIds["metroapp.module.home.accountSummary"]),
        entryLink(moduleIds["metroapp.module.home.latestTransactions"]),
        entryLink(moduleIds["metroapp.module.home.savingsGoal"]),
        entryLink(moduleIds["metroapp.module.home.spending"]),
        entryLink(moduleIds["metroapp.module.home.promoCashback"]),
      ],
    },
    navigation: { [EN]: entryLink(navId) },
  });

  const helpScreenId = await upsertEntry(env, "appScreen", "screenKey", "help", {
    internalName: { [EN]: "metroapp.screen.help" },
    screenKey: { [EN]: "help" },
    title: { [EN]: "Help" },
    platform: { [EN]: "both" },
    modules: {
      [EN]: [
        entryLink(moduleIds["metroapp.module.help.hero"]),
        entryLink(moduleIds["metroapp.module.help.faq"]),
        entryLink(moduleIds["metroapp.module.help.articles"]),
        entryLink(moduleIds["metroapp.module.help.contact"]),
      ],
    },
    navigation: { [EN]: entryLink(navId) },
  });

  const chatsScreenId = await upsertEntry(env, "appScreen", "screenKey", "chats", {
    internalName: { [EN]: "metroapp.screen.chats" },
    screenKey: { [EN]: "chats" },
    title: { [EN]: "Messages" },
    platform: { [EN]: "both" },
    modules: {
      [EN]: [entryLink(moduleIds["metroapp.module.chats.notificationList"])],
    },
    navigation: { [EN]: entryLink(navId) },
  });

  // 8. Patch nav items with screen refs now that screens exist
  console.log("\n=== Patching nav items with screen refs ===");
  for (const [name, screenId] of [
    ["metroapp.nav.home", homeScreenId],
    ["metroapp.nav.help", helpScreenId],
    ["metroapp.nav.chats", chatsScreenId],
  ]) {
    const item = await env.getEntry(navItemIds[name]);
    item.fields.screen = { [EN]: entryLink(screenId) };
    const updated = await item.update();
    await env.getEntry(updated.sys.id).then((e) => e.publish());
    console.log(`  ${name} → screen ${screenId}`);
  }

  console.log("\nDone.");
  console.log("Home screen entry id:", homeScreenId);
  console.log("Help screen entry id:", helpScreenId);
  console.log("Chats screen entry id:", chatsScreenId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
